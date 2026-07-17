# vcpkg: Custom Registries & Overlay Ports

Reference for the `vcpkg` skill. Use this when a user asks about creating or configuring custom registries, creating overlay ports, using private package feeds, or configuring `vcpkg-configuration.json` registries.

## Private / Custom Registry Install

1. Create `vcpkg-configuration.json` alongside your `vcpkg.json`:
```json
{
  "registries": [
    {
      "kind": "git",
      "repository": "https://github.com/your-org/vcpkg-registry",
      "baseline": "<commit-sha>",
      "packages": ["company-utils", "internal-lib"]
    }
  ],
  "default-registry": {
    "kind": "builtin",
    "baseline": "<commit-sha>"
  }
}
```

2. Then add the dependency normally in `vcpkg.json`:
```json
{
  "dependencies": ["company-utils"]
}
```

The `"packages"` array in the registry entry controls which packages are resolved from that registry. Packages not listed fall through to `default-registry`.

---

## Configuring Registries in `vcpkg-configuration.json`

```json
{
  "default-registry": {
    "kind": "builtin",
    "baseline": "<vcpkg-commit-sha>"
  },
  "registries": [
    {
      "kind": "git",
      "repository": "https://github.com/your-org/vcpkg-registry.git",
      "baseline": "<registry-commit-sha>",
      "packages": ["your-package-1", "your-package-2"]
    }
  ]
}
```

Place this file next to `vcpkg.json` in your project root.

---

## Creating an Overlay Port

An overlay port overrides or adds a port locally. Directory structure:
```
my-overlays/
  telemetry-sdk/
    portfile.cmake
    vcpkg.json
```

**`vcpkg.json`** (port metadata):
```json
{
  "name": "telemetry-sdk",
  "version": "1.0.0",
  "description": "Internal telemetry SDK",
  "dependencies": [
    "curl",
    "nlohmann-json",
    { "name": "vcpkg-cmake", "host": true },
    { "name": "vcpkg-cmake-config", "host": true }
  ]
}
```

**`portfile.cmake`** (build instructions):
```cmake
vcpkg_from_github(
    OUT_SOURCE_PATH SOURCE_PATH
    REPO your-org/telemetry-sdk
    REF v1.0.0
    SHA512 <hash>
)

vcpkg_cmake_configure(SOURCE_PATH "${SOURCE_PATH}")
vcpkg_cmake_install()
vcpkg_cmake_config_fixup()

file(REMOVE_RECURSE "${CURRENT_PACKAGES_DIR}/debug/include")
vcpkg_install_copyright(FILE_LIST "${SOURCE_PATH}/LICENSE")
```

Classic mode: `vcpkg install telemetry-sdk --overlay-ports=./my-overlays`

Manifest mode: add `telemetry-sdk` to `vcpkg.json`, then run `vcpkg install --overlay-ports=./my-overlays`.
Or in `vcpkg-configuration.json`:
```json
{
  "overlay-ports": ["./my-overlays"]
}
```

---

## Default Features

Control whether a dependency's existing default features are enabled, and request additional features in a project manifest:
```json
{
  "dependencies": [
    {
      "name": "curl",
      "default-features": true,
      "features": ["ssl", "http2"]
    }
  ]
}
```

To **disable** default features: `"default-features": false`

In a portfile's `vcpkg.json`, default features are listed under:
```json
{
  "name": "curl",
  "default-features": ["ssl", "http2"],
  "features": {
    "ssl": { "description": "SSL/TLS support" },
    "http2": { "description": "HTTP/2 support" }
  }
}
```
