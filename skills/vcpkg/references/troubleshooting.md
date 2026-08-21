# vcpkg: Troubleshooting & Dependency Lifecycle

Reference for the `vcpkg` skill. Use this when a user encounters vcpkg build failures, package-not-found errors, needs to read build logs, or manages the dependency lifecycle (removing, changing features, replacing libraries, cleaning the cache).

## Reading vcpkg Build Logs

Build logs are stored at:
```
<vcpkg-root>/buildtrees/<port-name>/
```

Key log files:
- `config-<triplet>-out.log` — CMake configure output
- `build-<triplet>-<dbg|rel>-<out|err>.log` — common build logs
- `install-<triplet>-<dbg|rel>-<out|err>.log` — common install logs

Exact names vary by port and build helper; use the path vcpkg prints for the failing command.

When a build fails, vcpkg prints the path to the relevant log. Start with the `-err.log` file for the failing step.

---

## Resolving package-not-found After Install

If CMake says `Could not find a package configuration file provided by "X"`:

1. **Check toolchain file** — ensure `-DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake` is set
2. **Check triplet match** — the installed triplet must match your build architecture
3. **Check package name** — vcpkg port names may differ from CMake package names (e.g., port `nlohmann-json` → `find_package(nlohmann_json)`)
4. **Check installed list** — run `vcpkg list` to confirm the package is actually installed
5. **Clear CMake cache** — delete `CMakeCache.txt` and reconfigure

---

## Dependency Lifecycle

### Removing a Library

1. Remove it from `vcpkg.json` → `"dependencies"` array
2. Run `vcpkg install` to reconcile (manifest mode auto-removes unused packages)

In classic mode:
```console
vcpkg remove boost-regex
vcpkg remove boost-regex --recurse  # also removes dependents
```

### Changing Features on an Installed Library

Update the features in `vcpkg.json`:
```json
{
  "dependencies": [
    {
      "name": "curl",
      "features": ["ssl", "ssh"]
    }
  ]
}
```

Then run `vcpkg install` — vcpkg will detect the feature change and rebuild.

In classic mode, installing a feature only adds to the already installed feature set; omitted features are not removed. To remove a feature, uninstall `curl` and then reinstall it with the desired features. Account for dependent packages before using `--recurse`, because it removes them too.

### Replacing One Library with Another

1. Remove the old library from `vcpkg.json`
2. Add the new library to `vcpkg.json`
3. Run `vcpkg install` to reconcile
4. Update your source code: change `#include` directives, `find_package()` calls, and `target_link_libraries()` in CMakeLists.txt

### Cleaning the vcpkg Cache

```powershell
# Remove build trees
Remove-Item -Recurse -Force <vcpkg-root>\buildtrees

# Remove downloaded archives
Remove-Item -Recurse -Force <vcpkg-root>\downloads

# Remove installed packages (classic mode only)
Remove-Item -Recurse -Force <vcpkg-root>\installed

# Remove package build artifacts
Remove-Item -Recurse -Force <vcpkg-root>\packages

# In CLI manifest mode, remove the manifest-root install directory
Remove-Item -Recurse -Force .\vcpkg_installed

# With CMake integration, remove <build-directory>\vcpkg_installed (or VCPKG_INSTALLED_DIR)
```

```bash
rm -rf <vcpkg-root>/buildtrees
rm -rf <vcpkg-root>/downloads
rm -rf <vcpkg-root>/installed
rm -rf <vcpkg-root>/packages
# CLI manifest mode; with CMake integration, use <build-directory>/vcpkg_installed (or VCPKG_INSTALLED_DIR)
rm -rf ./vcpkg_installed
```
