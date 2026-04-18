# Cygwin Reference

Cygwin provides a large collection of GNU and Open Source tools that provide functionality similar to a Linux distribution on Windows, plus a POSIX API DLL (`cygwin1.dll`) for substantial Linux API compatibility.

## Documentation

- [Cygwin User's Guide](https://cygwin.com/cygwin-ug-net.html) — comprehensive official documentation
- [Cygwin FAQ](https://cygwin.com/faq.html)
- [Cygwin Homepage](https://cygwin.com/)

## User's Guide — Table of Contents

### Chapter 1: Cygwin Overview

- **What is it?** — POSIX compatibility layer and GNU toolset for Windows
- **Quick Start Guide (Windows users)** — Getting started for those familiar with Windows
- **Quick Start Guide (UNIX users)** — Getting started for those familiar with UNIX/Linux
- **Are the Cygwin tools free software?** — Licensing (GPL/LGPL)
- **A brief history of the Cygwin project** — Origins and evolution
- **Highlights of Cygwin Functionality**
  - Permissions and Security
  - File Access
  - Text Mode vs. Binary Mode
  - ANSI C Library
  - Process Creation
  - Signals
  - Sockets and Select
- **What's new and what changed** — Release notes for all versions (1.7.x through 3.6)

### Chapter 2: Setting Up Cygwin

- **Internet Setup** — Installing via `setup-x86_64.exe`, mirror selection, package management
- **Environment Variables** — Configuring `PATH`, `HOME`, `CYGWIN` and other environment variables
- **Changing Cygwin's Maximum Memory** — Adjusting memory limits via the registry
- **Internationalization** — Locale and character set configuration
- **Customizing bash** — `.bashrc`, `.bash_profile`, and prompt customization

### Chapter 3: Using Cygwin

- **Mapping path names** — How Cygwin maps POSIX paths to Windows paths (`/cygdrive/c` = `C:\`)
- **Text and Binary modes** — Line ending handling (`\n` vs `\r\n`), mount options
- **File permissions** — POSIX permission model on NTFS, ACLs
- **Special filenames** — Device files, `/proc`, `/dev`, socket files
- **POSIX accounts, permission, and security** — User/group mapping, `passwd`/`group` files, `ntsec`
- **Cygserver** — Background service for shared memory, message queues, semaphores
- **Cygwin Utilities** — Built-in command-line tools:
  - `cygcheck` — System information and package diagnostics
  - `cygpath` — Convert between POSIX and Windows paths
  - `cygstart` — Open files/URLs with associated Windows applications
  - `dumper` — Create Windows minidumps
  - `getconf` — Query POSIX system configuration
  - `getfacl` / `setfacl` — Get/set file access control lists
  - `ldd` — List shared library dependencies
  - `locale` — Display locale information
  - `minidumper` — Write a minidump of a running process
  - `mkgroup` / `mkpasswd` — Generate group/passwd entries from Windows accounts
  - `mount` / `umount` — Manage Cygwin mount table
  - `passwd` — Change passwords
  - `pldd` — List loaded DLLs for a process
  - `profiler` — Profile Cygwin programs
  - `ps` — List running processes
  - `regtool` — Access the Windows registry from the shell
  - `setmetamode` — Control meta key behavior in the console
  - `ssp` — Single-step profiler
  - `strace` — Trace system calls and signals
  - `tzset` — Print POSIX-compatible timezone string
- **Case-sensitive directories** — Enabling per-directory case sensitivity on Windows 10+
- **Using Cygwin effectively with Windows** — Integration tips, running Windows programs from Cygwin

### Chapter 4: Programming with Cygwin

- **Using GCC with Cygwin** — Compiling C/C++ programs with the Cygwin GCC toolchain
- **Debugging Cygwin Programs** — Using GDB and other debugging tools
- **Building and Using DLLs** — Creating shared libraries under Cygwin
- **Defining Windows Resources** — Resource files and `windres`
- **Profiling Cygwin Programs** — Performance profiling with `gprof` and `ssp`

## Key Concepts for Batch Scripting

### Invoking Cygwin from Batch Files

```batch
REM Run a Cygwin command from a batch file
C:\cygwin64\bin\bash.exe -l -c "ls -la /home"

REM Convert a Windows path to POSIX for Cygwin
C:\cygwin64\bin\cygpath.exe -u "C:\Users\John Doe\Documents"

REM Convert a POSIX path back to Windows
C:\cygwin64\bin\cygpath.exe -w "/home/jdoe/project"
```

### Common Environment Variables

| Variable | Purpose |
|----------|---------|
| `CYGWIN` | Runtime options (e.g., `nodosfilewarning`, `winsymlinks:nativestrict`) |
| `HOME` | User home directory |
| `PATH` | Must include `/usr/local/bin:/usr/bin` for Cygwin tools |
| `SHELL` | Default shell (typically `/bin/bash`) |
| `TERM` | Terminal type for console applications |
