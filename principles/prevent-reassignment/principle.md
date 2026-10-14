# Prevent Reassignment

Declare variables final or const unless they are reassigned, so a var signals real reassignment; this does not apply to for-loop headers or function parameters.

Use `final`/`const` where possible.
Never leave a variable reassignable (var) if it is never reassigned.
Rule applies inside methods and classes.
Don't use final inside for-loop headers `for (final int i; i < 10; i++)`
Don't use final for function arguments
