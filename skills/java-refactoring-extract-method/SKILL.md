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

## Task

Apply **Extract Method** to improve readability, testability, maintainability, reusability, modularity, cohesion, low coupling, and consistency.

Always return a complete and compilable method (Java 17).

Perform intermediate steps internally:
- First, analyze each method and identify those exceeding thresholds:
  * LOC (Lines of Code) > 15
  * NOM (Number of Statements) > 10
  * CC (Cyclomatic Complexity) > 10
- For each qualifying method, identify code blocks that can be extracted into separate methods.
- Extract at least one new method with a descriptive name.
- Output only the refactored code inside a single ```java``` block.
- Do not remove any functionality from the original method.
- Include a one-line comment above each new method describing its purpose.

## Code to be Refactored:

Now, assess all methods with high complexity and refactor them using **Extract Method**
