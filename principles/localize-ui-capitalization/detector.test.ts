import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

test.each(["return Text(context.l10n.save.toUpperCase());", "final tooltip = context.l10n.deleteTooltip.toUpperCase();", "Text(title.toUpperCase()),"])(
  "fires on runtime casing of display text: %s",
  (line) => {
    expect(detect(write("lib/save_button.dart", `Widget build(BuildContext context) {\n  ${line}\n}\n`))).toEqual([{ line: 2 }]);
  },
);

test("stays quiet on lowercase conversion", () => {
  expect(detect(write("lib/save_button.dart", "Widget build(BuildContext context) {\n  return Text(context.l10n.save.toLowerCase());\n}\n"))).toEqual([]);
});

test("stays quiet on case conversion for non-display normalization", () => {
  const code = source`
    String normalizeProtocolKey(String protocolKey) {
      return protocolKey.toUpperCase();
    }

    Widget build(BuildContext context) {
      return Text(context.l10n.saveButton);
    }
  `;
  expect(detect(write("lib/status.dart", code))).toEqual([]);
});

const legacy = "Widget build(BuildContext context) {\n  return Text(context.l10n.save.toUpperCase());\n}\nconst gap = 8;\n";

test("stays quiet on legacy casing when the agent edits another line", () => {
  expect(detect(edit("lib/save_button.dart", legacy, { written: "const gap = 8;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/save_button.dart", legacy))).toEqual([]);
});

test("stays quiet in generated localization code", () => {
  expect(detect(write("lib/l10n.g.dart", "String get saveUpper => l10n.save.toUpperCase();"))).toEqual([]);
});
