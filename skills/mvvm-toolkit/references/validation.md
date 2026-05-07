# Validation with `ObservableValidator`

`ObservableValidator` extends `ObservableObject` with `INotifyDataErrorInfo`
support, integrating with
`System.ComponentModel.DataAnnotations` validation attributes.

---

## Quick start

```csharp
using System.ComponentModel.DataAnnotations;
using CommunityToolkit.Mvvm.ComponentModel;

public sealed partial class RegistrationViewModel : ObservableValidator
{
    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required]
    [MinLength(2), MaxLength(100)]
    private string? name;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required, EmailAddress]
    private string? email;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Range(13, 120)]
    private int age;

    [RelayCommand]
    private void Submit()
    {
        ValidateAllProperties();
        if (HasErrors) return;
        // submit...
    }
}
```

`[NotifyDataErrorInfo]` makes the generated setter call
`ValidateProperty(value)` after each successful set, so validation runs as
the user types.

---

## Manual `SetProperty` validation

If you write the property by hand instead of using `[ObservableProperty]`,
opt into validation with the `bool validate` parameter:

```csharp
[Required, MinLength(2), MaxLength(100)]
public string? Name
{
    get => name;
    set => SetProperty(ref name, value, validate: true);
}
```

---

## `TrySetProperty`

Sometimes you want to set a property only if validation succeeds:

```csharp
[Required, EmailAddress]
public string? Email
{
    get => email;
    set
    {
        if (TrySetProperty(ref email, value, out IReadOnlyCollection<ValidationResult> errors))
        {
            // value passed validation; success
        }
        else
        {
            // inspect errors
        }
    }
}
```

---

## `ValidateAllProperties()`

Forces validation across every public property in the type that has at
least one `ValidationAttribute`. Call before submission:

```csharp
[RelayCommand(CanExecute = nameof(CanSubmit))]
private void Submit()
{
    ValidateAllProperties();
    if (HasErrors) return;
    submitter.Submit(this);
}

private bool CanSubmit() => !HasErrors;
```

Pair with `[NotifyCanExecuteChangedFor]` on the input fields, plus a
listener on `ErrorsChanged` (or override `OnErrorsChanged`) to keep the
button state in sync as the user types.

---

## `ValidateProperty(value, propertyName)`

Trigger validation manually for one property — useful when validation of
property `A` depends on property `B`:

```csharp
[Range(20, 80)]
[ObservableProperty]
private int b;

[Range(10, 100)]
[GreaterThan(nameof(B))]
[ObservableProperty]
private int a;

partial void OnBChanged(int value)
{
    // Re-run A's validation since it depends on B.
    ValidateProperty(A, nameof(A));
}
```

---

## `ClearAllErrors()`

Reset the error state — common after a successful submit or when resetting
a form:

```csharp
[RelayCommand]
private void Reset()
{
    Name = null;
    Email = null;
    Age = 0;
    ClearAllErrors();
}
```

---

## Custom validation method (`[CustomValidation]`)

```csharp
[Required, MinLength(3)]
[CustomValidation(typeof(RegistrationViewModel), nameof(ValidateUsername))]
[ObservableProperty]
private string? username;

public static ValidationResult ValidateUsername(string? value, ValidationContext context)
{
    var vm = (RegistrationViewModel)context.ObjectInstance;
    if (vm.userService.IsTaken(value!))
        return new ValidationResult("Username is already taken.");
    return ValidationResult.Success!;
}
```

The method must be `static` and accept `(value, ValidationContext)`. Use
`context.ObjectInstance` to reach back into the ViewModel.

---

## Custom `ValidationAttribute`

For reusable rules, subclass `ValidationAttribute`:

```csharp
public sealed class GreaterThanAttribute(string otherPropertyName)
    : ValidationAttribute
{
    public string OtherPropertyName { get; } = otherPropertyName;

    protected override ValidationResult? IsValid(object? value, ValidationContext ctx)
    {
        var instance = ctx.ObjectInstance;
        var other = instance.GetType().GetProperty(OtherPropertyName)?.GetValue(instance);
        if (((IComparable)value!).CompareTo(other) > 0)
            return ValidationResult.Success;
        return new ValidationResult($"Must be greater than {OtherPropertyName}.");
    }
}
```

Apply to the property:

```csharp
[Range(10, 100)]
[GreaterThan(nameof(B))]
[ObservableProperty]
private int a;
```

---

## Reading errors in the View

`ObservableValidator` implements `INotifyDataErrorInfo`. XAML stacks render
`ErrorsChanged` automatically when `ValidatesOnNotifyDataErrors=True` (WPF)
or via control templates (WinUI 3, MAUI). To inspect errors in code:

```csharp
foreach (ValidationResult result in vm.GetErrors(nameof(vm.Name)))
{
    Console.WriteLine(result.ErrorMessage);
}

// Across all properties
foreach (ValidationResult result in vm.GetErrors())
{
    Console.WriteLine(result.ErrorMessage);
}

bool any = vm.HasErrors;
```

Subscribe to changes:

```csharp
vm.ErrorsChanged += (s, e) =>
{
    Debug.WriteLine($"Errors changed for {e.PropertyName}");
};
```

---

## Tips

- Combine `ValidateAllProperties()` with `[NotifyCanExecuteChangedFor]` so
  the Submit button reflects validity in real time.
- Keep validation rules in the ViewModel (or via custom attributes), not
  in the model — the model should be a plain DTO.
- For network or async validation (e.g., "is username taken?"), use
  `[CustomValidation]` calling a synchronous wrapper around an async lookup
  (or perform the async check separately and surface the result via
  `AddError(propertyName, ...)`-style helpers if you write your own).
- `ObservableValidator` cannot also inherit from `ObservableRecipient` —
  if you need messaging, inject `IMessenger` and call `Send` directly.
