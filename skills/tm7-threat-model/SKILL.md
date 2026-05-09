---
name: tm7-threat-model
description: Creates valid Microsoft Threat Modeling Tool (.tm7) files compatible with Microsoft Threat Modeling Tool v7.3+. Use this skill whenever asked to create, generate, or modify a .tm7 threat model file, or when performing STRIDE threat modeling that should output a .tm7 file.
---

# Microsoft Threat Modeling Tool (.tm7) File Format Guide

## CRITICAL: Serialization Format

TM7 files use **WCF DataContractSerializer XML format**, NOT standard XML. The Microsoft Threat Modeling Tool (v7.3+) **cannot deserialize** files that use generic XML structure. If the format is wrong, the tool will show:

> "File is not an actual threat model or the threat model may be corrupted."

## Required Root Element and Namespaces

The file MUST start with this exact root element (NO XML declaration, NO `<?xml?>` header):

```xml
<ThreatModel xmlns="http://schemas.datacontract.org/2004/07/ThreatModeling.Model" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
```

**NEVER use:**
- `<?xml version="1.0" encoding="utf-8"?>` — this causes deserialization failure
- `xmlns:xsi` or `xmlns:xsd` — these are standard XML namespaces, NOT DataContract namespaces
- Custom `<MetaInformation>`, `<SecurityGaps>`, `<Mitigations>` — these elements do NOT exist in the TM7 schema

## Required Namespace Prefixes

All elements MUST use proper DataContract serialization namespaces:

| Prefix | URI | Used For |
|--------|-----|----------|
| (default) | `http://schemas.datacontract.org/2004/07/ThreatModeling.Model` | Root ThreatModel |
| `xmlns:i` | `http://www.w3.org/2001/XMLSchema-instance` | Type attributes |
| `xmlns:z` | `http://schemas.microsoft.com/2003/10/Serialization/` | Reference IDs (`z:Id`) |
| `xmlns:a` | `http://schemas.microsoft.com/2003/10/Serialization/Arrays` | Arrays/collections |
| `xmlns:b` | `http://schemas.datacontract.org/2004/07/ThreatModeling.KnowledgeBase` | Stencil properties |
| `xmlns:c` | `http://www.w3.org/2001/XMLSchema` | Primitive type values |

## File Structure (Correct Order)

```xml
<ThreatModel xmlns="..." xmlns:i="...">
  <DrawingSurfaceList>
    <DrawingSurfaceModel z:Id="i1" xmlns:z="...">
      <GenericTypeId xmlns="...Abstracts">DRAWINGSURFACE</GenericTypeId>
      <Guid xmlns="...Abstracts">{guid}</Guid>
      <Properties xmlns="...Abstracts" xmlns:a="...Arrays">...</Properties>
      <TypeId xmlns="...Abstracts">DRAWINGSURFACE</TypeId>
      <Borders xmlns:a="...Arrays">
        <!-- Stencil elements (processes, data stores, external entities) -->
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

## Stencil Element Types

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
      <!-- Out Of Scope, Reason, Configurable Attributes -->
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

### Stencil Shape Types

| Shape | i:type | GenericTypeId | Description |
|-------|--------|---------------|-------------|
| Process (circle) | `StencilEllipse` | `GE.P` | Processes, web apps, services |
| Data Store (parallel lines) | `StencilParallelLines` | `GE.DS` | Databases, storage, caches |
| External Interactor (rectangle) | `StencilRectangle` | `GE.EI` | Users, external systems |
| Trust Boundary | `BorderBoundary` | `GE.TB` | Trust boundaries |

### Common TypeId Values (SDL TM Knowledge Base)

| TypeId | Component |
|--------|-----------|
| `SE.P.TMCore.WebApp` | Web Application |
| `SE.P.TMCore.AzureAppServiceWebApp` | Azure App Service Web App |
| `SE.P.TMCore.AzureEventHub` | Azure Event Hub |
| `SE.P.TMCore.DynamicsCRM` | Dynamics CRM |
| `SE.DS.TMCore.SQL` | SQL Database |
| `SE.DS.TMCore.AzureCosmosDB` | Azure Cosmos DB |
| `SE.EI.TMCore.Browser` | Browser |
| `SE.EI.TMCore.HumanUser` | Human User |

## Data Flow Lines

Lines in `<Lines>` also use `<a:KeyValueOfguidanyType>` with `i:type="Connector"`:

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

## Property Attribute Types

Properties use typed `<a:anyType>` elements:

| i:type | Purpose | Has Value |
|--------|---------|-----------|
| `b:HeaderDisplayAttribute` | Section header | `i:nil="true"` |
| `b:StringDisplayAttribute` | Text value (Name, Reason) | `i:type="c:string"` |
| `b:BooleanDisplayAttribute` | Boolean (Out Of Scope) | `i:type="c:boolean"` |
| `b:ListDisplayAttribute` | Dropdown list | Has `<b:SelectedIndex>` |

## Threat Instances

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
          <b:Value>Source → Target</b:Value>
        </b:KeyValueOfstringstring>
      </Properties>
      <SourceGuid>{source-stencil-guid}</SourceGuid>
      <State>AutoGenerated</State>
      <TargetGuid>{target-stencil-guid}</TargetGuid>
    </a:Value>
  </KeyValueOfstringThreatpc_P0_PhBB>
</ThreatInstances>
```

## Common Mistakes That Break TM7 Files

1. **Adding `<?xml version="1.0"?>` declaration** — DataContractSerializer does NOT output this
2. **Using `xmlns:xsi`/`xmlns:xsd`** instead of DataContract namespaces
3. **Using simple XML element names** like `<Border>`, `<Line>`, `<Stencil>` — must use DataContract wrapper types like `<a:KeyValueOfguidanyType>`
4. **Inventing custom elements** like `<MetaInformation>`, `<SecurityGaps>`, `<Mitigations>`, `<Assumptions>` — these DO NOT exist in the TM7 schema
5. **Using human-readable GUIDs** like `users-browser` instead of proper UUIDs (e.g., `148ade68-5c80-40f3-8e1f-4e2cabdb5991`)
6. **Missing `z:Id` reference attributes** on serialized objects
7. **Missing the `xmlns` on child elements** — each `GenericTypeId`, `Guid`, `Properties`, `TypeId`, etc. must carry its own `xmlns="http://schemas.datacontract.org/2004/07/ThreatModeling.Model.Abstracts"`
8. **Pretty-printing with indentation** — the correct format is a single continuous line of XML (no newlines or indentation within the content)

## Reference

Always use the `example-minimal.tm7` file in this skill's directory as a structural reference. Adapt the stencil types, names, properties, and data flows to match the user's architecture, but NEVER change the serialization format or namespace structure.
