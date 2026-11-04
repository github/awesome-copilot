---
name: java-refactoring-remove-parameter
description: 'Refactoring using Remove Parameter in Java Language'
---

# Refactoring Java Methods with Remove Parameter

## Role

You are an expert in refactoring Java methods.

Below are **2 examples** (with titles code before and code after refactoring) that represents **Remove Parameter**.

## Code Before Refactoring 1:
```java
public Backend selectBackendForGroupCommit(long tableId, ConnectContext context, boolean isCloud)
        throws LoadException, DdlException {
    if (!Env.getCurrentEnv().isMaster()) {
        try {
            long backendId = new MasterOpExecutor(context)
                    .getGroupCommitLoadBeId(tableId, context.getCloudCluster(), isCloud);
            return Env.getCurrentSystemInfo().getBackend(backendId);
        } catch (Exception e) {
            throw new LoadException(e.getMessage());
        }
    } else {
        return Env.getCurrentSystemInfo()
                .getBackend(selectBackendForGroupCommitInternal(tableId, context.getCloudCluster(), isCloud));
    }
}
```

## Code After Refactoring 1:
```java
public Backend selectBackendForGroupCommit(long tableId, ConnectContext context)
        throws LoadException, DdlException {
    if (!Env.getCurrentEnv().isMaster()) {
        try {
            long backendId = new MasterOpExecutor(context)
                    .getGroupCommitLoadBeId(tableId, context.getCloudCluster());
            return Env.getCurrentSystemInfo().getBackend(backendId);
        } catch (Exception e) {
            throw new LoadException(e.getMessage());
        }
    } else {
        return Env.getCurrentSystemInfo()
                .getBackend(selectBackendForGroupCommitInternal(tableId, context.getCloudCluster()));
    }
}
```

## Code Before Refactoring 2:
```java
NodeImpl( long id, long firstRel, long firstProp )
{
     this( id, false );
}
```

## Code After Refactoring 2:
```java
NodeImpl( long id)
{
     this( id, false );
}
```

## Safety Rules

- Behaviour-preserving only. Remove a parameter only if it is truly unused or derivable (field, constant, other parameter); never remove one that is read, even if "redundant" by convention.
- Baseline first: run the narrowest green test command (`./mvnw -q -Dtest=MyTest test`, `./gradlew test --tests MyTest`) or `./mvnw verify` / `./gradlew build`, and re-run after the change. If the baseline is red, stop and report.
- If the affected code has no tests, stop and report; propose characterization tests first. Never delete or weaken tests.
- Find every usage before changing a signature: use LSP find-references (`lsp-setup`/jdtls) and grep across all modules, including tests. Also check:
  - overrides and interface implementors (`@Override`, abstract/default methods, functional interfaces, method references): the whole hierarchy must change together;
  - reflection and string-based lookups (`getMethod`, `getDeclaredMethod`, `MethodHandle`, proxies), and Spring/CDI/Quarkus/Jakarta annotated methods (`@Bean`, `@EventListener`, `@Scheduled`, `@Inject`, `@Path`, `@Observes`, `@PostConstruct`), which a compiler will not flag;
  - constructors used by serialization/deserialization or JPA/Jackson (`@JsonCreator`, `@ConstructorBinding`, `readObject`), and `serialVersionUID` impact;
  - XML/properties/YAML configuration and AOP pointcut expressions naming the method;
  - public or protected API consumed by other modules or published artifacts.
- Ask the user before changing public/protected/published API (prefer deprecating and adding an overload) or touching generated code.
- One parameter per step (one commit each when the user asks for commits). Prefer the jdtls Change Method Signature refactoring when available; otherwise update the declaration and all callers together.
- Removing a parameter can make an overload collide with an existing signature or change overload resolution; check this. Evaluating the argument at the call site may have had side effects: keep them if they matter.

## Task

Apply **Remove Parameter** to improve readability, coupling and consistency.

1. Identify unused or derivable parameters.
2. Remove each from the declaration and from all callers, then compile and run the tests.
3. Add a one-line comment only where the removal is non-obvious; otherwise explain it in the report.
4. Report parameters removed, callers updated, the commands run and their results, and anything left unverified (e.g. reflective or external callers).

## Code to be Refactored:

Now, assess all methods with unused parameters and refactor them using **Remove Parameter**
