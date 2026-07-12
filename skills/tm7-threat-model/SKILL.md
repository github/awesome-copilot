---
name: tm7-threat-model
description: 'Creates valid Microsoft Threat Modeling Tool (.tm7) files compatible with the Microsoft Threat Modeling Tool v7.3+. Use this skill whenever asked to create, generate, or modify a .tm7 threat model file, or when performing STRIDE threat modeling that should output a .tm7 file that opens cleanly in the Microsoft Threat Modeling Tool.'
---

# Microsoft Threat Modeling Tool (.tm7) Generator

You generate **valid `.tm7` files** for the Microsoft Threat Modeling Tool (v7.3+). A `.tm7`
file is **not** generic XML — it is a **WCF `DataContractSerializer`** document with an exact
namespace and element structure. If the structure is wrong, the tool refuses to open the file
with:

> "File is not an actual threat model or the threat model may be corrupted."

Your job is to translate a described system (components, data stores, external actors, data
flows, trust boundaries) into a diagram plus STRIDE threats, serialized in the exact `.tm7`
format described below.

## Workflow

When asked to produce a `.tm7` file:

1. **Model the system.** Identify the elements:
   - **Processes** (web apps, services, functions) → `StencilEllipse`, `GE.P`
   - **Data stores** (databases, caches, queues, blobs) → `StencilParallelLines`, `GE.DS`
   - **External interactors** (users, browsers, third-party systems) → `StencilRectangle`, `GE.EI`
   - **Trust boundaries** → `BorderBoundary`, `GE.TB`
   - **Data flows** connecting the above → `Connector`, `GE.DF`
2. **Assign a unique lowercase UUID** (e.g. `148ade68-5c80-40f3-8e1f-4e2cabdb5991`) to every
   stencil and every flow. Never use human-readable ids like `users-browser`.
3. **Lay out coordinates** (`Left`/`Top`/`Width`/`Height`) so stencils don't overlap.
4. **Generate STRIDE threats** per interaction and place them in `<ThreatInstances>`.
5. **Serialize** using the structure in this guide, mirroring `example-minimal.tm7`.
6. **Validate** against the "Common Mistakes" checklist before returning the file.
7. **Write the file with no XML declaration and no pretty-print indentation** (a single
   continuous XML stream is what the serializer emits).

Always open [`example-minimal.tm7`](./example-minimal.tm7) first and adapt it — reuse its exact
serialization skeleton and only change stencil types, names, coordinates, flows, and threats.

## CRITICAL: Serialization format

TM7 files use **WCF `DataContractSerializer` XML**, not standard XML.

The file MUST start with this exact root element — **no `<?xml?>` declaration**:

```xml
<ThreatModel xmlns="http://schemas.datacontract.org/2004/07/ThreatModeling.Model" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
```

**NEVER use:**
- `<?xml version="1.0" encoding="utf-8"?>` — causes deserialization failure.
- `xmlns:xsi` / `xmlns:xsd` — these are standard XML namespaces, not DataContract namespaces.
- Custom elements such as `<MetaInformation>`, `<SecurityGaps>`, `<Mitigations>`,
  `<Assumptions>` — they do not exist in the TM7 schema.

## Required namespace prefixes

| Prefix | URI | Used for |
|--------|-----|----------|
| (default) | `http://schemas.datacontract.org/2004/07/ThreatModeling.Model` | Root `ThreatModel` |
| `xmlns:i` | `http://www.w3.org/2001/XMLSchema-instance` | Type attributes |
| `xmlns:z` | `http://schemas.microsoft.com/2003/10/Serialization/` | Reference ids (`z:Id`) |
| `xmlns:a` | `http://schemas.microsoft.com/2003/10/Serialization/Arrays` | Arrays / collections |
| `xmlns:b` | `http://schemas.datacontract.org/2004/07/ThreatModeling.KnowledgeBase` | Stencil properties |
| `xmlns:c` | `http://www.w3.org/2001/XMLSchema` | Primitive type values |

## File structure (correct order)

