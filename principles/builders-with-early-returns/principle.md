# Use Builders with Early Returns

Replace if-else and multi-line or nested ternaries in build methods with a Builder that uses early returns, so each conditional state is easy to read.

Avoid complex conditionals in build methods. Complex conditionals are:
- if else
- multi-line ternaries, and nested ternaries

Instead:
- Use `Builder` widget to isolate rebuilds
- Apply early returns for conditional states

```dart
// Good
return Builder(builder: (context) {
  if (isLoading) return LoadingIndicator();
  if (hasError) return ErrorWidget();
  return ContentWidget();
});
``` 
