# Reachability metadata and the tracing agent

Native Image only includes what it can see statically. Anything reached dynamically (reflection, resources, JNI, dynamic proxies, serialization) must be described by *reachability metadata*.

## Where metadata lives

`src/main/resources/META-INF/native-image/<groupId>/<artifactId>/` in your project (the `<groupId>/<artifactId>` subfolder avoids clashes between jars). Two formats exist:

- Legacy per-feature files: `reflect-config.json`, `resource-config.json`, `jni-config.json`, `proxy-config.json`, `serialization-config.json`.
- Unified `reachability-metadata.json` (introduced in GraalVM for JDK 23 and used by newer releases). The unified format is preferred for new metadata and supports newer capabilities, but Native Image still discovers legacy files under `META-INF/native-image`, so do not discard valid existing configuration. Check the GraalVM documentation for your version and prefer regenerating metadata with the tracing agent of the toolchain you use.

Libraries often publish metadata themselves, and the community [GraalVM reachability metadata repository](https://github.com/oracle/graalvm-reachability-metadata) covers many popular ones. The Native Build Tools plugin pulls it automatically when enabled (`metadataRepository` in Gradle, default for recent plugin versions in Maven). Check existing metadata first; if an upgrade would help, propose it for user approval and rerun the JVM baseline after the change. Otherwise collect or write metadata for the current version.

## Tracing agent

Run the app on the JVM with the agent while exercising every code path, and the agent writes the metadata.

Direct:

```sh
java -agentlib:native-image-agent=config-output-dir=src/main/resources/META-INF/native-image/<groupId>/<artifactId> -jar target/app.jar
```

Via the build tool (preferred):

```sh
./mvnw -Pnative -Dagent=true -DskipNativeTests=true test # collect test-stage metadata on the JVM
./gradlew -Pagent test                      # agent during tests, Gradle
./gradlew -Pagent run
./gradlew metadataCopy --task test --dir src/main/resources/META-INF/native-image/<groupId>/<artifactId>
```

The Maven example assumes the plain-Java `native` profile in [build-tools.md](build-tools.md), which also binds `native:test` to the test phase. Check the actual project's profile bindings: Spring Boot uses a separate `nativeTest` profile (see [spring-boot.md](spring-boot.md)). Use `-DskipNativeTests=true` for metadata collection so JVM tests still execute with the tracing agent, without compiling or running native test binaries. Do not use `-DskipTests` or `-Dmaven.test.skip`: those skip the JVM tests needed to exercise the agent.

The Maven agent writes to `target/native/agent-output/{test,main}`. Review the files for noise, then configure [metadata copying](https://graalvm.github.io/native-build-tools/latest/maven-plugin.html#metadata-copy) inside the Native Build Tools plugin so the approved output survives `clean` and is included in the native build:

```xml
<configuration>
  <!-- Keep any existing Native Build Tools configuration here. -->
  <agent>
    <metadataCopy>
      <!-- For the JVM test command above, skip the main stage that was not run. -->
      <disabledStages>
        <stage>main</stage>
      </disabledStages>
      <merge>true</merge>
      <outputDirectory>${project.basedir}/src/main/resources/META-INF/native-image/${project.groupId}/${project.artifactId}</outputDirectory>
    </metadataCopy>
  </agent>
</configuration>
```

After reviewing the test-stage output, persist it with:

```sh
./mvnw -Pnative -Dagent=true native:metadata-copy
```

If you collected only the application (`main`) stage, disable `test` instead; configure `disabledStages` for every stage you did not collect. `merge=true` merges with existing metadata when the destination has a complete metadata set (unified `reachability-metadata.json` or all four legacy files); otherwise merge or reconcile existing partial files manually before copying, so valid metadata is not discarded. Run native tests afterwards with the project's appropriate profile and without `-DskipNativeTests=true`; the metadata-collection run is not evidence that native tests passed.

For a manual application run, configure the `exec-maven-plugin` execution described in the Native Build Tools [Maven agent guide](https://graalvm.github.io/native-build-tools/latest/maven-plugin.html#agent-support-running-application), then run it with:

```sh
./mvnw -Pnative -Dagent=true -DskipTests -DskipNativeBuild=true package exec:exec@java-agent
```

Copy the collected `main` stage as above, disabling the uncollected `test` stage.

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
