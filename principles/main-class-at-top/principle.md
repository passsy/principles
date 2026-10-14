# Place Main Class at the Top

Put the class a file is named after at the very top of the file, above its helper classes, enums and extensions, so readers meet the main type first.

When a file is named a.dart and contains a class A, it should be at the very top.

```
// Bad
// image_api.dart

class Photo {}

class ImageApi {
    List<Photo> getPhotos() { /* */ }
}

```

```
// Good
// image_api.dart

class ImageApi {
    List<Photo> getPhotos() { /* */ }
}

class Photo {}
```
