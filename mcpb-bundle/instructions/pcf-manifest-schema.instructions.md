---
description: 'Complete manifest schema reference for PCF components with all available XML elements'
applyTo: '**/*.xml'
---

# Manifest Schema Reference

The manifest file (`ControlManifest.Input.xml`) is a metadata document that defines your code component. This reference lists all available manifest elements and their purposes.

## Root Element

### manifest

The root element that contains the entire component definition.

## Core Elements

### code

Refers to the resource file that implements the component logic.

**Attributes:**
- `path`: Path to the TypeScript/JavaScript implementation file
- `order`: Loading order (typically "1")

**Availability:** Model-driven apps, canvas apps, portals

### control

Defines the component itself, including namespace, version, and display information.

**Key Attributes:**
- `namespace`: Namespace for the component
- `constructor`: Constructor name
- `version`: Semantic version (e.g., "1.0.0")
- `display-name-key`: Resource key for display name
- `description-key`: Resource key for description
- `control-type`: Type of control ("standard" or "virtual")

**Availability:** Model-driven apps, canvas apps, portals

## Property Elements

### property

Defines an input or output property for the component.

**Key Attributes:**
- `name`: Property name
- `display-name-key`: Resource key for display name
- `description-key`: Resource key for description
- `of-type`: Data type (e.g., "SingleLine.Text", "Whole.None", "TwoOptions", "DateAndTime.DateOnly")
- `usage`: Property usage ("bound" or "input")
- `required`: Whether property is required (true/false)
- `of-type-group`: Reference to a type-group
- `default-value`: Default value for the property

**Availability:** Model-driven apps, canvas apps, portals

### type-group

Defines a group of types that a property can accept.

**Usage:** Allows a property to accept multiple data types

**Availability:** Model-driven apps, canvas apps, portals

## Data Set Elements

### data-set

Defines a dataset property for working with tabular data.

**Key Attributes:**
- `name`: Dataset name
- `display-name-key`: Resource key for display name
- `description-key`: Resource key for description

**Availability:** Model-driven apps (canvas apps with limitations)

## Resource Elements

### resources

Container for all resource definitions (code, CSS, images, localization).

**Availability:** Model-driven apps, canvas apps, portals

### css

References a CSS stylesheet file.

**Attributes:**
- `path`: Path to CSS file
- `order`: Loading order

**Availability:** Model-driven apps, canvas apps, portals

### img

References an image resource.

**Attributes:**
- `path`: Path to image file

**Availability:** Model-driven apps, canvas apps, portals

### resx

References a resource file for localization.

**Attributes:**
- `path`: Path to .resx file
- `version`: Version number

**Availability:** Model-driven apps, canvas apps, portals

## Feature Usage Elements

### uses-feature

Declares that the component uses a specific platform feature.

**Key Attributes:**
- `name`: Feature name (e.g., "Device.captureImage", "Device.getCurrentPosition", "Utility.lookupObjects", "WebAPI")
- `required`: Whether feature is required (true/false)

**Common Features:**
- Device.captureAudio
- Device.captureImage
- Device.captureVideo
- Device.getBarcodeValue
- Device.getCurrentPosition
- Device.pickFile
- Utility.lookupObjects
- WebAPI

**Availability:** Varies by feature and platform

### feature-usage

Container for feature declarations.

**Availability:** Model-driven apps, canvas apps

## Dependency Elements

### dependency

Declares external dependencies required by the component.

**Availability:** Model-driven apps, canvas apps

### external-service-usage

Declares external services that the component uses.

**Key Attributes:**
- `enabled`: Whether external service usage is enabled (true/false)

**Availability:** Model-driven apps, canvas apps

## Library Elements

### platform-library

References a platform-provided library (e.g., React, Fluent UI).

**Key Attributes:**
- `name`: Library name (e.g., "React", "Fluent")
- `version`: Library version

**Availability:** Model-driven apps, canvas apps

## Event Elements

### event

Defines custom events that the component can raise.

**Key Attributes:**
- `name`: Event name
- `display-name-key`: Resource key for display name
- `description-key`: Resource key for description

**Availability:** Model-driven apps, canvas apps

## Action Elements

### platform-action

Defines platform actions that the component can invoke.

**Availability:** Model-driven apps

## Example Manifest Structure

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="SampleNamespace" 
           constructor="SampleControl" 
           version="1.0.0" 
           display-name-key="Sample_Display_Key" 
           description-key="Sample_Desc_Key" 
           control-type="standard">
    
    <!-- Properties -->
    <property name="sampleProperty" 
              display-name-key="Property_Display_Key" 
              description-key="Property_Desc_Key" 
              of-type="SingleLine.Text" 
              usage="bound" 
              required="true" />
    
    <!-- Type Group Example -->
    <type-group name="numbers">
      <type>Whole.None</type>
      <type>Currency</type>
      <type>FP</type>
      <type>Decimal</type>
    </type-group>
    
    <property name="numericProperty"
              display-name-key="Numeric_Display_Key"
              of-type-group="numbers"
              usage="bound" />
    
    <!-- Data Set Example -->
    <data-set name="dataSetProperty" 
              display-name-key="Dataset_Display_Key">
    </data-set>
    
    <!-- Events -->
    <event name="onCustomEvent"
           display-name-key="Event_Display_Key"
           description-key="Event_Desc_Key" />
    
    <!-- Resources -->
    <resources>
      <code path="index.ts" order="1" />
      <css path="css/SampleControl.css" order="1" />
      <img path="img/icon.png" />
      <resx path="strings/SampleControl.1033.resx" version="1.0.0" />
    </resources>
    
    <!-- Feature Usage -->
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
      <uses-feature name="Device.captureImage" required="false" />
    </feature-usage>
    
    <!-- Platform Library -->
    <platform-library name="React" version="16.8.6" />
    <platform-library name="Fluent" version="8.29.0" />
    
  </control>
</manifest>
```

## Manifest Validation

The manifest schema is validated during the build process:
- Missing required elements will cause build errors
- Invalid attribute values will be flagged
- Use `pac pcf` commands to validate manifest structure

## Best Practices

1. **Semantic Versioning**: Use semantic versioning (major.minor.patch) for component versions
2. **Localization Keys**: Always use resource keys instead of hardcoded strings
3. **Feature Declaration**: Declare all features your component uses
4. **Required vs Optional**: Mark properties and features as required only when truly necessary
5. **Type Groups**: Use type-groups for properties that accept multiple numeric types
6. **Data Types**: Choose the most specific data type that matches your requirements
7. **CSS Scoping**: Scope CSS to avoid conflicts with host applications
8. **Resource Organization**: Keep resources organized in separate folders (css/, img/, strings/)

## Data Type Reference

Common `of-type` values for properties:

- **Text**: SingleLine.Text, Multiple, SingleLine.TextArea, SingleLine.Email, SingleLine.Phone, SingleLine.Url, SingleLine.Ticker
- **Numbers**: Whole.None, Currency, FP, Decimal
- **Date/Time**: DateAndTime.DateAndTime, DateAndTime.DateOnly
- **Boolean**: TwoOptions
- **Lookup**: Lookup.Simple
- **OptionSet**: OptionSet, MultiSelectOptionSet
- **Other**: Enum

## Platform Availability Legend

- ✅ **Model-driven apps**: Fully supported
- ✅ **Canvas apps**: Supported (may have limitations)
- ✅ **Portals**: Supported in Power Pages

Most manifest elements are available across all platforms, but some features (like certain Device APIs or platform actions) may be platform-specific. Always test in your target environment.
