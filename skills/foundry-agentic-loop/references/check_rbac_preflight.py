"""Check the caller's RBAC before provisioning in a foundry-agentic-loop run.

Reference implementation for the `foundry-agentic-loop` skill's RBAC pre-flight
(see references/rbac-preflight.md). Copy into ./scripts/ of the generated repo
and run it *before* any provisioning, optionally as an `azd` preprovision hook.

The failure this guards against is an RBAC gap that surfaces mid-provisioning,
after partial resources exist, one scope at a time. So this check reports
*every* missing assignment at once, as principal -> scope -> role, with a
ready-to-run remediation block to hand to a subscription owner.

Required assignments come from the deployer-prerequisites table in
references/rbac-contract.md. Effective assignments are read with the Azure CLI
(`az role assignment list --include-inherited --include-groups`), so inherited
and group-derived grants count. Roles are matched by their built-in role
definition ID, so renames (Azure AI * -> Foundry *) do not break the check, and
a requirement is satisfied by an equivalent-or-broader role (Owner satisfies
Contributor), which is why a fully-permissioned run reports nothing. Custom
roles are not evaluated.

Verdicts:
    PASS     every required assignment is satisfied. Prints one summary line
             (nothing at all with --quiet).
    BLOCKED  at least one is missing. Prints the full list. Do not start provisioning.
    ERROR    the check could not be evaluated -- resolve it, don't skip it.

Usage:
    python check_rbac_preflight.py --subscription <sub-id>
    python check_rbac_preflight.py --subscription <sub-id> --resource-group rg-app
    python check_rbac_preflight.py --from-file observed.json --subscription <sub-id>

Environment (each has a matching flag):
    AZURE_SUBSCRIPTION_ID  target subscription (required)
    AZURE_RESOURCE_GROUP   pre-existing resource group, if the run targets one
    AZURE_AI_ACCOUNT_ID    existing Foundry AI account resource id, if brownfield
    AZURE_AI_PROJECT_ID    existing Foundry project resource id, if brownfield

Exit codes: 0 on PASS, 2 on BLOCKED, 1 on ERROR.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys

REFERENCE = (
    "skills/foundry-agentic-loop/references/rbac-contract.md#deployer-prerequisites-pre-flight"
)

# Scope kinds, in the order they are reported.
SUBSCRIPTION = "subscription"
RESOURCE_GROUP = "resource_group"
AI_ACCOUNT = "ai_account"
AI_PROJECT = "ai_project"

# Built-in role definition IDs are stable; display names are not. Microsoft
# renamed the Azure AI roles to Foundry roles, so match on the ID and keep the
# current name for the report. Legacy names still resolve for --from-file input.
ROLES: dict[str, tuple[str, str]] = {
    "owner": ("8e3af657-a8ff-443c-a75c-2fe8c4bcb635", "Owner"),
    "contributor": ("b24988ac-6180-42a0-ab88-20f7382dd24c", "Contributor"),
    "user_access_admin": ("18d7d88d-d35e-4fb5-a5c3-7773c20a72d9", "User Access Administrator"),
    "rbac_admin": ("f58310d9-a9f6-439a-9e8d-f62e7b41a168", "Role Based Access Control Administrator"),
    "cs_contributor": ("25fbc0a9-bd7c-42a3-aa1a-3b75d497ee68", "Cognitive Services Contributor"),
    "foundry_owner": ("c883944f-8b7b-4483-af10-35834be79c4a", "Foundry Owner"),
    "foundry_account_owner": ("e47c6f54-e4a2-4754-9501-8e0985b135e1", "Foundry Account Owner"),
    "foundry_project_manager": ("eadc314b-1a2d-4efa-be10-5d325db5065e", "Foundry Project Manager"),
    "foundry_user": ("53ca6127-db72-4b80-b1b0-d745d6d5456d", "Foundry User"),
    "cs_user": ("a97b65f3-24c7-4388-baec-2e87135dc908", "Cognitive Services User"),
}
LEGACY_NAMES = {
    "Azure AI Owner": "foundry_owner",
    "Azure AI Account Owner": "foundry_account_owner",
    "Azure AI Project Manager": "foundry_project_manager",
    "Azure AI User": "foundry_user",
}
_BY_ID = {guid: key for key, (guid, _) in ROLES.items()}
_BY_NAME = {name.lower(): key for key, (_, name) in ROLES.items()} | {
    name.lower(): key for name, key in LEGACY_NAMES.items()
}

# Foundry control plane (Microsoft.CognitiveServices/* actions) versus data plane
# (Microsoft.CognitiveServices/* dataActions). Owner, Contributor, Foundry Account
# Owner and Cognitive Services Contributor carry no dataActions, so none of them
# can create agents alone; Foundry User and Cognitive Services User carry only
# dataActions, so neither can create project connections alone.
ACCOUNT_CONTROL = ["foundry_account_owner", "foundry_owner", "owner", "contributor", "cs_contributor"]
DATA_PLANE = ["foundry_user", "cs_user"]
DEPLOY = [{"contributor"}, {"owner"}]
ASSIGN = [{"rbac_admin"}, {"owner"}, {"user_access_admin"}]

# Required assignments per scope kind -- the deployer prerequisites table.
# A requirement is met when every role of any one alternative is effective at the
# scope. Remedies are tried in order and the first that completes an alternative
# is reported, so the remediation is the smallest grant that works.
REQUIREMENTS: list[dict] = [
    {
        "kind": SUBSCRIPTION,
        "why": "Create the resource group and every resource in the reference architecture",
        "alternatives": DEPLOY,
        "accepts": "Contributor | Owner",
        "remedies": [{"contributor"}],
    },
    {
        "kind": SUBSCRIPTION,
        "why": "Microsoft.Authorization/roleAssignments/write - the Bicep creates every row "
        "of the runtime matrix",
        "alternatives": ASSIGN,
        "accepts": "Role Based Access Control Administrator | Owner | User Access Administrator",
        "remedies": [{"rbac_admin"}],
    },
    {
        "kind": RESOURCE_GROUP,
        "why": "Create every resource of the solution in the existing resource group",
        "alternatives": DEPLOY,
        "accepts": "Contributor | Owner",
        "remedies": [{"contributor"}],
    },
    {
        "kind": RESOURCE_GROUP,
        "why": "Microsoft.Authorization/roleAssignments/write - create the runtime matrix rows "
        "in the resource group",
        "alternatives": ASSIGN,
        "accepts": "Role Based Access Control Administrator | Owner | User Access Administrator",
        "remedies": [{"rbac_admin"}],
    },
    {
        "kind": AI_ACCOUNT,
        "why": "Create projects, model deployments and account resources (control plane)",
        "alternatives": [{role} for role in ACCOUNT_CONTROL],
        "accepts": "Foundry Account Owner | Foundry Owner | Owner | Contributor | "
        "Cognitive Services Contributor",
        "remedies": [{"foundry_account_owner"}],
    },
    {
        "kind": AI_PROJECT,
        "why": "Create and publish hosted agents, skills, toolboxes (data plane) and project "
        "connections (control plane)",
        "alternatives": [{"foundry_project_manager"}, {"foundry_owner"}]
        + [{data, control} for data in DATA_PLANE for control in ACCOUNT_CONTROL],
        "accepts": "Foundry Project Manager | Foundry Owner | Foundry User (or Cognitive "
        "Services User) plus Foundry Account Owner, Owner, Contributor or Cognitive "
        "Services Contributor",
        "remedies": [{"foundry_user"}, {"foundry_project_manager"}],
    },
]


class PreflightError(Exception):
    """The check could not be evaluated (verdict ERROR)."""


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--subscription",
        default=os.environ.get("AZURE_SUBSCRIPTION_ID"),
        help="Target subscription id (default: $AZURE_SUBSCRIPTION_ID).",
    )
    parser.add_argument(
        "--resource-group",
        default=os.environ.get("AZURE_RESOURCE_GROUP"),
        help=(
            "Pre-existing resource group name (default: $AZURE_RESOURCE_GROUP). "
            "Omit on a greenfield run, where the deployment creates it."
        ),
    )
    parser.add_argument(
        "--ai-account",
        default=os.environ.get("AZURE_AI_ACCOUNT_ID"),
        help="Existing Foundry AI account resource id (default: $AZURE_AI_ACCOUNT_ID).",
    )
    parser.add_argument(
        "--ai-project",
        default=os.environ.get("AZURE_AI_PROJECT_ID"),
        help="Existing Foundry project resource id (default: $AZURE_AI_PROJECT_ID).",
    )
    parser.add_argument(
        "--assignee",
        help=(
            "Principal to check (object id or UPN). Defaults to the signed-in user, "
            "or to 'principal' in the --from-file payload."
        ),
    )
    parser.add_argument(
        "--from-file",
        help=(
            "Read observed assignments from a JSON file instead of calling Azure. "
            "Shape: {'principal': {'id': ..., 'display': ...}, "
            "'assignments': [{'scope': ..., 'role': <name or definition id>}, ...]}. "
            "Raw 'az role assignment list' output is accepted too."
        ),
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Print nothing on PASS. The BLOCKED report is always printed.",
    )
    return parser.parse_args(argv)


def _az(args: list[str]) -> object:
    """Run an `az` command and return its parsed JSON output."""
    if shutil.which("az") is None:
        raise PreflightError(
            "Azure CLI ('az') not found on PATH -- required unless --from-file is used."
        )
    completed = subprocess.run(
        ["az", *args, "-o", "json"],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip().splitlines()
        raise PreflightError(
            f"az {' '.join(args)} failed: {detail[-1] if detail else 'unknown error'}"
        )
    try:
        return json.loads(completed.stdout or "null")
    except json.JSONDecodeError as exc:
        raise PreflightError(f"az {' '.join(args)} returned non-JSON output: {exc}") from exc


def build_scopes(args: argparse.Namespace) -> list[tuple[str, str]]:
    """Return the (scope kind, scope id) pairs in play, in report order.

    An existing resource group carries the deployment, so its rows replace the
    subscription rows (subscription grants still satisfy them by inheritance).
    Without one, the subscription rows are checked because the run creates the
    group. Foundry scopes are checked when the run targets existing ones.
    """
    if not args.subscription:
        raise PreflightError(
            "No subscription: set AZURE_SUBSCRIPTION_ID or pass --subscription."
        )

    subscription_scope = f"/subscriptions/{args.subscription}"
    if args.resource_group:
        group = args.resource_group
        scopes = [
            (
                RESOURCE_GROUP,
                group
                if group.startswith("/subscriptions/")
                else f"{subscription_scope}/resourceGroups/{group}",
            )
        ]
    else:
        scopes = [(SUBSCRIPTION, subscription_scope)]
    if args.ai_account:
        scopes.append((AI_ACCOUNT, args.ai_account))
    if args.ai_project:
        scopes.append((AI_PROJECT, args.ai_project))
    return scopes


def drop_missing_group(scopes: list[tuple[str, str]], subscription: str) -> list[tuple[str, str]]:
    """Check the subscription rows instead when the resource group does not exist yet."""
    for index, (kind, scope) in enumerate(scopes):
        if kind != RESOURCE_GROUP:
            continue
        name = scope.rstrip("/").rsplit("/", 1)[-1]
        sub = scope.split("/")[2] if scope.startswith("/subscriptions/") else subscription
        if _az(["group", "exists", "--name", name, "--subscription", sub]) is False:
            scopes[index] = (SUBSCRIPTION, f"/subscriptions/{sub}")
    return scopes


def _role_key(item: dict) -> str:
    """Map an assignment to a ROLES key by definition ID, falling back to its name."""
    for field in ("roleDefinitionId", "role", "roleDefinitionName"):
        value = str(item.get(field) or "").strip()
        if not value:
            continue
        guid = value.rstrip("/").rsplit("/", 1)[-1].lower()
        if guid in _BY_ID:
            return _BY_ID[guid]
        if value.lower() in _BY_NAME:
            return _BY_NAME[value.lower()]
    return ""


def _normalize(assignments: object) -> list[dict[str, str]]:
    """Keep the known roles only; custom and unrelated roles satisfy nothing here."""
    records = []
    for item in assignments or []:
        if not isinstance(item, dict):
            continue
        scope = item.get("scope")
        role = _role_key(item)
        if scope and role:
            records.append({"scope": str(scope), "role": role})
    return records


def load_from_file(path: str, assignee: str | None) -> tuple[dict[str, str], list[dict[str, str]]]:
    """Load a recorded snapshot: {"principal": {"id", "display"}, "assignments": [...]}.

    A bare list of assignments carries no principal, so it needs --assignee; the
    report never prints a remediation command for an unknown principal.
    """
    try:
        with open(path, encoding="utf-8") as handle:
            payload = json.load(handle)
    except json.JSONDecodeError as exc:
        raise PreflightError(f"{path} is not valid JSON: {exc}") from exc
    if isinstance(payload, list):
        payload = {"assignments": payload}
    if not isinstance(payload, dict):
        raise PreflightError(f"{path} must hold an object or a list of assignments.")
    principal = payload.get("principal") or {}
    assignments = payload.get("assignments")
    if not isinstance(principal, dict) or not isinstance(assignments, list):
        raise PreflightError(
            f"{path} must hold 'principal' as an object and 'assignments' as a list."
        )
    principal_id = str(assignee or principal.get("id") or "").strip()
    if not principal_id:
        raise PreflightError(f"{path} names no principal -- pass --assignee.")
    resolved = {
        "id": principal_id,
        "display": str(principal.get("display") or principal_id),
    }
    return resolved, _normalize(assignments)


def resolve_principal(assignee: str | None) -> dict[str, str]:
    if assignee:
        return {"id": assignee, "display": assignee}
    user = _az(["ad", "signed-in-user", "show"])
    if not isinstance(user, dict) or not user.get("id"):
        raise PreflightError(
            "Could not resolve the signed-in user -- run 'az login' or pass --assignee."
        )
    return {
        "id": str(user["id"]),
        "display": str(user.get("userPrincipalName") or user.get("displayName") or user["id"]),
    }


def resolve_assignments(principal_id: str, scopes: list[tuple[str, str]]) -> list[dict[str, str]]:
    """Read effective assignments -- inherited and group-derived included."""
    records: list[dict[str, str]] = []
    for _, scope in scopes:
        listed = _az(
            [
                "role",
                "assignment",
                "list",
                "--assignee",
                principal_id,
                "--scope",
                scope,
                "--include-inherited",
                "--include-groups",
            ]
        )
        if not isinstance(listed, list):
            raise PreflightError(f"az role assignment list returned no list for {scope}.")
        records.extend(_normalize(listed))
    return records


def _covers(assignment_scope: str, scope: str) -> bool:
    """True when an assignment at `assignment_scope` applies to `scope`.

    An assignment inherits downwards, so a subscription-scoped grant satisfies a
    requirement on a resource group or Foundry project beneath it.
    """
    a = assignment_scope.rstrip("/").lower()
    s = scope.rstrip("/").lower()
    return s == a or s.startswith(f"{a}/")


def find_missing(
    scopes: list[tuple[str, str]], assignments: list[dict[str, str]]
) -> list[dict[str, object]]:
    """Diff required against effective, applying role and scope equivalence."""
    missing = []
    for kind, scope in scopes:
        effective = {
            record["role"] for record in assignments if _covers(record["scope"], scope)
        }
        for req in REQUIREMENTS:
            alternatives = req["alternatives"]
            if req["kind"] != kind or any(alt <= effective for alt in alternatives):
                continue
            remedy = next(
                (
                    grant
                    for grant in req["remedies"]
                    if any(alt <= effective | grant for alt in alternatives)
                ),
                req["remedies"][-1],
            )
            missing.append(
                {
                    "scope": scope,
                    "grant": sorted(remedy - effective),
                    "accepts": req["accepts"],
                    "why": req["why"],
                }
            )
    return missing


def report_blocked(principal: dict[str, str], missing: list[dict[str, object]]) -> None:
    count = len(missing)
    plural = "" if count == 1 else "s"
    print(
        f"RBAC pre-flight: BLOCKED -- {count} required role assignment{plural} "
        f"{'is' if count == 1 else 'are'} missing."
    )
    print()
    print(f"  principal: {principal['display']} ({principal['id']})")
    print()
    for gap in missing:
        grant = ", ".join(f"{ROLES[key][1]} ({ROLES[key][0]})" for key in gap["grant"])
        print(f"  MISSING  {principal['display']} -> {gap['scope']}")
        print(f"           grant:   {grant}")
        print(f"           accepts: {gap['accepts']}")
        print(f"           why:     {gap['why']}")
    print()
    print("Ask a subscription owner to run (role definition IDs are stable across renames):")
    print()
    for gap in missing:
        for key in gap["grant"]:
            print(
                f'  az role assignment create --assignee "{principal["id"]}" '
                f'--role "{ROLES[key][0]}" --scope "{gap["scope"]}"'
            )
    print()
    print(f"reference: {REFERENCE}")
    print("No resources have been created. Re-run this check once the assignments are in place.")


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    try:
        scopes = build_scopes(args)
        if args.from_file:
            principal, assignments = load_from_file(args.from_file, args.assignee)
        else:
            scopes = drop_missing_group(scopes, args.subscription)
            principal = resolve_principal(args.assignee)
            assignments = resolve_assignments(principal["id"], scopes)
    except (PreflightError, OSError) as exc:
        print(f"RBAC pre-flight: ERROR -- {exc}", file=sys.stderr)
        return 1
    except (TypeError, ValueError, KeyError, AttributeError) as exc:
        print(f"RBAC pre-flight: ERROR -- unexpected input shape: {exc}", file=sys.stderr)
        return 1

    missing = find_missing(scopes, assignments)
    if missing:
        report_blocked(principal, missing)
        return 2

    if not args.quiet:
        required = sum(1 for kind, _ in scopes for req in REQUIREMENTS if req["kind"] == kind)
        checked = ", ".join(kind.replace("_", " ") for kind, _ in scopes)
        print(
            f"RBAC pre-flight: PASS -- {required} required role assignments satisfied "
            f"({checked})."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
