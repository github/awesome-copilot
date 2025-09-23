---
description: 'Comprehensive guide for working with Power Apps Canvas Apps YAML structure based on Microsoft Power Apps YAML schema v3.0. Covers Power Fx formulas, control structures, data types, and source control best practices.'
applyTo: '**/*.{yaml,yml,md,pa.yaml}'
---

# Power Apps Canvas Apps YAML Structure Guide

## Overview
This document provides comprehensive instructions for working with YAML code for Power Apps canvas apps based on the official Microsoft Power Apps YAML schema (v3.0) and Power Fx documentation.

**Official Schema Source**: https://raw.githubusercontent.com/microsoft/PowerApps-Tooling/refs/heads/master/schemas/pa-yaml/v3.0/pa.schema.yaml

## Power Fx Design Principles
Power Fx is the formula language used throughout Power Apps canvas apps. It follows these core principles:

### Design Principles
- **Simple**: Uses familiar concepts from Excel formulas
- **Excel Consistency**: Aligns with Excel formula syntax and behavior
- **Declarative**: Describes what you want, not how to achieve it
- **Functional**: Avoids side effects; most functions are pure
- **Composition**: Complex logic built by combining simpler functions
- **Strongly Typed**: Type system ensures data integrity
- **Integrated**: Works seamlessly across the Power Platform

### Language Philosophy
Power Fx promotes:
- Low-code development through familiar Excel-like formulas
- Automatic recalculation when dependencies change
- Type safety with compile-time checking
- Functional programming patterns

## Root Structure
Every Power Apps YAML file follows this top-level structure:

```yaml
App:
  Properties:
    # App-level properties and formulas
    StartScreen: =Screen1

Screens:
  # Screen definitions

ComponentDefinitions:
  # Custom component definitions

DataSources:
  # Data source configurations

EditorState:
  # Editor metadata (screen order, etc.)
```

## 1. App Section
The `App` section defines application-level properties and configuration.

```yaml
App:
  Properties:
    StartScreen: =Screen1
    BackEnabled: =false
    # Other app properties with Power Fx formulas
```

### Key Points:
- Contains application-wide settings
- Properties use Power Fx formulas (prefixed with `=`)
- `StartScreen` property is commonly specified

## 2. Screens Section
Defines all screens in the application as an unordered map.

```yaml
Screens:
  Screen1:
    Properties:
      # Screen properties
    Children:
      - Label1:
          Control: Label
          Properties:
            Text: ="Hello World"
            X: =10
            Y: =10
      - Button1:
          Control: Button
          Properties:
            Text: ="Click Me"
            X: =10
            Y: =100
```

### Screen Structure:
- **Properties**: Screen-level properties and formulas
- **Children**: Array of controls on the screen (ordered by z-index)

### Control Definition Format:
```yaml
ControlName:
  Control: ControlType      # Required: Control type identifier
  Properties:
    PropertyName: =PowerFxFormula
  # Optional properties:
  Group: GroupName          # For organizing controls in Studio
  Variant: VariantName      # Control variant (affects default properties)
  MetadataKey: Key          # Metadata identifier for control
  Layout: LayoutName        # Layout configuration
  IsLocked: true/false      # Whether control is locked in editor
  Children: []              # For container controls (ordered by z-index)
```

### Control Versioning:
You can specify control versions using the `@` operator:
```yaml
MyButton:
  Control: Button@2.1.0     # Specific version
  Properties:
    Text: ="Click Me"

MyLabel:
  Control: Label            # Uses latest version by default
  Properties:
    Text: ="Hello World"
```

## 3. Control Types

