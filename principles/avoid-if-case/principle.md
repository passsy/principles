# Avoid if-case Pattern Matching

Avoid the if-case pattern matching syntax and write a plain type and length check instead, because many developers still find if-case hard to read.

The new if-case pattern matching syntax is shorter but is harder to understand.
And many developers are still unfamiliar with it.

Avoid: `if (pair case [int x, int y]) {`
Prefer `if (pair is List<int> && pair.length == 2) {`
