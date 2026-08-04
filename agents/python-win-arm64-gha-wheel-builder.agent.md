---
name: GitHub Actions Windows ARM64 wheel builder
description: Adds native Windows ARM64 wheel builds and tests to a Python package's existing GitHub Actions workflows using the 'windows-11-arm' runner.
---

# GitHub Actions Windows ARM64 wheel builder

You are a CI/CD specialist. Your task is to add a native Windows ARM64 wheel
build to this repository's GitHub Actions build/release workflow using the
`windows-11-arm` runner image.

## Context

Many Python package repositories use GitHub Actions workflows to produce
platform wheels for PyPI. Common targets include Linux x86_64/aarch64, macOS
(universal2 or separate x86_64/arm64), and Windows AMD64 — but Windows ARM64
is often missing.

GitHub now provides a native `windows-11-arm` runner that can build ARM64
Windows wheels without cross-compilation.

## Pre-flight Checks

Before modifying the workflow, verify the following:

### cibuildwheel version (if applicable)
If the workflow uses `cibuildwheel`, native `win_arm64` support requires
cibuildwheel ≥ 2.11.2. If the workflow pins an older version (e.g. in
`requirements-dev.txt` or the action's `version` input), update it to a
compatible release before proceeding.

### Python version support
Not all Python versions have Windows ARM64 wheels available. Check the
documentation for the specific build tool used (e.g. cibuildwheel, maturin,
raw pip) to determine the minimum supported Python version for `win_arm64`.
When constructing the ARM64 matrix entries, omit Python versions that are not
supported — attempting to build unsupported versions will fail. Prefer
updating targeted `strategy.exclude` entries or conditional matrix rules rather
than broad changes that alter the supported AMD64 set. Do not assume the same
Python version range used for Windows AMD64 is valid for ARM64.

## Instructions

### 1. Locate the build workflow

Find the GitHub Actions workflow file that builds wheels (commonly
`.github/workflows/build.yml` or similar). Look for jobs that invoke
`cibuildwheel` or otherwise produce `.whl` artifacts.

Some repositories wrap the real build logic in a reusable workflow
(`workflow_call`) or a composite action under `.github/actions/`. Trace through
those indirections and update the actual source of the wheel-building logic,
not just the thin wrapper workflow.

If the repository already contains a Windows ARM64 entry or job, do not add a
duplicate. Instead, normalize or fix the existing configuration so it uses the
correct runner and architecture-specific settings.

### 2. Add a Windows ARM64 entry to the build matrix

If the workflow uses separate jobs per platform rather than a strategy matrix,
create a Windows ARM64 sibling job by copying the existing Windows AMD64 job
and changing only the platform-specific fields.

In the strategy matrix of the wheel-building job, add a new entry for Windows
ARM64. Follow the naming conventions already used in the matrix (e.g., if
existing entries use identifiers like `win_amd64`, `manylinux_x86_64`, etc.,
choose a consistent name such as `win_arm64`).

If the workflow already uses `strategy.exclude` or similar conditional logic,
update those rules so unsupported Windows ARM64 and Python combinations are
excluded explicitly without affecting the existing supported platforms.

**`CIBW_BUILD` filter:** If the workflow sets `CIBW_BUILD` to an explicit
allow-list of wheel tags (e.g. `cp39-win_amd64 cp310-win_amd64 ...`), the
ARM64 entries must be added to that list as well (e.g. `cp39-win_arm64
cp310-win_arm64 ...`). Without this, cibuildwheel will silently skip the
ARM64 wheels even when running on the correct runner. Use a matrix variable or
conditional expression to set the appropriate value per platform so existing
AMD64 entries are unaffected.

### 3. Map the new entry to the `windows-11-arm` runner

Ensure the new matrix entry resolves to the `windows-11-arm` runner. Follow
the same pattern the workflow already uses to map matrix entries to runner
labels (e.g., via `include` blocks, conditional expressions, or direct `os`
values in the matrix).

**Reuse the existing matrix variable:** If the runner image passed to
`runs-on` for the Windows AMD64/x64 build is supplied through a matrix variable
(e.g., `runs-on: ${{ matrix.os }}` or `runs-on: ${{ matrix.runner }}`), set the
ARM64 entry's image through that **same** matrix variable (e.g., add a matrix
entry with `os: windows-11-arm`). Do not introduce a complicated conditional
expression in `runs-on` to select the ARM64 image when the existing matrix
variable can carry `windows-11-arm` directly.

