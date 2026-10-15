---
name: java-refactoring-extract-method
description: 'Refactoring using Extract Methods in Java Language'
---

# Refactoring Java Methods with Extract Method

## Role

You are an expert in refactoring Java methods.

Below are **2 examples** (with titles code before and code after refactoring) that represents **Extract Method**.

## Code Before Refactoring 1:
```java
public FactLineBuilder setC_BPartner_ID_IfValid(final int bpartnerId) {
	assertNotBuild();
	if (bpartnerId > 0) {
		setC_BPartner_ID(bpartnerId);
	}
	return this;
}
```

## Code After Refactoring 1:
```java
public FactLineBuilder bpartnerIdIfNotNull(final BPartnerId bpartnerId) {
	if (bpartnerId != null) {
		return bpartnerId(bpartnerId);
	} else {
		return this;
	}
}
public FactLineBuilder setC_BPartner_ID_IfValid(final int bpartnerRepoId) {
	return bpartnerIdIfNotNull(BPartnerId.ofRepoIdOrNull(bpartnerRepoId));
}
```

## Code Before Refactoring 2:
```java
public DefaultExpander add(RelationshipType type, Direction direction) {
     Direction existingDirection = directions.get(type.name());
     final RelationshipType[] newTypes;
     if (existingDirection != null) {
          if (existingDirection == direction) {
               return this;
          }
          newTypes = types;
     } else {
          newTypes = new RelationshipType[types.length + 1];
          System.arraycopy(types, 0, newTypes, 0, types.length);
          newTypes[types.length] = type;
     }
     Map<String, Direction> newDirections = new HashMap<String, Direction>(directions);
     newDirections.put(type.name(), direction);
     return new DefaultExpander(newTypes, newDirections);
}
```

## Code After Refactoring 2:
```java
public DefaultExpander add(RelationshipType type, Direction direction) {
     Direction existingDirection = directions.get(type.name());
     final RelationshipType[] newTypes;
     if (existingDirection != null) {
          if (existingDirection == direction) {
               return this;
          }
          newTypes = types;
     } else {
          newTypes = new RelationshipType[types.length + 1];
          System.arraycopy(types, 0, newTypes, 0, types.length);
          newTypes[types.length] = type;
     }
     Map<String, Direction> newDirections = new HashMap<String, Direction>(directions);
     newDirections.put(type.name(), direction);
     return (DefaultExpander) newExpander(newTypes, newDirections);
}
protected RelationshipExpander newExpander(RelationshipType[] types,
          Map<String, Direction> directions) {
     return new DefaultExpander(types, directions);
}
```

## Safety Rules

- Behaviour-preserving only: no functional change, no removed logic, no changed exceptions, side-effect order or visibility of the original method.
- Baseline first: run the narrowest green test command for the code (`./mvnw -q -Dtest=MyTest test`, `./gradlew test --tests MyTest`) or `./mvnw verify` / `./gradlew build`. Re-run it after every extraction. If the baseline is red, stop and report.
- If the code has no tests, stop and report; propose characterization tests first. Never delete or weaken tests.
- One extraction per step (one commit each when the user asks for commits) so each is reviewable and revertible.
- Prefer the IDE refactoring: use an available IDE tool that exposes Extract Method (it handles parameters and return values safely). The Copilot CLI `lsp` tool offers navigation and rename but no code actions, so configuring jdtls through `lsp-setup` does not provide it; otherwise extract by hand and validate with the compiler and tests.
- Extracted methods are `private` by default. Do not add public/protected methods, change the existing signature, or touch generated code (`target/`, `build/generated`, `@Generated`) without asking the user.
- Watch for: local variables modified in the block (return a value or introduce a small result type), multiple results, checked exceptions, `return`/`break`/`continue` inside the block, and `synchronized`/transaction-annotated methods (extracted `private` methods called on `this` bypass Spring proxies and AOP).

## Task

Apply **Extract Method** to improve readability, testability, cohesion and consistency.

1. Identify candidate methods (rough guide: > 15 lines, > 10 statements or cyclomatic complexity > 10) and cohesive blocks inside them.
2. Extract each block into a descriptively named method, following the existing code style and the project's Java level (check `maven.compiler.release` / toolchain; do not use newer syntax).
3. Add a one-line comment above each new method only if its name does not already convey its purpose.
4. Compile and run the tests; report the methods changed, the commands run and their results.

Output complete, compilable code for each changed method.

## Code to be Refactored:

Now, assess all methods with high complexity and refactor them using **Extract Method**