### Standard Controls
Common first-party controls include:
- **Basic Controls**: `Label`, `Button`, `TextInput`, `HTMLText`
- **Input Controls**: `Slider`, `Toggle`, `Checkbox`, `Radio`, `Dropdown`, `Combobox`, `DatePicker`, `ListBox`
- **Display Controls**: `Image`, `Icon`, `Video`, `Audio`, `PDF viewer`, `Barcode scanner`
- **Layout Controls**: `Container`, `Rectangle`, `Circle`, `Gallery`, `DataTable`, `Form`
- **Chart Controls**: `Column chart`, `Line chart`, `Pie chart`
- **Advanced Controls**: `Timer`, `Camera`, `Microphone`, `Add picture`, `Import`, `Export`

### Container and Layout Controls
Special attention for container controls and their children:
```yaml
MyContainer:
  Control: Container
  Properties:
    Width: =300
    Height: =200
    Fill: =RGBA(240, 240, 240, 1)
  Children:
    - Label1:
        Control: Label
        Properties:
          Text: ="Inside Container"
          X: =10         # Relative to container
          Y: =10         # Relative to container
    - Button1:
        Control: Button
        Properties:
          Text: ="Container Button"
          X: =10
          Y: =50
```

### Custom Components
```yaml
MyCustomControl:
  Control: Component
  ComponentName: MyComponent
  Properties:
    X: =10
    Y: =10
    # Custom component properties
```

### Code Components (PCF)
```yaml
MyPCFControl:
  Control: CodeComponent
  ComponentName: publisherprefix_namespace.classname
  Properties:
    X: =10
    Y: =10
```

## 4. Component Definitions
Define reusable custom components:

```yaml
ComponentDefinitions:
  MyComponent:
    DefinitionType: CanvasComponent
    Description: "A reusable component"
    AllowCustomization: true
    AccessAppScope: false
    CustomProperties:
      InputText:
        PropertyKind: Input
        DataType: Text
        Description: "Input text property"
        Default: ="Default Value"
      OutputValue:
        PropertyKind: Output
        DataType: Number
        Description: "Output number value"
    Properties:
      Fill: =RGBA(255, 255, 255, 1)
      Height: =100
      Width: =200
    Children:
      - Label1:
          Control: Label
          Properties:
            Text: =Parent.InputText
```

### Custom Property Types:
- **Input**: Receives values from parent
- **Output**: Sends values to parent
- **InputFunction**: Function called by parent
- **OutputFunction**: Function defined in component
- **Event**: Triggers events to parent
- **Action**: Function with side effects

### Data Types:
- `Text`, `Number`, `Boolean`
- `DateAndTime`, `Color`, `Currency`
- `Record`, `Table`, `Image`
- `VideoOrAudio`, `Screen`

## 5. Data Sources
Configure data connections:

```yaml
DataSources:
  MyTable:
    Type: Table
    Parameters:
      TableLogicalName: account

  MyActions:
    Type: Actions
    ConnectorId: shared_office365users
    Parameters:
      # Additional connector parameters
```

### Data Source Types:
- **Table**: Dataverse tables or other tabular data
- **Actions**: Connector actions and flows

## 6. Editor State
Maintains editor organization:

```yaml
EditorState:
  ScreensOrder:
    - Screen1
    - Screen2
    - Screen3
  ComponentDefinitionsOrder:
    - MyComponent
    - AnotherComponent
```

## Power Fx Formula Guidelines

### Formula Syntax:
- All formulas must start with `=`
- Use Power Fx syntax for expressions
- Null values can be represented as `null` (without quotes)
- Examples:
  ```yaml
  Text: ="Hello World"
  X: =10
  Visible: =Toggle1.Value
  OnSelect: =Navigate(Screen2, ScreenTransition.Fade)
  OptionalProperty: null    # Represents no value
  ```

### Common Formula Patterns:
```yaml
# Static values
Text: ="Static Text"
X: =50
Visible: =true

# Control references
Text: =TextInput1.Text
Visible: =Toggle1.Value

# Parent references (for controls in containers/galleries)
Width: =Parent.Width - 20
Height: =Parent.TemplateHeight    # In gallery templates

# Functions
OnSelect: =Navigate(NextScreen, ScreenTransition.Slide)
Text: =Concatenate("Hello ", User().FullName)

# Conditional logic
Visible: =If(Toggle1.Value, true, false)
Fill: =If(Button1.Pressed, RGBA(255,0,0,1), RGBA(0,255,0,1))

# Data operations
Items: =Filter(DataSource, Status = "Active")
Text: =LookUp(Users, ID = 123).Name
```

