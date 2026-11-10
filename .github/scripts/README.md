# Repository scripts

Scripts are grouped by the repository area they maintain. Tests live alongside their subject; canvas board tests are grouped under `canvas/boards/` without being bundled into the extensions.

| Directory | Responsibility |
| --- | --- |
| `catalog/` | Generate repository and website catalogs, create and validate plugins and skills, and materialize plugins. |
| `external-plugins/` | External plugin validation, intake, quality gates, approval, and re-review. |
| `review/` | Submission gate, PR risk scanning, reviewer routing, review metrics, and reports. |
| `canvas/` | Canvas smoke checks, error-handoff synchronization, and board regression tests. |
| `content-sync/` | Synchronize the App for Beginners mirror. |
| `maintenance/` | Contributor utilities, line-ending normalization, and branch cleanup. |
| `lib/`, `utils/` | Shared modules used across script groups. |

Use the npm commands in `package.json` for common build, catalog, and contributor tasks. Some maintenance and workflow scripts are invoked directly by their workflow or documented next to the relevant feature.

## Maintainer references

- [Canvas evidence and metrics](../../docs/maintainers/canvas-evidence-and-metrics.md)
- [Review routing](../../docs/maintainers/review-routing.md)
- [Submission gate](../../docs/maintainers/submission-gate.md)
- [External plugin contribution guide](../../CONTRIBUTING.md#adding-external-plugins)
