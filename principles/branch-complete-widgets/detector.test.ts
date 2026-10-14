import { expect, test } from "vitest";
import { detect, edit, read, write } from "@wellactually/sdk/v3/test";

/** A widget file, so the rule is looking at a widget tree rather than a value object. */
function widgetFile(body: string[]): string {
  return [
    "/// A message list header.",
    "class SectionHeader extends StatelessWidget {",
    "  @override",
    "  Widget build(BuildContext context) {",
    ...body.map((line) => `    ${line}`),
    "  }",
    "}",
    "",
  ].join("\n");
}

const everyProperty = widgetFile([
  "return Header(",
  "  icon: isArchived",
  "      ? const Icon(Icons.archive)",
  "      : const Icon(Icons.inbox),",
  "  title: isArchived",
  "      ? Text(context.l10n.archivedTitle)",
  "      : Text(context.l10n.inboxTitle),",
  "  subtitle: isArchived",
  "      ? Text(context.l10n.archivedHint)",
  "      : UnreadCount(count: unread),",
  ");",
]);

test("fires on the same question at three properties, naming the constructor", () => {
  expect(detect(write("lib/section_header.dart", everyProperty))).toEqual([{ line: 5 }]);
});

test("treats the same question asked from both sides as one question", () => {
  const code = widgetFile([
    "return Header(",
    "  icon: isArchived ? const Icon(Icons.archive) : const Icon(Icons.inbox),",
    "  title: !isArchived ? Text(context.l10n.inbox) : Text(context.l10n.archive),",
    ");",
  ]);
  expect(detect(write("lib/section_header.dart", code))).toEqual([{ line: 5 }]);
});

test("names the widget that holds children repeating a condition", () => {
  const code = widgetFile([
    "return Padding(",
    "  padding: const EdgeInsets.all(8),",
    "  child: Column(",
    "    children: [",
    "      Text(isArchived ? context.l10n.archive : context.l10n.inbox),",
    "      Icon(isArchived ? Icons.archive : Icons.inbox),",
    "    ],",
    "  ),",
    ");",
  ]);
  expect(detect(write("lib/section_header.dart", code))).toEqual([{ line: 7 }]);
});

test("stays quiet on branching the complete widget", () => {
  const code = widgetFile([
    "if (!isArchived) {",
    "  return Header(",
    "    icon: const Icon(Icons.inbox),",
    "    title: Text(context.l10n.inboxTitle),",
    "  );",
    "}",
    "",
    "return Header(",
    "  icon: const Icon(Icons.archive),",
    "  title: Text(context.l10n.archivedTitle),",
    ");",
  ]);
  expect(detect(write("lib/section_header.dart", code))).toEqual([]);
});

const quiet: [string, string[]][] = [
  [
    "independent conditions",
    [
      "return Header(",
      "  icon: isArchived ? const Icon(Icons.archive) : const Icon(Icons.inbox),",
      "  title: hasUnread ? Text(context.l10n.unread) : Text(context.l10n.read),",
      "  trailing: isPinned ? const PinMark() : const SizedBox.shrink(),",
      ");",
    ],
  ],
  [
    "a single varying property",
    ["return Header(", "  icon: isArchived ? const Icon(Icons.archive) : const Icon(Icons.inbox),", "  title: Text(context.l10n.inboxTitle),", ");"],
  ],
  [
    "nullable types, ?? and ?.",
    ["return Header(", "  title: Text(label ?? context.l10n.inboxTitle),", "  subtitle: Text(user?.name ?? fallback ?? other),", "  trailing: Badge(count: counter?.value),", ");"],
  ],
  [
    "two unrelated null checks",
    ["return Header(", "  icon: leading == null ? const Icon(Icons.inbox) : leading,", "  title: label == null ? Text(context.l10n.inboxTitle) : Text(label),", ");"],
  ],
  [
    "callbacks that happen to name their parameter the same",
    [
      "return Column(",
      "  children: [",
      "    Toggle(onChanged: (v) { save(v ? Mode.on : Mode.off); }),",
      "    Toggle(onChanged: (v) { store(v ? Mode.on : Mode.off); }),",
      "  ],",
      ");",
    ],
  ],
  [
    "ternaries in sibling statements",
    ["final label = isArchived ? 'a' : 'b';", "final icon = isArchived ? Icons.archive : Icons.inbox;", "return Text(label);"],
  ],
];

for (const [name, body] of quiet) {
  test(`stays quiet on ${name}`, () => {
    expect(detect(write("lib/section_header.dart", widgetFile(body)))).toEqual([]);
  });
}

test("stays quiet on a value object outside a widget file", () => {
  const code = ["/// Animation timings.", "final timing = Timing(", "  duration: fast ? 1 : 2,", "  delay: fast ? 0 : 5,", ");", ""].join("\n");
  expect(detect(write("lib/timing.dart", code))).toEqual([]);
});

test("stays quiet on legacy repetition when the agent edits another line", () => {
  expect(detect(edit("lib/section_header.dart", everyProperty, { written: "/// A message list header." }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/section_header.dart", everyProperty))).toEqual([]);
});
