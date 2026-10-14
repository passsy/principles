import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const snapshot = source`
  Future<Rates> loadRates() async {
    try {
      return await api.fetchRates();
    } catch (e, stack) {
      log('rates unavailable', error: e, stackTrace: stack);
      return _lastSnapshot;
    }
  }
`;

test("a catch that returns a substitute value fires on the return", () => {
  expect(detect(write("lib/rates.dart", snapshot))).toEqual([{ line: 6 }]);
});

test("a catch the agent did not write stays quiet, and so does a read", () => {
  expect(detect(edit("lib/rates.dart", snapshot, { written: "    return await api.fetchRates();" }))).toEqual([]);
  expect(detect(read("lib/rates.dart", snapshot))).toEqual([]);
});

test("a catch that rethrows stays quiet", () => {
  expect(detect(write("lib/rates.dart", snapshot.replace("return _lastSnapshot;", "rethrow;")))).toEqual([]);
});

test("returning null or a bool from a catch is absence or an answer, not a substitute", () => {
  const code = source`
    Point? tryParsePoint(String raw) {
      try {
        return Point.parse(raw);
      } catch (e, stack) {
        return null;
      }
    }

    bool isValidPort(String raw) {
      try {
        int.parse(raw);
        return true;
      } on FormatException catch (e, stackTrace) {
        return false;
      }
    }
  `;
  expect(detect(write("lib/parse.dart", code))).toEqual([]);
});

test("a return after the catch block closed is not inside it", () => {
  const code = source`
    Future<Rates> loadRates() async {
      try {
        _fresh = await api.fetchRates();
      } catch (e, stack) {
        log('rates unavailable', error: e, stackTrace: stack);
        rethrow;
      }
      return _fresh;
    }
  `;
  expect(detect(write("lib/rates.dart", code))).toEqual([]);
});

test("a promise handler handing back a plain value fires, in any language", () => {
  const code = source`
    export function loadRates(): Promise<Rates> {
      return fetchRates().catch(() => cachedRates);
    }
  `;
  expect(detect(write("src/rates.ts", code))).toEqual([{ line: 2 }]);
});

test("a promise handler that reports the error is not a fallback", () => {
  expect(detect(write("src/rates.ts", "return fetchRates().catch((error) => report(error));"))).toEqual([]);
});

test("a fallback in a test cannot reach a user", () => {
  expect(detect(write("test/rates_test.dart", snapshot))).toEqual([]);
});

test("a made-up string as a null-coalescing default fires", () => {
  const code = source`
    String greeting(User user) {
      final name = user.name ?? "Hans";
      return 'Hello $name';
    }
  `;
  expect(detect(write("lib/greeting.dart", code))).toEqual([{ line: 2 }]);
});

test("an empty string or a chosen value as the default stays quiet", () => {
  const code = source`
    String greeting(User user, String placeholder) {
      final shown = user.name ?? '';
      final label = user.nickname ?? placeholder;
      return '$shown $label';
    }
  `;
  expect(detect(write("lib/greeting.dart", code))).toEqual([]);
});

test("the Kotlin elvis default fires, a TypeScript optional property does not", () => {
  expect(detect(write("app/Greeting.kt", 'fun greeting(user: User): String {\n  return user.name ?: "Hans"\n}'))).toEqual([{ line: 2 }]);
  expect(detect(write("src/user.ts", "export interface User {\n  name?: string;\n}"))).toEqual([]);
});

test("a code example in markdown is prose, not a fallback", () => {
  expect(detect(write("docs/rates.md", "```dart\ntry {\n  x();\n} catch (e) {\n  return cached;\n}\n```"))).toEqual([]);
});
