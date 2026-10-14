# Prefer reactive_forms for Form Handling

Handle Flutter forms with package:reactive_forms instead of Form, TextFormField and TextEditingController, so form state and validation live in one model.

Use `package:reactive_forms` for form handling in Flutter instead of Flutter's built-in Form/TextEditingController or other form packages.

## Why reactive_forms over Flutter's built-in Forms?

| Aspect | reactive_forms | Native Flutter Forms |
|--------|----------------|---------------------|
| State Management | Centralized `FormGroup` model | Scattered `TextEditingController`s |
| Validation | Declarative, composable validators | Imperative, widget-level |
| Data Access | `form.value` returns all data | Manual field collection |
| Disabled State | `markAsDisabled()` excludes from validation | No built-in support |
| Async Validation | Native support with debouncing | Requires custom implementation |
| Cross-field Validation | Built-in (e.g., `mustMatch`) | Manual implementation |

## Key Features

- **Model-driven**: Define form structure in code, separate from UI
- **Two-way binding**: UI and model stay in sync automatically
- **Composable validators**: `Validators.required`, `Validators.email`, `Validators.minLength`, etc.
- **Async validators**: Server-side validation with automatic debouncing
- **FormArray**: Dynamic lists of fields ("add more" patterns)
- **Nested FormGroups**: Complex form structures with `form.control('personal.email')`

## Basic Example

```dart
import 'package:reactive_forms/reactive_forms.dart';

final form = FormGroup({
  'email': FormControl<String>(
    validators: [Validators.required, Validators.email],
  ),
  'password': FormControl<String>(
    validators: [Validators.required, Validators.minLength(8)],
  ),
});

// In widget tree
ReactiveForm(
  formGroup: form,
  child: Column(
    children: [
      ReactiveTextField<String>(
        formControlName: 'email',
        validationMessages: {
          ValidationMessage.required: (error) => 'Email is required',
          ValidationMessage.email: (error) => 'Invalid email format',
        },
      ),
      ReactiveTextField<String>(
        formControlName: 'password',
        obscureText: true,
      ),
      ReactiveFormConsumer(
        builder: (context, form, child) {
          return ElevatedButton(
            onPressed: form.valid ? () => print(form.value) : null,
            child: Text('Submit'),
          );
        },
      ),
    ],
  ),
)
```

## Touch State and iOS-Style Validation

Validation errors only display for **touched** controls. On iOS, users expect errors to appear when tapping outside a field. Use `markAllAsTouched()` on submit to show all errors at once:

```dart
void _onSubmit() {
  if (form.valid) {
    // Submit form
    print(form.value);
  } else {
    // Show all validation errors (iOS-style UX)
    form.markAllAsTouched();
  }
}
```

Individual control methods:
- `control.markAsTouched()` - Show validation errors for this field
- `control.markAsUntouched()` - Hide validation errors
- `form.markAllAsTouched()` - Show all errors (use on submit)

## Cross-Field Validation

```dart
FormGroup({
  'password': FormControl<String>(),
  'passwordConfirmation': FormControl<String>(),
}, validators: [
  Validators.mustMatch('password', 'passwordConfirmation'),
]);
```

## FormBuilder Shorthand

```dart
final form = fb.group({
  'name': 'default value',
  'email': ['', Validators.required, Validators.email],
});
```

https://pub.dev/packages/reactive_forms