```xml
<ThreatModel xmlns="..." xmlns:i="...">
  <DrawingSurfaceList>
    <DrawingSurfaceModel z:Id="i1" xmlns:z="...">
      <GenericTypeId xmlns="...Abstracts">DRAWINGSURFACE</GenericTypeId>
      <Guid xmlns="...Abstracts">{guid}</Guid>
      <Properties xmlns="...Abstracts" xmlns:a="...Arrays">...</Properties>
      <TypeId xmlns="...Abstracts">DRAWINGSURFACE</TypeId>
      <Borders xmlns:a="...Arrays">
        <!-- Stencil elements: processes, data stores, external entities, boundaries -->
      </Borders>
      <Lines xmlns:a="...Arrays">
        <!-- Data flow lines connecting stencils -->
      </Lines>
      <Notes xmlns:a="...Arrays"/>
    </DrawingSurfaceModel>
  </DrawingSurfaceList>
  <ThreatInstances>
    <!-- Threat entries -->
  </ThreatInstances>
  <ThreatMetaData>
    <!-- Metadata for threat categories and properties -->
  </ThreatMetaData>
</ThreatModel>
```

## Stencil elements

Each stencil in `<Borders>` is wrapped in `<a:KeyValueOfguidanyType>`:

```xml
<a:KeyValueOfguidanyType>
  <a:Key>{guid}</a:Key>
  <a:Value z:Id="i2" i:type="StencilEllipse">
    <GenericTypeId xmlns="...Abstracts">GE.P</GenericTypeId>
    <Guid xmlns="...Abstracts">{guid}</Guid>
    <Properties xmlns="...Abstracts">
      <a:anyType i:type="b:HeaderDisplayAttribute" xmlns:b="...KnowledgeBase">
        <b:DisplayName>Web Application</b:DisplayName>
        <b:Name/>
        <b:Value i:nil="true"/>
      </a:anyType>
      <a:anyType i:type="b:StringDisplayAttribute" xmlns:b="...KnowledgeBase">
        <b:DisplayName>Name</b:DisplayName>
        <b:Name/>
        <b:Value i:type="c:string" xmlns:c="http://www.w3.org/2001/XMLSchema">My Component</b:Value>
      </a:anyType>
      <!-- Out Of Scope, Reason, configurable attributes -->
    </Properties>
    <TypeId xmlns="...Abstracts">SE.P.TMCore.WebApp</TypeId>
    <Height xmlns="...Abstracts">100</Height>
    <Left xmlns="...Abstracts">400</Left>
    <StrokeDashArray i:nil="true" xmlns="...Abstracts"/>
    <StrokeThickness xmlns="...Abstracts">1</StrokeThickness>
    <Top xmlns="...Abstracts">200</Top>
    <Width xmlns="...Abstracts">100</Width>
  </a:Value>
</a:KeyValueOfguidanyType>
```

### Stencil shape types

| Shape | `i:type` | `GenericTypeId` | Description |
|-------|----------|-----------------|-------------|
| Process (circle) | `StencilEllipse` | `GE.P` | Processes, web apps, services |
| Data store (parallel lines) | `StencilParallelLines` | `GE.DS` | Databases, storage, caches |
| External interactor (rectangle) | `StencilRectangle` | `GE.EI` | Users, external systems |
| Trust boundary | `BorderBoundary` | `GE.TB` | Trust boundaries |

### Common `TypeId` values (SDL TM knowledge base)

| `TypeId` | Component |
|----------|-----------|
| `SE.P.TMCore.WebApp` | Web Application |
| `SE.P.TMCore.AzureAppServiceWebApp` | Azure App Service Web App |
| `SE.P.TMCore.AzureEventHub` | Azure Event Hub |
| `SE.P.TMCore.DynamicsCRM` | Dynamics CRM |
| `SE.DS.TMCore.SQL` | SQL Database |
| `SE.DS.TMCore.AzureCosmosDB` | Azure Cosmos DB |
| `SE.EI.TMCore.Browser` | Browser |
| `SE.EI.TMCore.HumanUser` | Human User |

## Data flow lines

Lines in `<Lines>` also use `<a:KeyValueOfguidanyType>`, with `i:type="Connector"`:

```xml
<a:KeyValueOfguidanyType>
  <a:Key>{line-guid}</a:Key>
  <a:Value z:Id="i10" i:type="Connector">
    <GenericTypeId xmlns="...Abstracts">GE.DF</GenericTypeId>
    <Guid xmlns="...Abstracts">{line-guid}</Guid>
    <Properties xmlns="...Abstracts">...</Properties>
    <TypeId xmlns="...Abstracts">SE.DF.TMCore.GenericDataFlow</TypeId>
    <HandleX xmlns="...Abstracts">0</HandleX>
    <HandleY xmlns="...Abstracts">0</HandleY>
    <SourceGuid xmlns="...Abstracts">{source-stencil-guid}</SourceGuid>
    <SourceX xmlns="...Abstracts">0</SourceX>
    <SourceY xmlns="...Abstracts">0</SourceY>
    <TargetGuid xmlns="...Abstracts">{target-stencil-guid}</TargetGuid>
    <TargetX xmlns="...Abstracts">0</TargetX>
    <TargetY xmlns="...Abstracts">0</TargetY>
  </a:Value>
</a:KeyValueOfguidanyType>
```

