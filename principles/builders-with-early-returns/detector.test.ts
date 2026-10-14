import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const statusView = source`
  import 'package:flutter/widgets.dart';

  /// Shows load state; used on the home page.
  class StatusView extends StatelessWidget {
    const StatusView({super.key, required this.ready});

    final bool ready;

    @override
    Widget build(BuildContext context) {
      if (ready) {
        return const Text('ready');
      } else {
        return const Text('loading');
      }
    }
  }
`;

test("fires on an else branch the agent writes in a build method", () => {
  expect(detect(write("lib/status_view.dart", statusView))).toEqual([{ line: 13 }]);
});

test("fires on a multi-line ternary in a build method", () => {
  const code = source`
    class StatusView extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return isLoading
            ? const LoadingIndicator()
            : const Content();
      }
    }
  `;
  expect(detect(write("lib/status_view.dart", code))).toEqual([
    { line: 5 },
    { line: 6 },
  ]);
});

test("stays quiet on a Builder with early returns", () => {
  const code = source`
    class StatusView extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return Builder(builder: (context) {
          if (isLoading) return const LoadingIndicator();
          if (hasError) return const ErrorView();
          return const Content();
        });
      }
    }
  `;
  expect(detect(write("lib/status_view.dart", code))).toEqual([]);
});

test("stays quiet on an else outside the build method", () => {
  const code = source`
    class StatusView extends StatelessWidget {
      @override
      Widget build(BuildContext context) => const SizedBox();

      int pick(bool flutter) {
        if (flutter) {
          return 1;
        } else {
          return 2;
        }
      }
    }
  `;
  expect(detect(write("lib/status_view.dart", code))).toEqual([]);
});

test("stays quiet on a one-line ternary", () => {
  const code = source`
    class StatusView extends StatelessWidget {
      @override
      Widget build(BuildContext context) {
        return ready ? const Text('ready') : const Text('loading');
      }
    }
  `;
  expect(detect(write("lib/status_view.dart", code))).toEqual([]);
});

test("stays quiet on a legacy else when the agent edits another line", () => {
  expect(detect(edit("lib/status_view.dart", statusView, { written: "  final bool ready;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/status_view.dart", statusView))).toEqual([]);
});
