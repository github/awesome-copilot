# jps and jcmd basics (Tier 1 for the safe commands; see the sensitive-output warning)

```bash
jps -l                       # list JVMs with PID and main class/JAR only (no arguments)
jcmd <pid> help              # commands supported by that JVM
jcmd <pid> VM.version
jcmd <pid> VM.flags          # effective -XX flags (no -D properties)
jcmd <pid> VM.uptime
```

Do NOT run these by default: they can print credentials, tokens, connection strings or other secrets passed as `-D` properties or program arguments, and the output lands in the transcript:

- `jps -v`, `jps -lv`, `jps -m`, and bare `jcmd` (without arguments it also prints each JVM's main class and arguments)
- `jcmd <pid> VM.system_properties`, `jcmd <pid> VM.command_line`, `jinfo`, `ps aux` / `ps -ef` / `/proc/<pid>/cmdline` for a Java process

They need user consent first (explicit tier: Tier 3, sensitive output). Prefer reading only the specific property you need (for example `jcmd <pid> VM.system_properties | grep '^java.version'`), and redact secret values before showing or sharing any output.

- Run as the same OS user as the target JVM, on the same host (or inside the same container). Different users/containers fail with "Unable to open socket file" or "process not found".
- `jcmd` is preferred over `jstack`/`jmap`/`jinfo`, which are older single-purpose tools.
- `-XX:+DisableAttachMechanism` blocks attach; `-XX:+StartAttachListener` forces the listener to start.
- Tools must match (or be newer than) the target JDK major version when possible.

## Crash or hang

- A crash writes `hs_err_pid<pid>.log` (path set by `-XX:ErrorFile`). Read the "Problematic frame" and thread sections first.
- `jhsdb` (Tier 3) attaches to a hung process or core file: `jhsdb jstack --pid <pid>` or `jhsdb jstack --exe <java> --core <core>`. It suspends the process while attached and requires matching JDK; core files contain heap data, so treat them like heap dumps.