## Property attribute types

Properties use typed `<a:anyType>` elements:

| `i:type` | Purpose | Value |
|----------|---------|-------|
| `b:HeaderDisplayAttribute` | Section header | `i:nil="true"` |
| `b:StringDisplayAttribute` | Text value (Name, Reason) | `i:type="c:string"` |
| `b:BooleanDisplayAttribute` | Boolean (Out Of Scope) | `i:type="c:boolean"` |
| `b:ListDisplayAttribute` | Dropdown list | Has `<b:SelectedIndex>` |

## Threat instances

Threats go in `<ThreatInstances>` using `<KeyValueOfstringThreatpc_P0_PhBB>`:

```xml
<ThreatInstances>
  <KeyValueOfstringThreatpc_P0_PhBB xmlns:a="...Arrays">
    <a:Key>{threat-guid}</a:Key>
    <a:Value>
      <ChangedBy/>
      <Id>{threat-guid}</Id>
      <Message>Description of the threat</Message>
      <ModifiedAt>2025-01-01T00:00:00</ModifiedAt>
      <Properties xmlns:b="...Arrays">
        <b:KeyValueOfstringstring>
          <b:Key>Title</b:Key>
          <b:Value>Threat Title</b:Value>
        </b:KeyValueOfstringstring>
        <b:KeyValueOfstringstring>
          <b:Key>UserThreatCategory</b:Key>
          <b:Value>Spoofing</b:Value>
        </b:KeyValueOfstringstring>
        <b:KeyValueOfstringstring>
          <b:Key>StateInformation</b:Key>
          <b:Value>Not Started</b:Value>
        </b:KeyValueOfstringstring>
        <b:KeyValueOfstringstring>
          <b:Key>Priority</b:Key>
          <b:Value>High</b:Value>
        </b:KeyValueOfstringstring>
        <b:KeyValueOfstringstring>
          <b:Key>InteractionString</b:Key>
          <b:Value>Source &#8594; Target</b:Value>
        </b:KeyValueOfstringstring>
      </Properties>
      <SourceGuid>{source-stencil-guid}</SourceGuid>
      <State>AutoGenerated</State>
      <TargetGuid>{target-stencil-guid}</TargetGuid>
    </a:Value>
  </KeyValueOfstringThreatpc_P0_PhBB>
</ThreatInstances>
```

Use the standard STRIDE categories for `UserThreatCategory`: **S**poofing, **T**ampering,
**R**epudiation, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege.

## Common mistakes that break TM7 files

1. **Adding an `<?xml version="1.0"?>` declaration** — `DataContractSerializer` does not emit one.
2. **Using `xmlns:xsi` / `xmlns:xsd`** instead of DataContract namespaces.
3. **Using simple element names** like `<Border>`, `<Line>`, `<Stencil>` — you must use the
   DataContract wrapper types such as `<a:KeyValueOfguidanyType>`.
4. **Inventing custom elements** like `<MetaInformation>`, `<SecurityGaps>`, `<Mitigations>`,
   `<Assumptions>` — these do not exist in the schema.
5. **Using human-readable GUIDs** like `users-browser` instead of real UUIDs
   (e.g. `148ade68-5c80-40f3-8e1f-4e2cabdb5991`).
6. **Missing `z:Id` reference attributes** on serialized objects.
7. **Missing the `xmlns` on child elements** — each `GenericTypeId`, `Guid`, `Properties`,
   `TypeId`, etc. must carry its own
   `xmlns="http://schemas.datacontract.org/2004/07/ThreatModeling.Model.Abstracts"`.
8. **Pretty-printing with indentation** — the correct output is a single continuous XML stream
   with no added newlines or indentation inside the content.

## Reference asset

Always use [`example-minimal.tm7`](./example-minimal.tm7) in this skill's directory as the
structural reference. Adapt the stencil types, names, properties, coordinates, data flows, and
threats to the user's architecture, but **never** change the serialization format or namespace
structure. After generating, mentally diff your output's skeleton against the example to confirm
every namespace and wrapper element matches.
