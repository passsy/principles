import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const router = source`
  /// Picks the runner.
  class Router {
    int pick(bool flutter) {
      if (flutter) {
        return 1;
      } else {
        return 2;
      }
    }
  }
`;

test("fires on an else branch the agent writes", () => {
  expect(detect(write("lib/router.dart", router))).toEqual([{ line: 6 }]);
});

const legacy = source`
  int classify(bool narrow, bool wide) {
    if (narrow) {
      return 1;
    } else {
      return 3;
    }
    if (wide) {
      return 2;
    } else {
      return 0;
    }
  }
`;

test("an edit that writes its own else fires on that line only", () => {
  expect(detect(edit("lib/classify.dart", legacy, { written: "  if (wide) {\n    return 2;\n  } else {\n    return 0;\n  }" }))).toEqual([{ line: 9 }]);
});

test("stays quiet on a legacy else when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/classify.dart", legacy, { written: "      return 3;" }))).toEqual([]);
  expect(detect(read("lib/router.dart", router))).toEqual([]);
});

test("stays quiet inside a build method", () => {
  const code = source`
    class StatusView extends StatelessWidget {
      const StatusView({super.key, required this.ready});

      final bool ready;

      @override
      Widget build(BuildContext context) {
        if (ready) {
          return const Text('ready');
        } else {
          return const Text('waiting');
        }
      }
    }
  `;
  expect(detect(write("lib/status_view.dart", code))).toEqual([]);
});

test("stays quiet on a guard without else", () => {
  const code = source`
    int? parse(String? raw) {
      if (raw == null) {
        return null;
      }
      return int.tryParse(raw);
    }
  `;
  expect(detect(write("lib/guard.dart", code))).toEqual([]);
});
