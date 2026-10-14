# Use Explicit Exports with `show`

Export a package's public symbols with explicit show clauses, so the public API is a deliberate list and internals do not leak.

When exporting from a library's public API file (e.g., `lib/my_package.dart`), always use explicit `show` clauses to control exactly what symbols are exported.

## Scope

This rule applies to **packages published on pub.dev** (or consumed as a dependency), where the public API surface matters and accidental exposure of internals can break consumers. It does **not** apply to application code (e.g., a Flutter app) where all source files are consumed directly and refactored together.

## Why

- **Intentional API surface**: Forces deliberate decisions about what is public
- **Prevents accidental exposure**: Internal helpers, private extensions, or implementation details won't leak
- **Better documentation**: The export list serves as a quick reference for available symbols
- **Easier refactoring**: Changing internal code won't accidentally break the public API

## Example

```dart
// Good - explicit exports
export 'src/logger.dart' show Logger, LogLevel;
export 'src/writer.dart' show Writer;
export 'src/formatter.dart' show Formatter, FormatterOptions;

// Bad - exports everything, including internal symbols
export 'src/logger.dart';
export 'src/writer.dart';
export 'src/formatter.dart';
```

## When files re-export other files

If a file uses `export` internally, add explicit exports for those nested symbols in the main library file:

```dart
// src/formatter.dart has: export 'src/spans.dart';
// In lib/my_package.dart, export spans explicitly:
export 'src/formatter.dart' show Formatter;
export 'src/spans.dart' show Span, TextSpan, ColorSpan;
```
