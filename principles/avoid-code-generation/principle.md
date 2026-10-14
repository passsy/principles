# Avoid Code Generation

Avoid build_runner and code generation in Dart; write the code once instead, and do not suggest freezed unless the project already depends on it.

package:build_runner should be avoided. Most generated code is a one-time task which can be automated by AI easily these days.
Also never recommend freezed unless it is already added as dependency.
