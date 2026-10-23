# In-Process Runtime

Load the native Copilot runtime library into the JVM process instead of spawning
a separate runtime process.

> **Runnable example:** [recipe/InProcessRuntime.java](recipe/InProcessRuntime.java)
>
> ```bash
> # Linux x64 (glibc); choose the classifier for your platform below.
> jbang --deps com.github:copilot-sdk-java-runtime:1.0.21:linux-x64 recipe/InProcessRuntime.java
> ```

## Example scenario

By default, `CopilotClient` spawns a child process and communicates over stdio or TCP.
Hosts that need to avoid a separate runtime process can load the native Copilot
runtime library into the JVM process.

In-process hosting only removes the separate Copilot runtime process. Enabled
built-in tools such as shell execution, configured local MCP servers, and
application-defined tool handlers may still start child processes according to
their implementation, configuration, permissions, and sandbox policy. Hooks and
extensions may also start subprocesses. Model requests still require authentication
and network access; in-process transport is not a sandbox.

> **Demo permissions:** These examples use `PermissionHandler.APPROVE_ALL` only
> for isolated, trusted demonstrations. Replace it with a restrictive permission
> handler before using untrusted prompts or workspaces.

## Prerequisites

Use Java 17 or later and SDK 1.0.21. JDK 25 or later is recommended, not required
for in-process operation. In addition to the SDK, explicitly declare JNA and a
platform-specific runtime-classifier JAR with the same version as the SDK.
The example is tested with JNA 5.19.1; neither JNA nor the native library is part
of the JDK.

```xml
<dependencies>
    <dependency>
        <groupId>com.github</groupId>
        <artifactId>copilot-sdk-java</artifactId>
        <version>1.0.21</version>
    </dependency>
    <dependency>
        <groupId>com.github</groupId>
        <artifactId>copilot-sdk-java-runtime</artifactId>
        <version>1.0.21</version>
        <classifier>linux-x64</classifier>
    </dependency>
    <dependency>
        <groupId>net.java.dev.jna</groupId>
        <artifactId>jna</artifactId>
        <version>5.19.1</version>
    </dependency>
</dependencies>
```

Choose `linux-x64` or `linux-arm64` for glibc Linux, `linuxmusl-x64` or
`linuxmusl-arm64` for musl Linux, `win32-x64` or `win32-arm64` for Windows, and
`darwin-x64` or `darwin-arm64` for macOS. The glibc Linux classifiers require
glibc 2.28 or newer. The musl classifiers dynamically link musl and are intended
for compatible musl-based distributions such as Alpine Linux. Only x64 and ARM64
are supported.

JBang resolves the SDK and JNA from the recipe's `//DEPS` directives; pass the
runtime-classifier JAR using `--deps` as shown above. For example, on Apple Silicon:

```bash
jbang --deps com.github:copilot-sdk-java-runtime:1.0.21:darwin-arm64 recipe/InProcessRuntime.java
```

The in-process API is available in Java SDK 1.0.21, with runtime classifiers
published for the platforms listed above. Artifact availability does not mean
this recipe was tested on every target. This cookbook's native smoke test was
run on macOS arm64, without model requests or MCP/browser end-to-end execution.
Validate startup, model requests, and shutdown on each deployment platform.

## Using the in-process connection

```java
import com.github.copilot.AllowCopilotExperimental;
import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.*;
import java.util.concurrent.TimeUnit;

@AllowCopilotExperimental
public class InProcessExample {
    public static void main(String[] args) throws Exception {
        var options = new CopilotClientOptions()
            .setConnection(RuntimeConnection.forInProcess());

        try (var client = new CopilotClient(options)) {
            client.start().get(30, TimeUnit.SECONDS);

            try (var session = client.createSession(new SessionConfig()
                    .setModel("auto")
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL))
                    .get(30, TimeUnit.SECONDS)) {
                var response = session.sendAndWait(new MessageOptions()
                        .setPrompt("Hello from the in-process runtime!"))
                    .get(60, TimeUnit.SECONDS);
                System.out.println(response.getData().content());
            }

            client.stop().get(30, TimeUnit.SECONDS);
        }
    }
}
```