### Z-Index and Control Ordering:
- Controls in the `Children` array are ordered by z-index
- First control in array = bottom layer (z-index 1)
- Last control in array = top layer (highest z-index)
- All controls use ascending order starting from 1

## Naming Conventions

### Entity Names:
- Screen names: Descriptive and unique
- Control names: TypeName + Number (e.g., `Button1`, `Label2`)
- Component names: PascalCase

### Property Names:
- Standard properties: Use exact casing from schema
- Custom properties: PascalCase recommended

## Best Practices

### 1. Structure Organization:
- Keep screens logically organized
- Group related controls using the `Group` property
- Use meaningful names for all entities

### 2. Formula Writing:
- Keep formulas readable and well-formatted
- Use comments in complex formulas when possible
- Avoid overly complex nested expressions

### 3. Component Design:
- Design components to be reusable
- Provide clear descriptions for custom properties
- Use appropriate property kinds (Input/Output)

### 4. Data Source Management:
- Use descriptive names for data sources
- Document connection requirements
- Keep data source configurations minimal

## Validation Rules

### Required Properties:
- All controls must have a `Control` property
- Component definitions must have `DefinitionType`
- Data sources must have `Type`

### Naming Patterns:
- Entity names: Minimum 1 character, alphanumeric
- Control type IDs: Follow pattern `^([A-Z][a-zA-Z0-9]*/)?[A-Z][a-zA-Z0-9]*(@\d+\.\d+\.\d+)?$`
- Code component names: Follow pattern `^([a-z][a-z0-9]{1,7})_([a-zA-Z0-9]\.)+[a-zA-Z0-9]+$`

## Common Issues and Solutions

### 1. Invalid Control Types:
- Ensure control types are spelled correctly
- Check for proper casing
- Verify control type is supported in schema

### 2. Formula Errors:
- All formulas must start with `=`
- Use proper Power Fx syntax
- Check for correct property references

### 3. Structure Validation:
- Maintain proper YAML indentation
- Ensure required properties are present
- Follow the schema structure exactly

### 4. Custom Component Issues:
- Verify `ComponentName` matches definition
- Ensure custom properties are properly defined
- Check property kinds are appropriate
- Validate component library references if using external components

### 5. Performance Considerations:
- Avoid deeply nested formulas in YAML
- Use efficient data source queries
- Consider delegable formulas for large datasets
- Minimize complex calculations in frequently updated properties

## Advanced Topics

### 1. Component Library Integration:
```yaml
ComponentDefinitions:
  MyLibraryComponent:
    DefinitionType: CanvasComponent
    AllowCustomization: true
    ComponentLibraryUniqueName: "pub_MyComponentLibrary"
    # Component definition details
```

### 2. Responsive Design Considerations:
- Use `Parent.Width` and `Parent.Height` for responsive sizing
- Consider container-based layouts for complex UIs
- Use formulas for dynamic positioning and sizing

### 3. Gallery Templates:
```yaml
MyGallery:
  Control: Gallery
  Properties:
    Items: =DataSource
    TemplateSize: =100
  Children:
    - GalleryTemplate:  # Template for each gallery item
        Children:
          - TitleLabel:
              Control: Label
              Properties:
                Text: =ThisItem.Title
                Width: =Parent.TemplateWidth - 20
```

### 4. Form Controls and Data Cards:
```yaml
MyForm:
  Control: Form
  Properties:
    DataSource: =DataSource
    DefaultMode: =FormMode.New
  Children:
    - DataCard1:
        Control: DataCard
        Properties:
          DataField: ="Title"
        Children:
          - DataCardValue1:
              Control: TextInput
              Properties:
                Default: =Parent.Default
```

