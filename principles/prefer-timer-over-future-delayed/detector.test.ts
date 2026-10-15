import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const state = source`
  class _MyWidgetState extends State<MyWidget> {
    void _startDelayed() {
      Future.delayed(const Duration(seconds: 3), () {
        setState(() => _showContent = true);
      });
    }
  }
`;

test("fires on Future.delayed written in a State class", () => {
  expect(detect(write("lib/my_widget.dart", state))).toEqual([{ line: 3 }]);
});

test("stays quiet on Future.delayed in pure Dart code", () => {
  const service = source`
    class Retry {
      Future<void> wait() => Future.delayed(const Duration(seconds: 1));
    }
  `;
  expect(detect(write("lib/retry.dart", service))).toEqual([]);
});

test("stays quiet on a Timer", () => {
  const code = source`
    class _MyWidgetState extends State<MyWidget> {
      Timer? _delayTimer;
      void _start() {
        _delayTimer = Timer(const Duration(seconds: 3), _show);
      }
    }
  `;
  expect(detect(write("lib/my_widget.dart", code))).toEqual([]);
});

test("stays quiet on a Future.delayed the edit did not touch", () => {
  expect(detect(edit("lib/my_widget.dart", state, { written: "        setState(() => _showContent = true);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/my_widget.dart", state))).toEqual([]);
});

test("stays quiet in a test file", () => {
  expect(detect(write("test/my_widget_test.dart", state))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions Future.delayed in a Dart project", () => {
  expect(detect(prompt("Show the banner after a Future.delayed of two seconds"), dartApp)).toEqual([{ match: "Future.delayed", depth: "pointer" }]);
});

test("points at the principle on the same words without a pubspec.yaml", () => {
  expect(detect(prompt("Show the banner after a Future.delayed of two seconds"))).toEqual([{ match: "Future.delayed", depth: "pointer" }]);
});

test("stays quiet on a prompt about something else", () => {
  expect(detect(prompt("Show the banner after two seconds"), dartApp)).toEqual([]);
});
