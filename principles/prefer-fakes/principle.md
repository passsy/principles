# Prefer Fakes Over Mocks

Use fakes with in-memory state instead of mockito or mocktail mocks, because their state is easy to inspect while debugging.

Mocks with `mockito` only track the exact method calls and arguments.  
This makes it hard to debug what the state of the mock should be after multiple calls.

A fake with an in-memory modifiable state should always be preferred.  
This makes it easy to see the state during debugging.
Nothing stops the fake from also tracking the calls and their order with a custom implementation.