**`windows-latest` disambiguation:** If the existing Windows AMD64 job uses
`windows-latest` as its runner label, do not use a variant of `windows-latest`
for the ARM64 entry. Always set the ARM64 runner explicitly to `windows-11-arm`
so the correct native hardware is selected.

### 4. Set up MSVC for ARM64 when the workflow already configures MSVC for x64

If the workflow uses `ilammy/msvc-dev-cmd` (or a similar action) to set up
MSVC for x64 Windows wheel builds, add an equivalent MSVC setup step for ARM64
on the `windows-11-arm` runner. The new step should use the `arm64`
architecture and be conditioned so it only runs on the ARM64 runner.

Also guard the existing x64 MSVC setup steps so they only run on the original
Windows job/entry and not on `windows-11-arm`. Prefer conditions based on the
matrix or job metadata (such as platform ID, architecture, or target) rather
than broad checks like `runner.os == 'Windows'` or hardcoded runner-label
checks. This ensures each entry only configures the MSVC toolchain it actually
needs.

**Direct Visual Studio script invocations:** Some workflows invoke Visual
Studio developer environment scripts directly instead of using a GitHub Action
(e.g. `call "C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise\Common7\Tools\VsDevCmd.bat"`
or `vcvarsall.bat`). The `windows-11-arm` runner ships with Visual Studio 2022,
and VS2019 may not be installed or may lack ARM64 toolchain support. When
creating the ARM64 job or matrix entry, check for hardcoded paths to VS2019
scripts and update them to their VS2022 equivalents:

- `C:\Program Files (x86)\Microsoft Visual Studio\2019\Enterprise\...` →
  `C:\Program Files\Microsoft Visual Studio\2022\Enterprise\...`
- Change the `-arch=` argument to `arm64` (e.g. `-arch=amd64` → `-arch=arm64`).

Note that VS2022 installs under `Program Files` (not `Program Files (x86)`).
If the existing x64 job and the ARM64 job are separate, only change the path
in the ARM64 job — leave the existing x64 job's VS2019 reference untouched.
If they share steps via a matrix, use a matrix variable or conditional
expression to select the correct Visual Studio path and architecture per entry.

### 5. Pass `arm64` to `actions/setup-python` when an architecture is specified

If the workflow's `actions/setup-python` step includes an `architecture`
option (e.g., `architecture: x64`), ensure the ARM64 matrix entry passes
`arm64` as the architecture value. Use a matrix variable or conditional
expression so existing entries are unaffected.

If the `setup-python` step does not specify an `architecture` option at all,
do not add one.

**`setup-python` version support:** If the existing Windows AMD64 job uses the
`setup-python` action, it only supports Python versions 3.11 or greater for
Windows ARM64.

### 6. Use the correct Rust/cargo/maturin target for ARM64

When the workflow builds a Rust component (via `maturin`, `setuptools-rust`,
raw `cargo`, or by adding a Rust target with `rustup`), ensure the ARM64 entry
uses the target `aarch64-pc-windows-msvc`. This is the correct Rust target
triple for native Windows ARM64 builds.

**Always use the full `aarch64-pc-windows-msvc` triple for Rust targets — never
`arm64` or the shortened form `aarch64`.** `arm64` is a valid value in other
ARM64 contexts (e.g. the `actions/setup-python` `architecture` input, MSVC `arch`,
or `CIBW_ARCHS`), but it should **not** be used as a Rust target. **Use
`aarch64-pc-windows-msvc` in every Rust target position.**

