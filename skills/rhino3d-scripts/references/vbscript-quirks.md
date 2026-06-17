# VBScript Quirks for RhinoScript

Things that bite when writing `.rvb` / `.vbs` files and aren’t obvious to anyone whose mental model is C-family or Python.

## Always Start With `Option Explicit`

Without it, mistyping a variable name silently creates a new `Variant` set to `Empty`. Every `.rvb` file should begin:

```vbscript
Option Explicit
```

## No Block Scope

All `Dim` declarations inside a `Sub`/`Function` are hoisted to the top. A `Dim` inside an `If` block is visible after the `If` ends. Loop counters survive the loop.

## `Nothing` vs `Empty` vs `Null`

| Sentinel | Test with | Meaning |
|---|---|---|
| `Empty` | `IsEmpty(x)` | `Dim`’d but never assigned |
| `Null` | `IsNull(x)` | Explicit “no value” — what `Rhino.GetObject` returns on cancel |
| `Nothing` | `x Is Nothing` | An **object** reference that points to nothing — only for `Set` variables |

Wrong sentinel → silently false.

## Parentheses Change Semantics

```vbscript
Foo a, b              ' Call a Sub or Function (return value discarded)
Call Foo(a, b)        ' Call a Sub or Function (return value discarded)
x = Foo(a, b)         ' Call a Function and capture the return
Foo(a, b)             ' SYNTAX ERROR for multi-arg subs

Foo(x)                ' Calls Foo passing x BY VALUE, even if Foo declares ByRef
Foo x                 ' Honors Foo's ByRef declaration
```

If a Sub modifies its argument and your change isn’t taking effect — you wrapped the argument in parentheses.

## `ByRef` Is the Default

Unlike most languages, VBScript passes arguments **by reference by default**. Functions can mutate their callers’ variables. Be explicit:

```vbscript
Sub Increment(ByRef n)
    n = n + 1
End Sub
```

## Arrays Are 0-Based But Have `UBound`, Not `Length`

```vbscript
Dim arr(2)            ' Three elements: arr(0), arr(1), arr(2)
For i = 0 To UBound(arr)
    arr(i) = i * 10
Next
```

`Dim arr(n)` creates `n+1` elements. `ReDim Preserve arr(newSize)` resizes (only the last dimension of a multi-dim array).

## `Set` Is Required for Object Assignment

```vbscript
Set fso = CreateObject("Scripting.FileSystemObject")    ' correct
fso = CreateObject("Scripting.FileSystemObject")        ' RUNTIME ERROR
```

Any time the right-hand side is an object (COM object, RegExp, Dictionary), you must use `Set`.

## Error Handling Is Manual

```vbscript
On Error Resume Next
Rhino.AddCircle Array(0,0,0), -1
If Err.Number <> 0 Then
    Rhino.Print "Failed: " & Err.Description
    Err.Clear
End If
On Error GoTo 0           ' Restore normal error behavior
```

`On Error Resume Next` suppresses **all** errors until `On Error GoTo 0`. Forgetting to restore is a common bug.

## Points Are 3-Element Arrays

Rhino expects `Array(x, y, z)`. A 2-element array (`Array(x, y)`) raises a type-mismatch error.

```vbscript
Dim pt
pt = Array(1.0, 2.0, 3.0)
Rhino.AddPoint pt
```

## String Concatenation Uses `&`, Not `+`

`+` on strings works only if **both** sides are strings. If one side is a number, `+` does numeric addition and throws a type-mismatch. Always use `&`:

```vbscript
Rhino.Print "Count: " & n
```

## `For Each` Needs a `Variant`

```vbscript
Dim item
For Each item In someCollection
    ' ...
Next
```

The loop variable must be `Variant`. You cannot `Dim item As Long` (VBScript has no typed `Dim`).
