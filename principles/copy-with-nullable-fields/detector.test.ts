import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const profile = source`
  /// A user profile.
  class Profile {
    final String? bio;

    const Profile(this.bio);

    Profile copyWith({String? bio}) {
      return Profile(bio ?? this.bio);
    }
  }
`;

test("fires on the naive ?? this. fallback beside a nullable field", () => {
  expect(detect(write("lib/profile.dart", profile))).toEqual([{ line: 8 }]);
});

test("stays quiet on the sentinel pattern", () => {
  const code = source`
    const Object defaultArgument = Object();

    class Profile {
      final String? bio;

      const Profile(this.bio);

      Profile Function({String? bio}) get copyWith => _copyWith;

      Profile _copyWith({Object? bio = defaultArgument}) {
        return Profile(identical(bio, defaultArgument) ? this.bio : bio as String?);
      }
    }
  `;
  expect(detect(write("lib/profile.dart", code))).toEqual([]);
});

test("stays quiet on a plain copyWith without nullable fields", () => {
  const code = source`
    class Size {
      const Size({required this.width, required this.height});

      final double width;
      final double height;

      Size copyWith({double? width, double? height}) {
        return Size(width: width ?? this.width, height: height ?? this.height);
      }
    }
  `;
  expect(detect(write("lib/size.dart", code))).toEqual([]);
});

test("stays quiet on a legacy copyWith when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/profile.dart", profile, { written: "  const Profile(this.bio);" }))).toEqual([]);
  expect(detect(read("lib/profile.dart", profile))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions copyWith", () => {
  expect(detect(prompt("Add a copyWith to Profile"), dartApp)).toEqual([{ match: "copyWith", depth: "pointer" }]);
});

test("points at the principle on the same words without a pubspec.yaml", () => {
  expect(detect(prompt("Add a copyWith to Profile"))).toEqual([{ match: "copyWith", depth: "pointer" }]);
});