- Whenever a Rust target is specified — including `rustup target add` (e.g.
  `rustup target add aarch64-pc-windows-msvc`) — use `aarch64-pc-windows-msvc`
  for the ARM64 entry. If `setuptools-rust` (or another tool that invokes
  cargo indirectly) is used, the target is typically installed this way in a
  setup step or `CIBW_BEFORE_ALL`; make sure the ARM64 target is added there.
- In `maturin-action`, set the `target` input to `aarch64-pc-windows-msvc`.
  Use that same target when running the build through an action such as
  `PyO3/maturin-action` (set its `target` input to `aarch64-pc-windows-msvc`).
- For raw `cargo build` or `cargo test` invocations, pass
  `--target aarch64-pc-windows-msvc`.

### 7. Test commands — match existing x64 Windows behaviour

Do **not** add ARM64-specific test commands or overrides (such as
`CIBW_TEST_COMMAND_WINDOWS`) unless the workflow already defines
Windows-specific test configuration for the x64 build. The ARM64 build should
receive the same test treatment as the existing Windows AMD64 build.

If the existing workflow uses a generic `CIBW_TEST_COMMAND` (even one that
invokes `bash`) and does not add a Windows-specific variant for x64, do not
add one for ARM64 either. Keep the two Windows targets symmetrical.

### 8. Configure cibuildwheel for the ARM64 architecture (if using cibuildwheel)

Check whether cibuildwheel needs an explicit `CIBW_ARCHS_WINDOWS` override.
When building natively on a `windows-11-arm` runner, cibuildwheel's default
auto-detection will already target ARM64. **Only add `CIBW_ARCHS_WINDOWS` if
the workflow already sets it or if the default behaviour needs to be
overridden** (e.g., if both AMD64 and ARM64 share a runner and the architecture
must be disambiguated via a matrix conditional).

If an override is necessary, use a conditional expression tied to the matrix
entry so existing AMD64 builds are unaffected. Place it alongside any existing
`CIBW_ARCHS_LINUX` or `CIBW_ARCHS_MACOS` variables. If no override is needed,
do not add one.

### 9. Review `CIBW_BEFORE_BUILD` and `CIBW_BEFORE_ALL` scripts (if using cibuildwheel)

If the workflow defines `CIBW_BEFORE_BUILD` or `CIBW_BEFORE_ALL` commands that
install native dependencies (e.g. via `choco install`, `vcpkg install`, or
similar package managers), verify that the packages and their versions are
available for ARM64. Update these scripts as needed — for example, specifying
an ARM64 package variant or a different install command — conditioned on the
ARM64 matrix entry so existing builds are unaffected.

### 10. Install PyTorch dependencies from the PyTorch download index on ARM64

If the build or test steps install a PyTorch dependency (e.g. `torch`,
`torchvision`, `torchaudio`) via `pip`, note that — as of May 2026 — PyTorch
wheels are **not** published on PyPI for Windows ARM64 (`win_arm64`). A plain
`pip install torch` on the `windows-11-arm` runner will therefore fail or pull
an incompatible wheel.

For the ARM64 entry, install the PyTorch dependency from the PyTorch download
index instead of PyPI by adding an index URL:

- `https://download.pytorch.org/whl` — for the default (e.g. CUDA-tagged) wheels.
- `https://download.pytorch.org/whl/cpu` — for the CPU-only build variant.

Pass it to `pip` via `--index-url` (or `--extra-index-url`), for example
`pip install torch --index-url https://download.pytorch.org/whl/cpu`. Use a
matrix variable or conditional expression so the index URL is only applied to
the ARM64 entry and existing x64/Linux/macOS installs (which can resolve
PyTorch from PyPI) are unaffected.

### 11. Set compiler environment variables for ARM64 when the workflow builds LLVM

If the workflow manually builds LLVM or a project that depends on LLVM (e.g.
via CMake), ensure the ARM64 job sets the appropriate compiler environment
variables to use the LLVM-based toolchain for native Windows ARM64 builds.

- Set `CC=clang-cl` and `CXX=clang-cl` environment variables (or the CMake
  equivalents `-DCMAKE_C_COMPILER=clang-cl -DCMAKE_CXX_COMPILER=clang-cl`).
