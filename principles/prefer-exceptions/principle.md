# Prefer Exceptions Over Either

Return `Future<T>` and let failures throw instead of returning `Future<Either<T>>`, because a Future can fail anyway and Either only adds complexity and false safety.

A `Future<T>` already encapsulates both successful results and potential failures. Avoid using `Future<Either<T>>`, as it introduces unnecessary complexity.

- A `Future` can fail naturally (e.g., `TimeoutException`), requiring try-catch handling regardless.
- Wrapping results in `Either` may create a false sense of safety, leading developers to overlook try-catch handling.
