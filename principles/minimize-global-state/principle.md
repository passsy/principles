# Minimize Global State

Avoid mutable global state, because it leaks between tests and makes them depend on each other.

Global state causes shared state between tests.  
This is an absolute no-go.
