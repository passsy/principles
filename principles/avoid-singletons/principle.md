# Avoid Singletons

Inject dependencies instead of reaching for a singleton, so tests can replace them with a fake or a mock.

Single instances shared via context or a service locator are fine.  
But don't create singletons for the sake of making it easy to call from anywhere.  
Always try to inject things so that they can be replaced with a mock/fake in unit tests.