### 5. Error Handling in Formulas:
```yaml
Properties:
  Text: =IfError(LookUp(DataSource, ID = 123).Name, "Not Found")
  Visible: =!IsError(DataSource)
  OnSelect: =IfError(
    Navigate(DetailScreen, ScreenTransition.Cover),
    Notify("Navigation failed", NotificationType.Error)
  )
```

## Power Apps Source Code Management

### Accessing Source Code Files:
Power Apps YAML files can be obtained through several methods:

1. **Power Platform CLI**:
   ```powershell
   # List canvas apps in environment
   pac canvas list

   # Download and extract YAML files
   pac canvas download --name "MyApp" --extract-to-directory "C:\path\to\destination"
   ```

2. **Manual Extraction from .msapp**:
   ```powershell
   # Extract .msapp file using PowerShell
   Expand-Archive -Path "C:\path\to\yourFile.msapp" -DestinationPath "C:\path\to\destination"
   ```

3. **Dataverse Git Integration**: Direct access to source files without .msapp files

### File Structure in .msapp:
- `\src\App.pa.yaml` - Represents the main App configuration
- `\src\[ScreenName].pa.yaml` - One file for each screen
- `\src\Component\[ComponentName].pa.yaml` - Component definitions

**Important Notes**:
- Only files in the `\src` folder are intended for source control
- .pa.yaml files are **read-only** and for review purposes only
- External editing, merging, and conflict resolution isn't supported
- JSON files in .msapp aren't stable for source control

### Schema Version Evolution:
1. **Experimental Format** (*.fx.yaml): No longer in development
2. **Early Preview**: Temporary format, no longer in use
3. **Source Code** (*.pa.yaml): Current active format with version control support

## Power Fx Formula Reference

### Formula Categories:

#### **Functions**: Take parameters, perform operations, return values
```yaml
Properties:
  Text: =Concatenate("Hello ", User().FullName)
  X: =Sum(10, 20, 30)
  Items: =Filter(DataSource, Status = "Active")
```

#### **Signals**: Return environment information (no parameters)
```yaml
Properties:
  Text: =Location.Latitude & ", " & Location.Longitude
  Visible: =Connection.Connected
  Color: =If(Acceleration.X > 5, Color.Red, Color.Blue)
```

#### **Enumerations**: Predefined constant values
```yaml
Properties:
  Fill: =Color.Blue
  Transition: =ScreenTransition.Fade
  Align: =Align.Center
```

#### **Named Operators**: Access container information
```yaml
Properties:
  Text: =ThisItem.Title        # In galleries
  Width: =Parent.Width - 20    # In containers
  Height: =Self.Height / 2     # Self-reference
```

### Essential Power Fx Functions for YAML:

#### **Navigation & App Control**:
```yaml
OnSelect: =Navigate(NextScreen, ScreenTransition.Cover)
OnSelect: =Back()
OnSelect: =Exit()
OnSelect: =Launch("https://example.com")
```

#### **Data Operations**:
```yaml
Items: =Filter(DataSource, Category = "Active")
Text: =LookUp(Users, ID = 123).Name
OnSelect: =Patch(DataSource, ThisItem, {Status: "Complete"})
OnSelect: =Collect(LocalCollection, {Name: TextInput1.Text})
```

#### **Conditional Logic**:
```yaml
Visible: =If(Toggle1.Value, true, false)
Text: =Switch(Status, "New", "🆕", "Complete", "✅", "❓")
Fill: =If(Value < 0, Color.Red, Color.Green)
```

#### **Text Manipulation**:
```yaml
Text: =Concatenate("Hello ", User().FullName)
Text: =Upper(TextInput1.Text)
Text: =Substitute(Label1.Text, "old", "new")
Text: =Left(Title, 10) & "..."
```

