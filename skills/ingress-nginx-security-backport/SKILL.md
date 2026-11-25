---
name: ingress-nginx-security-backport
description: Backport specific CVE fixes to a selected older Kubernetes ingress-nginx controller release, preparing a maintained fork and PR with a reproducible image build, CI integration tests, and an evidence-based confidence summary. Also use to verify an existing backport.
---

# Backport and verify an ingress-nginx security fix

Deliver a reviewable PR containing the fix, build recipe, and automated tests for
the user's selected controller release. Preserve that version constraint. This
skill is self-contained and uses public upstream sources; it requires no company
environment, private repository, internal ticket, or particular cloud provider.

## Explain the work and collect the target

Before making changes, explain the intended workflow in plain language:

> I will create or reuse a maintained fork of Kubernetes ingress-nginx, preserve
> your selected controller version, backport the relevant CVE fixes, and open a
> PR containing the fixes and automated tests. I will build the image and run
> integration tests in GitHub Actions, then summarize the results, artifact
> links, and the confidence supported by the evidence.

Ask these questions when the answers have not already been supplied:

- **Which ingress-nginx controller version do you want to mitigate?** Link to
  the [upstream releases](https://github.com/kubernetes/ingress-nginx/releases).
  Accept a release, release URL, or current image tag/digest.
- **Which CVE or security advisory should this address?** Accept identifiers or
  advisory links; resolve ambiguous vulnerability names before applying fixes.
- **Where should the maintained repository and PR live?** Discover a suitable
  existing fork from the workspace and authenticated account first; ask only
  when its owner or intended destination remains unclear.

Wait for missing release/CVE inputs before modifying a repository or starting
a build. Continue only read-only discovery while those answers are pending.

Resolve and show the exact public controller release/tag link and commit, stock
image digest and platforms, Helm chart version, and bundled NGINX version. For
example, [controller-v1.11.5](https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v1.11.5)
is a controller release, not an NGINX or chart version. If an image cannot be
mapped to a source revision, report the gap before building. Do not silently
select the latest release or treat the example as a default.

Discover the target Kubernetes minors, CPU architectures, modules and protocols
from supplied configuration; ask for any missing inputs that change the test
matrix. For an unspecified deployment target, propose an explicit fixture
matrix and limit the resulting compatibility claim to it.

A request to perform the backport covers preparing the repository, PR and CI
described above, subject to the user's existing authorization. Analysis stays
read-only. For verify-only requests, inspect the existing artifact and evidence;
do not create a fork/PR or change code unless requested. Publishing an image,
merging a PR, and changing a live cluster are separate delivery stages: perform
them only when included in the request.

## Prepare the maintained repository and branch

1. Verify the status and origin of [kubernetes/ingress-nginx](https://github.com/kubernetes/ingress-nginx).
   The upstream repository is retired/archived; target the user's maintained
   repository for the PR, not the archived upstream.
2. Reuse an existing maintained fork or source mirror after checking its
   upstream ancestry. Otherwise create a fork under the resolved owner using
   the available GitHub connector or CLI. Preserve upstream history, license
   notices, and the selected release's commit/tag; copying a source archive
   alone is not a full fork. A mirror is acceptable when native forking is
   unavailable, but identify it as such and record its upstream provenance.
3. Work in an isolated checkout. Establish or reuse a maintenance branch based
   on the selected release plus its already accepted backports. Create the
   fix branch from that base. Never reset an existing maintained branch to an
   older tag or target a newer default branch accidentally.
4. Check for an existing PR for this release/CVE before creating another. Keep
   fixes and their tests in one PR by default, with separate commits when useful
   for review. If a fix has already merged, add the tests in a linked follow-up
   PR rather than recreating the fix.
5. When validating multiple controller releases, use a separate maintenance
   branch and fix PR for each release. Re-derive every release-specific input:
   controller commit, bundled NGINX version and checksum, base image, modules,
   build context, patch set, Kubernetes fixture and architecture. Never copy a
   donor release's checksum or build pin merely because its patch logic applies.

## Select and record the fix

Read the official advisory, for example the [NGINX security advisories](https://nginx.org/en/security_advisories.html),
and verify applicability against the shipped component, build flags and listener
configuration. Keep Kubernetes ingress-nginx distinct from NGINX Gateway Fabric.
Record each CVE's upstream fix commits, prerequisite commits, and applicability.
If no compatible fix can be established, report **NOT VERIFIED** and explain
available alternatives without replacing the requested version silently.

Choose the correct backport mechanism:

- **Controller or Go dependency:** cherry-pick an applicable upstream commit
  with source attribution (for example `git cherry-pick -x`), or make the
  equivalent minimal dependency/source change. Rebuild affected executables.
- **NGINX core or module:** vendor the upstream patch with its source URL and
  checksum, then apply it to the component's source during the native build.
  An NGINX commit cannot simply be cherry-picked into the ingress-nginx source
  tree. Rebuild NGINX and its coupled modules together.
- **Source-built native library** (for example LuaJIT under `/usr/local`):
  patch its pinned source, rebuild the library and affected consumers, and
  verify the final image uses those builder outputs on each target platform.
- **OS-managed package or library:** select a fixed package revision/base digest and
  verify the installed version and the library actually loaded by the process.

Commit a small backport manifest with the controller/source/base pins, each
CVE-to-fix mapping, ordered patch hashes, prerequisites, adaptations, and target
platforms. Compare vendored patches with their upstream bytes. Explain conflict
resolutions and retain their upstream attribution. Apply the ordered series
after existing patches, with forward checks before application and reverse
checks (or equivalent source checks) on the appropriate resulting tree.

If an upstream patch does not apply because the selected older source has a
different layout, make the smallest context or semantic adaptation required.
Keep the upstream source link and authorship, record both the adapted hash and
the reason for the change, and rerun the pristine-tree forward and reverse
controls. Do not treat a successful adapted patch application as behavioral
proof of the CVE fix.

## Build and retain the exact artifact

- Discover the selected release's build layout. For v1.11.5, the NGINX builder
  is in `images/nginx/rootfs`; security patches must run in `build.sh` before
  configure/compile. Build the final controller from `rootfs` with that rebuilt
  base supplied as `BASE_IMAGE`. Adapt paths for other releases.
- Before building, compare every source version, checksum, base, module and
  toolchain pin with the untouched selected tag. A patch donor is evidence for
  the fix, not evidence that its release-specific build inputs fit the target.
- Resolve the source revision that produced the release's pinned NGINX base;
  it may differ from the controller tag (and may be encoded in the base image
  tag or provenance). Rebuild from that base-source revision, then apply the
  security overlay. Compare its static/dynamic module composition with the
  shipped controller image so a later branch's module changes are not imported.
- Verify source archives against published checksums/signatures. Pin source
  commits, base images by digest, toolchains, and package inputs. Replace or
  account for floating downloads and `apk upgrade`; record remaining mutable
  inputs as reproducibility gaps, not as a reproducible build.
- Choose one recipe and use it for CI and delivery. For an NGINX-only fix, stock
  controller/helpers may be reused from the digest-pinned image for the same
  architecture. Alternatively rebuild them from the pinned source and
  toolchain. Record which path was used; tests of a rebuilt controller do not
  validate a different image assembled with stock executables.
- Build each requested platform, use a distinct backport tag, and compare stock
  and patched executables, modules, package manifests and OCI configuration.
  Explain unrelated changes rather than expanding the fix silently.
- Retain the tested image as a CI artifact (for example an OCI archive), with
  its checksum, commit, patch hashes, executable hashes and CI run URL. Record
  the artifact's retrieval URL and retention. An archive checksum or local
  image ID is not a registry manifest digest.

## Add the tests, open the PR, and run CI

Read [the integration test recipe](references/integration-tests.md) and implement
it in the maintained repository. The recipe includes the native-builder patch
checks, baseline/patched regression, final-image binary comparison, TLS HTTP/2
smoke test, and real Kubernetes Ingress test. Adapt it to each selected CVE and
target; do not retain a previous CVE, architecture or Kubernetes version as a
hidden constant. Keep the workflow and test helpers with the fix in the PR.
Build the applicability matrix from the component version, compiled modules and
deployed configuration. A module may be present but not exercised by the chosen
fixture; report that CVE's behavioral check as NOT RUN. Do not credit an HTTP/2
or ordinary-traffic compatibility smoke test as resolver, HTTP/3, mail or other
unrelated CVE-specific behavioral evidence.

Run applicable local static checks, then push and open/update the PR against the
maintenance branch. Its description must explain the CVE and old-version
constraint, upstream fixes, build recipe, test matrix, artifact handling and
known gaps. Use public source links and sanitized evidence. Do not copy private
endpoints, credentials, organization identifiers or incident records into the
skill, generated fixtures, PR, or uploaded logs.

Trigger the PR workflow, or dispatch the workflow for the exact branch when
available. A newly added dispatch workflow may need to exist on the repository's
default branch first; prefer its PR trigger rather than merging just to run it.
Run Docker/kind integration environments in GitHub Actions, not on the user's
workstation. Inspect failures, fix the entire current batch, and rerun affected
checks. Do not weaken a test or skip dependency review to obtain green CI.

Wait for the final revision's required jobs. Record the checked-out revision
(including a synthetic PR merge revision when used), run URL and results. A
skipped/cancelled job or an earlier commit's green run is not passing evidence.
For a permissions, unavailable-runner, or missing-fix blocker, retain the PR and
report the exact next action instead of retrying indefinitely or claiming success.

## Optional publication and deployment verification

When publication is in scope, publish the same retained image, resolve its index
and platform manifest digests, then independently pull each platform by digest.
Compare its manifest digest to the retained OCI platform manifest digest. For
a Docker archive, compare the image config digest and ordered rootfs DiffIDs.
Any mismatch or missing identity evidence requires retesting the pulled image. Attach provenance linking the digest to source,
patch hashes, platform and CI run. Rebuilding creates a new artifact: rerun the
required affected source, behavioral, identity and integration checks against
that replacement before promotion. A hash check alone cannot transfer the
previous artifact's verdict to different bytes.

When live verification is requested, discover the user's cluster/context,
namespace, ingress classes and endpoint; never assume a provider or environment.
Use permitted read-only APIs to check desired pins, rollout status and **every
serving replica's** platform image ID, including old replicas still serving.
Probe ordinary traffic through the intended endpoint and observe readiness and
restarts. Follow the environment's access rules; in-pod commands are not required
to establish deployment identity. Keep this result separate from CI evidence.

## Finish with a confidence summary

Always provide a summary, including on failure or a partial run:

- Selected controller release/link, bundled NGINX, CVEs and applicability.
- Maintained repository, base/fix branches, PR link(s), and tested revision.
- Upstream fixes and any adaptations or unrelated dependency changes.
- Build recipe, tested Kubernetes/platform/protocol matrix, and CI run links.
- Image artifact URL/checksum; registry/index/platform digests only if published
  and verified. State explicitly if no retrievable image was retained.
- A per-CVE evidence table: **check | PASS / FAIL / NOT RUN / NOT APPLICABLE |
  exact revision or artifact | evidence link | limitation**. Explain every
  exclusion and distinguish source inclusion, behavioral regression, final-image
  identity, integration compatibility, publication and live deployment.
- Separate confidence statements for the CI artifact and any published or live
  artifact, followed by one recommended next action. Headline the requested
  deliverable's status; a verified CI image cannot make an untested published
  replacement verified.

Use **verified for the tested scope** only when all required checks for each
claimed CVE and target passed on the same artifact. Use **partially verified**
when evidence exists but required checks are missing, and **not verified** when
the fix cannot be established or a required check fails. List failures even if
other stages passed. NOT APPLICABLE needs evidence of inapplicability; an absent
or difficult behavioral test is NOT RUN, never NOT APPLICABLE. An
extracted-expression test supports only that expression; normal traffic alone
does not prove CVE mitigation. Optional publication/live
checks may be NOT RUN without invalidating a clearly limited CI-only result.
Do not give an unsupported percentage, imply all vulnerabilities are fixed, or
claim that a custom backport restores upstream support for the retired project.

## Example outcome

The final response can use this compact public-safe shape (replace every example
value and link with the run's real evidence):

> **Partially verified — controller-v1.11.4 CI artifact**
>
> - Target: [controller-v1.11.4](https://github.com/kubernetes/ingress-nginx/releases/tag/controller-v1.11.4),
>   bundled NGINX 1.25.5, Linux/amd64, Kubernetes v1.30 fixture.
> - Repository: `example-org/ingress-nginx-maintained`; base
>   `maintenance/controller-v1.11.4`; [fix and test PR](https://github.com/example-org/ingress-nginx-maintained/pull/42).
> - Build: the selected release's native NGINX builder plus the exact final
>   controller image; [successful CI run](https://github.com/example-org/ingress-nginx-maintained/actions/runs/123456789).
> - Retained artifact: `controller-v1.11.4-backport-amd64.tar.gz`, SHA-256
>   `0123456789abcdef...`, retained for 14 days. No registry image was published.
>
> | CVE | Source/fix evidence | Behavioral evidence | Result |
> | --- | --- | --- | --- |
> | CVE-2026-123007 | ordered patch and reverse control passed | focused regression plus final-image HTTP/2 and Ingress tests passed | PASS for tested scope |
> | CVE-2026-123634 | ordered patches and final-image identity passed | resolver/subrequest reproducer not run | NOT RUN; partial only |
> | CVE-2026-113425 | mail module absent from the recorded build flags | not required | NOT APPLICABLE |
>
> Confidence: the retained CI artifact contains the recorded fixes and passed
> the stated amd64/Kubernetes/HTTP/2 tests. Resolver behavior, other CPU
> architectures, registry publication and live deployment remain unverified.
> The Linux kernel portion of a broader advisory is outside this image backport.
> Next: add the missing resolver regression before publication.
