import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const card = source`
  class StatusCard extends StatelessWidget {
    const StatusCard({required this.title, required this.message, required this.productId, super.key});

    final String title;
    final String? message;
    final String productId;

    @override
    Widget build(BuildContext context) => Text(title);
  }
`;

test("fires on String fields for display text in a widget the agent writes", () => {
  expect(detect(write("lib/status_card.dart", card))).toEqual([
    { line: 4 },
    { line: 5 },
  ]);
});

test("stays quiet on Widget parameters", () => {
  const code = source`
    class StatusCard extends StatelessWidget {
      final Widget title;
      final Widget message;
    }
  `;
  expect(detect(write("lib/status_card.dart", code))).toEqual([]);
});

test("stays quiet on a String field outside a widget", () => {
  const code = source`
    class Notification {
      final String title;
    }
  `;
  expect(detect(write("lib/notification.dart", code))).toEqual([]);
});

test("stays quiet on legacy fields when the agent edits another line", () => {
  expect(detect(edit("lib/status_card.dart", card, { written: "  final String productId;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/status_card.dart", card))).toEqual([]);
});