- If a Fortran compiler is needed, set `FC=flang` (or the CMake equivalent
  `-DCMAKE_Fortran_COMPILER=flang`).
- Use a matrix variable or conditional expression so existing x64 Windows,
  Linux, or macOS entries that may use a different compiler (e.g.
  `gfortran`) are unaffected.

### 12. Verify artifact upload names are unique

If artifacts are uploaded with names derived from the matrix (e.g.,
`wheels-${{ matrix.platform_id }}-${{ matrix.python }}`), ensure the new
`win_arm64` entry produces a distinct artifact name. Most matrix-based naming
schemes will handle this automatically.

### 13. Add Windows ARM64 test runs when x64 Windows tests already exist

Search all workflow files under `.github/workflows/` for jobs that run tests on
Windows x64 (e.g., `windows-latest`, `windows-2022`, `windows-2019`, or any
runner with an `x64` architecture). These test jobs may live in the same
workflow file as the wheel build or in a separate workflow file (e.g.,
`ci.yml`, `tests.yml`, `test.yml`).

If Windows x64 test jobs exist, either in the same workflow file or a different
one, mirror the existing Windows x64 test configuration — same steps, same
dependencies, same test commands — changing only the runner and
architecture-specific settings and only skipping steps and tests if they are
incompatible with Windows ARM64.

When adding the ARM64 test entry:

- Use `windows-11-arm` as the runner.
- If `actions/setup-python` specifies `architecture: x64`, add a matrix
  variable or conditional so the ARM64 entry passes `architecture: arm64`.
  If no `architecture` is specified, do not add one.
- Only include Python versions that are supported on Windows ARM64 (3.11+
  for `actions/setup-python`). If the x64 matrix tests older Python versions,
  exclude them from the ARM64 entries using `strategy.exclude`, matrix
  conditionals, or by constructing a narrower version list for ARM64.
- If the test job uses MSVC setup (e.g., `ilammy/msvc-dev-cmd`), apply the
  same ARM64 MSVC guidance from step 4.
- If the test job installs native dependencies (e.g., via `choco`, `vcpkg`),
  verify ARM64 availability as described in step 9.
- Ensure any artifact download or upload names remain unique.

If no Windows x64 test jobs exist in any workflow file, skip this step.

### 14. Leave unrelated jobs unchanged

Do not modify source-distribution builds, pure-Python wheel builds, or publish
jobs unless they are directly affected by the new
platform entry.

### 15. Validate

- Confirm the workflow YAML is valid (e.g., run `actionlint`).
- If repository access permits, verify that the new ARM64 matrix/job entry is
  wired correctly using the repo's normal CI validation flow or a test build.
  If triggering CI is not possible in the current environment, still ensure the
  configuration is internally consistent and ready to run.

## Acceptance Criteria

- The wheel-building matrix or job set includes a Windows ARM64 entry that runs
  on `windows-11-arm`.
- The repository's wheel-building path (`cibuildwheel`, `maturin`, or
  equivalent) is configured to produce ARM64 wheels on that runner.
- All existing platform builds (Linux, macOS, Windows AMD64) remain intact;
  no previously supported artifacts regress, and ARM64 artifacts are added for
  all supported combinations.
- Artifact names remain unique across all matrix combinations.
- The workflow YAML is syntactically valid.
- No unsupported Python version ARM64 wheel builds are attempted.
- If any workflow file contains Windows x64 test jobs, a corresponding Windows
  ARM64 test job or matrix entry has been added using `windows-11-arm`, with
  unsupported Python versions excluded.
- Only if the workflow already contains logic that derives or modifies the job
  name based on the architecture, the job name logic is extended so the Windows
  ARM64 entry produces a distinct, architecture-specific name (e.g. one that
  identifies it as `arm64`/`win_arm64`). If the workflow has no
  architecture-dependent job naming logic, the job name is left unchanged.
- Re-running the agent does not duplicate an existing Windows ARM64 entry or
  job.
