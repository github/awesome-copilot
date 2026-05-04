# MSYS2 Reference

MSYS2 provides a collection of tools and libraries for building, installing, and running native Windows software. It uses Pacman (from Arch Linux) for package management.

## Getting Started

- [Getting Started](https://www.msys2.org/)
- [What is MSYS2?](https://www.msys2.org/docs/what-is-msys2/)
- [Who Is Using MSYS2?](https://www.msys2.org/docs/who-is-using-msys2/)
- [MSYS2 Installer](https://www.msys2.org/docs/installer/)
- [News](https://www.msys2.org/news/)
- [FAQ](https://www.msys2.org/docs/faq/)
- [Supported Windows Versions and Hardware](https://www.msys2.org/docs/windows_support/)
- [ARM64 Support](https://www.msys2.org/docs/arm64/)

## Environments

MSYS2 provides multiple environments targeting different use cases:

- [Environments Overview](https://www.msys2.org/docs/environments/)
- [GCC vs LLVM/Clang](https://www.msys2.org/docs/environments/#gcc-vs-llvmclang)
- [MSVCRT vs UCRT](https://www.msys2.org/docs/environments/#msvcrt-vs-ucrt)
- [Changelog](https://www.msys2.org/docs/environments/#changelog)

| Environment | Prefix | Toolchain | C Runtime |
|-------------|--------|-----------|-----------|
| MSYS | `/usr` | GCC | cygwin |
| MINGW64 | `/mingw64` | GCC | MSVCRT |
| UCRT64 | `/ucrt64` | GCC | UCRT |
| CLANG64 | `/clang64` | LLVM | UCRT |
| CLANGARM64 | `/clangarm64` | LLVM | UCRT |

## Configuration

- [Updating MSYS2](https://www.msys2.org/docs/updating/)
- [Filesystem Paths](https://www.msys2.org/docs/filesystem-paths/)
- [Symlinks](https://www.msys2.org/docs/symlinks/)
- [Configuration Locations](https://www.msys2.org/docs/configuration/)
- [Terminals](https://www.msys2.org/docs/terminals/)
- [IDEs and Text Editors](https://www.msys2.org/docs/ides-editors/)
- [Just-in-time Debugging](https://www.msys2.org/docs/jit-debugging/)

## Package Management

- [Package Management](https://www.msys2.org/docs/package-management/)
- [Package Naming](https://www.msys2.org/docs/package-naming/)
- [Package Index](https://packages.msys2.org/)
- [Repositories and Mirrors](https://www.msys2.org/docs/repos-mirrors/)
- [Package Mirrors](https://www.msys2.org/docs/mirrors/)
- [Tips and Tricks](https://www.msys2.org/docs/package-management-tips/)
- [FAQ](https://www.msys2.org/docs/package-management-faq/)
- [pacman](https://www.msys2.org/docs/pacman/)

## Development Tools

- [Using CMake in MSYS2](https://www.msys2.org/docs/cmake/)
- [Autotools](https://www.msys2.org/docs/autotools/)
- [Python](https://www.msys2.org/docs/python/)
- [Git](https://www.msys2.org/docs/git/)
- [C/C++](https://www.msys2.org/docs/c/)
- [C++](https://www.msys2.org/docs/cpp/)
- [pkg-config](https://www.msys2.org/docs/pkgconfig/)
- [Using MSYS2 in CI](https://www.msys2.org/docs/ci/)

## Package Development

- [Creating a new Package](https://www.msys2.org/dev/new-package/)
- [Updating an existing Package](https://www.msys2.org/dev/update-package/)
- [Package Guidelines](https://www.msys2.org/dev/package-guidelines/)
- [License Metadata](https://www.msys2.org/dev/package-licensing/)
- [PKGBUILD](https://www.msys2.org/dev/pkgbuild/)
- [Mirrors](https://www.msys2.org/dev/mirrors/)
- [MSYS2 Keyring](https://www.msys2.org/dev/keyring/)
- [Python](https://www.msys2.org/dev/python/)
- [Automated Build Process](https://www.msys2.org/dev/build-process/)
- [Vulnerability Reporting](https://www.msys2.org/dev/vulnerabilities/)
- [Accounts and Ownership](https://www.msys2.org/dev/accounts/)

## Wiki

- [Welcome to the MSYS2 wiki](https://www.msys2.org/wiki/Home/)
- [How does MSYS2 differ from Cygwin?](https://www.msys2.org/wiki/How-does-MSYS2-differ-from-Cygwin/)
- [MSYS2-Introduction](https://www.msys2.org/wiki/MSYS2-introduction/)
- [MSYS2 History](https://www.msys2.org/wiki/History/)
- [Creating Packages](https://www.msys2.org/wiki/Creating-Packages/)
- [Distributing](https://www.msys2.org/wiki/Distributing/)
- [Launchers](https://www.msys2.org/wiki/Launchers/)
- [Porting](https://www.msys2.org/wiki/Porting/)
- [Re-installing MSYS2](https://www.msys2.org/wiki/MSYS2-reinstallation/)
- [Setting up SSHd](https://www.msys2.org/wiki/Setting-up-SSHd/)
- [Signing Packages](https://www.msys2.org/wiki/Signing-packages/)
- [Do you need Sudo?](https://www.msys2.org/wiki/Sudo/)
- [Terminals](https://www.msys2.org/wiki/Terminals/)
- [Qt Creator](https://www.msys2.org/wiki/GDB-qtcreator/)
- [TODO LIST](https://www.msys2.org/wiki/Devtopics/)
