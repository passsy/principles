import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

/** A Dart file whose body is `lines`, written by the agent in one write. */
function sync(lines: string[]): string {
  return ["void sync() {", ...lines.map((line) => `  ${line}`), "}"].join("\n");
}

test("an if joining two clauses fires", () => {
  expect(detect(write("lib/sync.dart", sync(["if (fileChanged && Platform.isMacOS) {", "  refreshFinderIcon();", "}"])))).toEqual([{ line: 2 }]);
});

test("it does not judge: a null check joined to its use fires too", () => {
  expect(detect(write("lib/sync.dart", sync(["if (user != null && user.isAdmin) {", "  open();", "}"])))).toEqual([{ line: 2 }]);
});

test("an else if fires", () => {
  expect(detect(write("lib/sync.dart", sync(["if (isIdle) {", "  open();", "} else if (fileChanged && isVisible) {", "  open();", "}"])))).toEqual([{ line: 4 }]);
});

test("a condition that wraps fires on the line of its if, wherever the && sits", () => {
  expect(detect(write("lib/sync.dart", sync(["if (fileChanged &&", "    Platform.isMacOS) {", "  open();", "}"])))).toEqual([{ line: 2 }]);
  expect(detect(write("lib/sync.dart", sync(["if (fileChanged", "    && Platform.isMacOS) {", "  open();", "}"])))).toEqual([{ line: 2 }]);
});

test("adding a clause on a continuation line fires for the if above it", () => {
  const code = source`
    void sync() {
      if (fileChanged(
            path,
          ) &&
          Platform.isMacOS) {
        open();
      }
    }
  `;
  expect(detect(edit("lib/sync.dart", code, { written: "      ) &&\n      Platform.isMacOS) {" }))).toEqual([{ line: 2 }]);
});

test("editing a line outside a joined condition stays quiet, and so does a read", () => {
  const code = sync(["if (fileChanged && isVisible) {", "  open();", "}"]);
  expect(detect(edit("lib/sync.dart", code, { written: "    open();" }))).toEqual([]);
  expect(detect(read("lib/sync.dart", code))).toEqual([]);
});

test("the nested form the rule asks for stays quiet", () => {
  expect(detect(write("lib/sync.dart", sync(["if (fileChanged) {", "  if (Platform.isMacOS) {", "    refreshFinderIcon();", "  }", "}"])))).toEqual([]);
});

test("an && outside an if condition or in a comment stays quiet", () => {
  const lines = ["final ready = fileChanged && isVisible;", "// if (fileChanged && isVisible) was joined before", "if (name == 'a') {", "  open();", "}"];
  expect(detect(write("lib/sync.dart", sync(lines)))).toEqual([]);
});

test("other languages are left alone", () => {
  expect(detect(write("src/sync.ts", "if (changed && visible) {\n  open();\n}"))).toEqual([]);
});
