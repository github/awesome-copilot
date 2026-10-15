# Reachability metadata and the tracing agent

Native Image only includes what it can see statically. Anything reached dynamically (reflection, resources, JNI, dynamic proxies, serialization) must be described by *reachability metadata*.

## Where metadata lives

`src/main/resources/META-INF/native-image/<groupId>/<artifactId>/` in your project (the `<groupId>/<artifactId>` subfolder avoids clashes between jars). Two formats exist:

- Legacy per-feature files: `reflect-config.json`, `resource-config.json`, `jni-config.json`, `proxy-config.json`, `serialization-config.json`.
- Unified `reachability-metadata.json` (introduced in GraalVM for JDK 23 and used by newer releases). The unified format is preferred for new metadata and supports newer capabilities, but Native Image still discovers legacy files under `META-INF/native-image`, so do not discard valid existing configuration. Check the GraalVM documentation for your version and prefer regenerating metadata with the tracing agent of the toolchain you use.

Libraries often publish metadata themselves, and the community [GraalVM reachability metadata repository](https://github.com/oracle/graalvm-reachability-metadata) covers many popular ones. The Native Build Tools plugin pulls it automatically when enabled (`metadataRepository` in Gradle, default for recent plugin versions in Maven). Upgrade the library before hand-writing metadata.

## Tracing agent

Run the app on the JVM with the agent while exercising every code path, and the agent writes the metadata.

Direct:

```sh
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image/<groupId>/<artifactId> -jar target/app.jar
```

Via the build tool (preferred):

```sh
./mvnw -Pnative -Dagent=true test          # agent during JVM tests, Maven
./mvnw -Pnative -Dagent=true exec:exec@java-agent   # agent for a manual run, if configured
./gradlew -Pagent test                      # agent during tests, Gradle
./gradlew -Pagent run
./gradlew metadataCopy --task test --dir src/main/resources/META-INF/native-image/<groupId>/<artifactId>
```

See the Native Build Tools "Agent Support" page for the exact setup for your plugin version.

Tips:

- Exercise every endpoint, serialization path and resource load; unexercised paths are not captured.
- Review the generated files and delete noise (test-only classes).
- Merge repeated runs with `native-image-configure` or the agent's merge mode (`config-merge-dir=`).
- Re-run the agent after changing dependencies.

## Hand-written examples (legacy format)

Reflection (`reflect-config.json`):

```json
[
  {
    "name": "com.example.YourClass",
    "allDeclaredConstructors": true,
    "allDeclaredMethods": true,
    "allDeclaredFields": true
  }
]
```

Resources (`resource-config.json`):

```json
{
  "resources": {
    "includes": [
      {"pattern": "\\Qapplication.properties\\E"},
      {"pattern": ".*\\.ya?ml"}
    ]
  }
}
```

JNI (`jni-config.json`):

```json
[
  {
    "name": "com.example.NativeClass",
    "methods": [
      {"name": "nativeMethod", "parameterTypes": ["java.lang.String"]}
    ]
  }
]
```

Dynamic proxies (`proxy-config.json`):

```json
[
  ["com.example.Interface1", "com.example.Interface2"]
]
```

Frameworks offer typed alternatives (Spring `RuntimeHints`, Quarkus `@RegisterForReflection`, Micronaut `@Introspected`); prefer them to raw JSON in framework projects.
