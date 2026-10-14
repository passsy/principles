import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const status = source`
  LoadingStatus status(bool isLoading, bool hasError) {
    final status = isLoading
        ? LoadingStatus.inProgress
        : hasError
            ? LoadingStatus.error
            : LoadingStatus.success;
    return status;
  }
`;

test("fires on each line of a ternary written across lines", () => {
  expect(detect(write("lib/status.dart", status))).toEqual([
    { line: 3 },
    { line: 4 },
    { line: 5 },
    { line: 6 },
  ]);
});

test("fires on a condition ending a line", () => {
  const code = source`
    String caption(bool loading) {
      final label = loading ?
          'loading' :
          'done';
      return label;
    }
  `;
  expect(detect(write("lib/caption.dart", code))).toEqual([{ line: 2 }]);
});

test("stays quiet on a single-line ternary", () => {
  expect(detect(write("lib/status.dart", "String caption(bool busy) => busy ? 'busy' : 'idle';"))).toEqual([]);
});

test("stays quiet on a nullable type and ??", () => {
  const code = source`
    String fallback(String? raw) {
      return raw ??
          'missing';
    }
  `;
  expect(detect(write("lib/fallback.dart", code))).toEqual([]);
});

test("stays quiet on a legacy ternary when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/status.dart", status, { written: "  return status;" }))).toEqual([]);
  expect(detect(read("lib/status.dart", status))).toEqual([]);
});

test("stays quiet inside a build method", () => {
  const code = source`
    class Body extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return isLoading
            ? const Spinner()
            : const Content();
      }
    }
  `;
  expect(detect(write("lib/body.dart", code))).toEqual([]);
});