The connection API is experimental. `@AllowCopilotExperimental` opts the class
into the declaration-level checks performed by the SDK's annotation processor;
expression-only uses inside method bodies are not inspected. The processor must
be enabled by the compiler or build tool. Projects can instead pass
`-Acopilot.experimental.allowed=true` to opt in every source processed in that
compiler invocation. See the [version-pinned experimental API guidance](https://github.com/github/copilot-sdk/blob/java/v1.0.21/java/README.md#using-experimental-apis)
for build-tool setup.

In-process mode does not introduce separate Java APIs for sessions, events,
tools, permissions, or hooks. Shared APIs and transport plumbing do not establish
full end-to-end support in this experimental transport: verify the features you
depend on against the selected SDK and native-library version. Native worker
threads, callback lifetimes, failure isolation, and shutdown differ from
subprocess transport. Extension/plugin tools may also require an extension
launch provider and external runtimes.

## How it works

The SDK uses JNA to load the `runtime.node` native library and exchange JSON-RPC
frames and callbacks over its C ABI rather than a child-process transport.
The runtime-classifier JAR contains both the `copilot-runtime` (`copilot-runtime.exe`
on Windows) subprocess wrapper and the adjacent `runtime.node` native library.
In-process transport loads the library; subprocess transport launches the wrapper.
Adding the classifier or JNA to the classpath does not change transport selection.

Files extracted from a runtime-classifier JAR are cached by SDK version, native
package version, and platform classifier. Explicitly configured or discovered
filesystem libraries can be loaded directly instead.

The recipe grants native access with `//JAVA_OPTIONS --enable-native-access=ALL-UNNAMED`
because JBang places dependencies on the classpath. JNA performs the restricted
JNI/native operations, not the SDK directly. For a regular classpath application,
pass `--enable-native-access=ALL-UNNAMED` to `java`; for a module-path launch, use
`--enable-native-access=com.sun.jna`. JNA recommends its `jna-jpms` artifact for a
fully modular setup.

On JDK 17-23 this flag is unnecessary for JNA/JNI loading. On JDK 24-25, the
default illegal-native-access mode warns, while `--illegal-native-access=deny`
requires the grant. A future JDK is expected to make denial the default.
Prefer JDK 25 over JDK 24 for the newer virtual-thread/native-call pinning behavior.

The explicit `RuntimeConnection.forInProcess()` configuration is sufficient for
this recipe. Process-global transport overrides and their precedence belong in
the [SDK reference](https://github.com/github/copilot-sdk/blob/java/v1.0.21/java/sdk/src/main/java/com/github/copilot/CopilotClient.java).

To check native startup and an in-process ping round trip over the FFI transport
without authenticating or making a model request, add `--ping`:

```bash
jbang --deps com.github:copilot-sdk-java-runtime:1.0.21:linux-x64 recipe/InProcessRuntime.java --ping
```

Ping performs no account authentication, model discovery, or network request.
The recipe explicitly selects the in-process connection, so successful startup
and ping demonstrate native-library loading and a JSON-RPC request/response over
FFI, not a connection through another transport. It then calls
`client.stop().get(30, TimeUnit.SECONDS)` to exercise the normal shutdown path.
Neither completion of `stop()` nor try-with-resources proves that every native
teardown phase succeeded: some FFI cleanup failures are logged or retried
asynchronously, and `close()` suppresses cleanup failures.

## Limitations

- **Shared library, distinct hosts**: clients share one loaded native library and
  process-global infrastructure, including native workers. Each client creates
  its own runtime host/server engine and FFI connection. Environment and
  operating-system working directory are captured separately when each host
  starts; later process changes do not update existing hosts or their defaults.
- **Rejected process options**: `setEnvironment`, `setTelemetry`, `setCwd`, and
  `setCliArgs` on `CopilotClientOptions` are rejected synchronously by the client
  constructor in in-process mode, not by the setters or only at startup.
  CLI-path, URL, TCP, and non-stdio options also conflict with an explicit
  in-process connection. Configure telemetry through the host process environment;
  it cannot vary per client.
- **One native-library path per JVM**: clients can reuse the same library, but
  the load guard compares normalized absolute paths, not build metadata or
  contents. Even an identical library at a different path is rejected. The SDK
  intentionally retains the library for the JVM's lifetime because native workers
  may outlive clients; no unload operation is exposed.
- **Platform dependencies**: the classifier must match the OS and architecture,
  and JNA must be available. Missing or mismatched libraries fail startup.
- **Session and client closure**: session close retires Java-side resources and
  detaches that connection; the last detach destroys the in-memory session but
  preserves resumable data. Client close attempts to close its sessions, shut
  down its own runtime host, and close its FFI connection/host. It does not unload
  the library or shut down other clients' hosts.

## Best practices

1. **Test each deployment platform**: verify startup, model turns, and shutdown
   on every OS and architecture you support.
2. **Prefer the default transport** unless avoiding the SDK's child process is a requirement.
3. **Close resources**: use nested try-with-resources for the session and client.
   Closing the connection does not unload the native library.
4. **Configure process-wide values early**: set the environment and working directory
   before starting the JVM, rather than assuming per-client overrides work.