#### **Mathematical Operations**:
```yaml
Text: =Sum(Sales[Amount])
Text: =Average(Ratings[Score])
Text: =Round(Calculation, 2)
Text: =Max(Values[Number])
```

#### **Date & Time Functions**:
```yaml
Text: =Text(Now(), "mm/dd/yyyy")
Text: =DateDiff(StartDate, EndDate, Days)
Text: =Text(Today(), "dddd, mmmm dd, yyyy")
Visible: =IsToday(DueDate)
```

### Formula Syntax Guidelines:

#### **Basic Syntax Rules**:
- All formulas start with `=`
- No preceding `+` or `=` sign (unlike Excel)
- Double quotes for text strings: `="Hello World"`
- Property references: `ControlName.PropertyName`
- Comments not supported in YAML context

#### **Formula Elements**:
```yaml
# Literal values
Text: ="Static Text"
X: =42
Visible: =true

# Control property references
Text: =TextInput1.Text
Visible: =Checkbox1.Value

# Function calls
Text: =Upper(TextInput1.Text)
Items: =Sort(DataSource, Title)

# Complex expressions
Text: =If(IsBlank(TextInput1.Text), "Enter text", Upper(TextInput1.Text))
```

#### **Behavior vs. Property Formulas**:
```yaml
# Property formulas (calculate values)
Properties:
  Text: =Concatenate("Hello ", User().FullName)
  Visible: =Toggle1.Value

# Behavior formulas (perform actions - use semicolon for multiple actions)
Properties:
  OnSelect: =Set(MyVar, true); Navigate(NextScreen); Notify("Done!")
```

### Advanced Formula Patterns:

#### **Working with Collections**:
```yaml
Properties:
  Items: =Filter(MyCollection, Status = "Active")
  OnSelect: =ClearCollect(MyCollection, DataSource)
  OnSelect: =Collect(MyCollection, {Name: "New Item", Status: "Active"})
```

#### **Error Handling**:
```yaml
Properties:
  Text: =IfError(Value(TextInput1.Text), 0)
  OnSelect: =IfError(
    Patch(DataSource, ThisItem, {Field: Value}),
    Notify("Error updating record", NotificationType.Error)
  )
```

#### **Dynamic Property Setting**:
```yaml
Properties:
  Fill: =ColorValue("#" & HexInput.Text)
  Height: =Parent.Height * (Slider1.Value / 100)
  X: =If(Alignment = "Center", (Parent.Width - Self.Width) / 2, 0)
```

## Working with Formulas Best Practices

### Formula Organization:
- Break complex formulas into smaller, readable parts
- Use variables to store intermediate calculations
- Comment complex logic using descriptive control names
- Group related calculations together

### Performance Optimization:
- Use delegation-friendly functions when working with large datasets
- Avoid nested function calls in frequently updated properties
- Use collections for complex data transformations
- Minimize calls to external data sources

## Power Fx Data Types and Operations

### Data Type Categories:

#### **Primitive Types**:
- **Boolean**: `=true`, `=false`
- **Number**: `=123`, `=45.67`
- **Text**: `="Hello World"`
- **Date**: `=Date(2024, 12, 25)`
- **Time**: `=Time(14, 30, 0)`
- **DateTime**: `=Now()`

#### **Complex Types**:
- **Color**: `=Color.Red`, `=RGBA(255, 128, 0, 1)`
- **Record**: `={Name: "John", Age: 30}`
- **Table**: `=Table({Name: "John"}, {Name: "Jane"})`
- **GUID**: `=GUID()`

#### **Type Conversion**:
```yaml
Properties:
  Text: =Text(123.45, "#,##0.00")        # Number to text
  Text: =Value("123.45")                 # Text to number
  Text: =DateValue("12/25/2024")         # Text to date
  Visible: =Boolean("true")              # Text to boolean
```

