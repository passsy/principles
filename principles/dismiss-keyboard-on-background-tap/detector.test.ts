import { expect, test } from "vitest";
import { detect, edit, read, write } from "@wellactually/sdk/v3/test";

test.each([
  "TextField()",
  "TextFormField()",
  "CupertinoTextField()",
  "ReactiveTextField<String>()",
  "CustomTextFormField<String>()",
  "_PrivateTextField()",
  "fields.SearchTextField.named()",
  "TextField(onTapOutside: (event) { dismissKeyboard(); })",
])("fires on a newly written %s", (field) => {
  expect(detect(write("lib/input.dart", `final field = ${field};\n`))).toEqual([{ line: 1 }]);
});

test("fires on the field name when the arguments start on another line", () => {
  expect(detect(write("lib/input.dart", "final field = CustomTextField\n<String>(\n);\n"))).toEqual([{ line: 1 }]);
});

test.each([
  "// TextField()",
  "final controller = TextFieldController();",
  "final state = CustomTextFormFieldState();",
  "final field = TextFields();",
])("stays quiet on code that is not a field: %s", (code) => {
  expect(detect(write("lib/input.dart", code))).toEqual([]);
});

test.each(["test/input_test.dart", "lib/input.g.dart"])("stays quiet in %s", (path) => {
  expect(detect(write(path, "final field = TextField();"))).toEqual([]);
});

test("stays quiet on an untouched field when the agent edits elsewhere", () => {
  expect(detect(edit("lib/input.dart", "final field = TextField();\nfinal count = 2;", { written: "final count = 2;" }))).toEqual([]);
});

test("stays quiet when the agent only reads a field", () => {
  expect(detect(read("lib/input.dart", "final field = TextField();"))).toEqual([]);
});
