# Never Create a Globals File

Keep a constant in the file that uses it, or the one it belongs to most, instead of collecting constants in a globals file; only cross-module constants go to main.dart.

Instead of a globals file, place constants in the file where they are actually used. When used by multiple files, place it still in one of those file, where it belongs the strongest.
In rare cases, where a constant is used across multiple modules, place it in the entrypoint, like a main.dart file.
