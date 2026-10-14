# Avoid bloc

Do not use package:bloc or flutter_bloc for state management; streams are hard to test, and a synchronous ChangeNotifier is simpler for most code.

The package:bloc and package:flutter_bloc should be avoided. Streams are hard to test and most code can be written simpler and synchronous with a ChangeNotifier.