#### **Type Checking**:
```yaml
Properties:
  Visible: =Not(IsBlank(OptionalField))
  Visible: =Not(IsError(Value(TextInput1.Text)))
  Visible: =IsNumeric(TextInput1.Text)
```

### Table Operations:

#### **Creating Tables**:
```yaml
Properties:
  Items: =Table(
    {Name: "Product A", Price: 10.99},
    {Name: "Product B", Price: 15.99}
  )
  Items: =["Option 1", "Option 2", "Option 3"]  # Single-column table
```

#### **Filtering and Sorting**:
```yaml
Properties:
  Items: =Filter(Products, Price > 10)
  Items: =Sort(Products, Name, Ascending)
  Items: =SortByColumns(Products, "Price", Descending, "Name", Ascending)
```

#### **Data Transformation**:
```yaml
Properties:
  Items: =AddColumns(Products, "Total", Price * Quantity)
  Items: =RenameColumns(Products, "Price", "Cost")
  Items: =ShowColumns(Products, "Name", "Price")
  Items: =DropColumns(Products, "InternalID")
```

#### **Aggregation**:
```yaml
Properties:
  Text: =Sum(Products, Price)
  Text: =Average(Products, Rating)
  Text: =Max(Products, Price)
  Text: =CountRows(Products)
```

### Variables and State Management:

#### **Global Variables**:
```yaml
Properties:
  OnSelect: =Set(MyGlobalVar, "Hello World")
  Text: =MyGlobalVar
```

#### **Context Variables**:
```yaml
Properties:
  OnSelect: =UpdateContext({LocalVar: "Screen Specific"})
  OnSelect: =Navigate(NextScreen, None, {PassedValue: 42})
```

#### **Collections**:
```yaml
Properties:
  OnSelect: =ClearCollect(MyCollection, DataSource)
  OnSelect: =Collect(MyCollection, {Name: "New Item"})
  Items: =MyCollection
```

## Power Fx Enhanced Connectors and External Data

### Connector Integration:
```yaml
DataSources:
  SharePointList:
    Type: Table
    Parameters:
      TableLogicalName: "Custom List"

  Office365Users:
    Type: Actions
    ConnectorId: shared_office365users
```

### Working with External Data:
```yaml
Properties:
  Items: =Filter(SharePointList, Status = "Active")
  OnSelect: =Office365Users.SearchUser({searchTerm: SearchInput.Text})
```

### Delegation Considerations:
```yaml
Properties:
  # Delegable operations (executed server-side)
  Items: =Filter(LargeTable, Status = "Active")    # Efficient

  # Non-delegable operations (may download all records)
  Items: =Filter(LargeTable, Len(Description) > 100)  # Warning issued
```

## Troubleshooting and Common Patterns

### Common Error Patterns:
```yaml
# Handle blank values
Properties:
  Text: =If(IsBlank(OptionalText), "Default", OptionalText)

# Handle errors gracefully
Properties:
  Text: =IfError(RiskyOperation(), "Fallback Value")

# Validate input
Properties:
  Visible: =And(
    Not(IsBlank(NameInput.Text)),
    IsNumeric(AgeInput.Text),
    IsMatch(EmailInput.Text, Email)
  )
```

### Performance Optimization:
```yaml
# Efficient data loading
Properties:
  Items: =Filter(LargeDataSource, Status = "Active")    # Server-side filtering

# Use delegation-friendly operations
Properties:
  Items: =Sort(Filter(DataSource, Active), Name)        # Delegable
  # Avoid: Sort(DataSource, If(Active, Name, ""))       # Not delegable
```

### Memory Management:
```yaml
# Clear unused collections
Properties:
  OnSelect: =Clear(TempCollection)

# Limit data retrieval
Properties:
  Items: =FirstN(Filter(DataSource, Status = "Active"), 50)
```

Remember: This guide provides comprehensive coverage of Power Apps Canvas Apps YAML structure and Power Fx formulas. Always validate your YAML against the official schema and test formulas in the Power Apps Studio environment.
