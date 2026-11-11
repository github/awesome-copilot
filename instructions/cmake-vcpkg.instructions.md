---
description: 'C++ project configuration and package management'
applyTo: '**/*.cmake, **/CMakeLists.txt, **/CMakePresets.json, **/CMakeUserPresets.json, **/vcpkg.json, **/vcpkg-configuration.json'
---

Inspect the project's existing CMake presets and vcpkg configuration before suggesting changes. When `vcpkg.json` is present, maintain dependencies in that manifest and restore them through CMake configuration or `vcpkg install` without package names; do not substitute classic-mode `vcpkg install <library>` commands.
Prefer shared cache variables and toolchain settings in `CMakePresets.json`. Put machine-specific paths in untracked `CMakeUserPresets.json`, and use a presets schema supported by the project's CMake version. Set `CMAKE_TOOLCHAIN_FILE` before the first `project()` call, preferably through a preset.
Preserve explicit registry or `builtin-baseline` versions when the project uses vcpkg versioning; update them deliberately rather than during unrelated changes.
Give information about any CMake Policies that might affect CMake variables that are suggested or mentioned.
This project needs to be cross-platform and cross-compiler for MSVC, Clang, and GCC.
For OpenCV filesystem examples, follow the project's asset-path convention. If the example must be independent of the working directory, accept an absolute path as input instead of hard-coding a developer-specific Windows path.

References: [vcpkg CMake integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration), [manifest mode](https://learn.microsoft.com/en-us/vcpkg/users/manifests), [CMake presets](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html).
