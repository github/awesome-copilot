# Native, managed, and packaged artifacts

## Native targets

After `open_binary`, use `binary_overview` once and narrow around the requested
feature. Prefer literal search, names, decompilation, callers, callees, and
cross-references. Addresses and recovered pseudocode are analysis observations,
not original source. Provider unavailability and unsupported metadata remain
unknown rather than false.

Use `binary_session` with its default summary to check the open target, selected
provider, alignment, and recommended remediation. Request the capabilities view
with a family filter and page bounds only when choosing a tool. Request the full
view only for an explicit session-diagnostic need.

## Managed PE/CLI

Start with `inspect_managed_artifact`. REA's canonical managed inspection is
execution-free: do not claim it loaded, reflected, executed, or resolved the
assembly. Keep managed/native boundaries and unavailable reconstruction facts
explicit. A bring-your-own reconstruction oracle is separate from the canonical
parser and must not become an implicit setup dependency.

## Packages and extraction

Call `inventory_artifact` before extraction for application bundles, archives,
ZIP/APK/IPA/MSIX/AppX, ASAR, or DMG inputs. Continue deterministic occurrence
pages from the returned offset only when needed. Cite graph manifest IDs.

`extract_artifact` requires explicit approval, an absent absolute output root,
and selected occurrence IDs. Never extract every entry implicitly. Symlinks and
encrypted entries are inventory facts, not extractable files.

Native DMG traversal is macOS-only, read-only, and requires both operator policy
and `native_mount_approved: true`; without both, retain the root-hash-only result.
Approval for inventory never grants extraction authority.
