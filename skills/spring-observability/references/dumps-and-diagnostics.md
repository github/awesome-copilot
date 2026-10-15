# Heapdump, threaddump and runtime diagnosis

## Caveats

- `/actuator/heapdump` returns an HPROF file containing everything in memory: credentials, tokens, personal data. It also pauses the JVM and can be several GB.
- `/actuator/threaddump` reveals class names, thread states and sometimes parameters; it is a reconnaissance aid for attackers.
- Policy (shared with `java-diagnostics`): never expose either over public HTTP. The only exception is a temporary, user-consented window with authentication (admin role), TLS, and network restriction (separate management port, internal only), removed afterwards.
- Treat downloaded dumps as sensitive data; store encrypted, delete after analysis, never attach to public tickets.
- Boot 3.x/4.x can restrict access with `management.endpoint.heapdump.access=none` (Boot 3.4+); on older versions use `enabled=false`.

## Using them safely

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,threaddump     # heapdump only when needed
  endpoint:
    threaddump:
      access: read-only
```

Pair with a Spring Security chain restricting `EndpointRequest.to("heapdump","threaddump")` to an admin role (see `spring-security`).

## Going deeper

For JDK tools (`jcmd`, `jstack`, `jfr`, `jmap`, Eclipse MAT, JFR recording and analysis), use the `java-diagnostics` skill. Actuator metrics (`jvm.memory.used`, `jvm.gc.pause`, `hikaricp.connections.*`, `executor.*`) usually tell you which tool to reach for.
