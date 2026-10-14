# Use clock.now() instead of DateTime.now()

Read the time through clock.now() from package:clock, so tests can control it with fakeAsync or withClock.

When code contains tests, use `clock.now()` because it can be controlled with `fakeAsync`, whereas `DateTime.now()` will use the system time which is unhelpful in tests.
