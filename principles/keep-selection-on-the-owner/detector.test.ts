import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/detector-sdk/v3/test";

const finding = source`
  export interface Fix {
    id: string;
    description: string;
    recommended?: boolean;
  }

  export interface Finding {
    fixes: Fix[];
  }
`;

test("fires on a recommended flag on a TypeScript list item", () => {
  expect(detect(write("src/records.ts", finding))).toEqual([{ line: 4, match: "recommended" }]);
});

test("fires on isDefault on a Dart class held in a List", () => {
  const code = source`
    class Address {
      Address({required this.street, this.isDefault = false});

      final String street;
      final bool isDefault;
    }

    class Customer {
      Customer(this.addresses);

      final List<Address> addresses;
    }
  `;
  expect(detect(write("lib/customer.dart", code))).toEqual([{ line: 5, match: "isDefault" }]);
});

test("fires on isSelected in a type alias held in a readonly array", () => {
  const code = source`
    type Row = {
      readonly id: string;
      readonly isSelected: boolean;
    };

    export function render(rows: ReadonlyArray<Row>) {
      return rows.length;
    }
  `;
  expect(detect(write("src/table.tsx", code))).toEqual([{ line: 3, match: "isSelected" }]);
});

test("fires on a Dart field typed with a selection enum of the same file", () => {
  const code = source`
    enum MarkerState { selected, unselected }

    class ScanMarker {
      ScanMarker({required this.id, this.state = MarkerState.unselected});

      final String id;
      final MarkerState state;
    }

    class ScanMapModel {
      final List<ScanMarker> _allMarkers = [];
    }
  `;
  expect(detect(write("lib/scan_map_model.dart", code))).toEqual([{ line: 7, match: "MarkerState" }]);
});

test("stays quiet on a Dart field typed with an enum without a selection value", () => {
  const code = source`
    enum TicketStatus { open, inProgress, done }

    class Ticket {
      final String id;
      final TicketStatus status;
    }

    final List<Ticket> tickets = [];
  `;
  expect(detect(write("lib/ticket.dart", code))).toEqual([]);
});

test("fires when the agent adds the flag to a file that already holds the list", () => {
  const updated = finding.replace("  description: string;\n", "  description: string;\n  accepted: boolean;\n");
  expect(detect(edit("src/records.ts", updated, { written: "  accepted: boolean;" }))).toEqual([{ line: 4, match: "accepted" }]);
});

test("stays quiet when the agent edits another line or only reads the file", () => {
  expect(detect(edit("src/records.ts", finding, { written: "  description: string;" }))).toEqual([]);
  expect(detect(read("src/records.ts", finding))).toEqual([]);
});

test("stays quiet on the pick held by the owner", () => {
  const code = source`
    export interface Fix {
      id: string;
      description: string;
    }

    export interface Finding {
      fixes: Fix[];
      recommendedFix?: string;
      selected: Set<string>;
    }
  `;
  expect(detect(write("src/records.ts", code))).toEqual([]);
});

test("stays quiet on a flag of a type no collection holds", () => {
  const code = source`
    class Settings {
      final bool isDefault;
      final bool selected;
    }
  `;
  expect(detect(write("lib/settings.dart", code))).toEqual([]);
});

test("stays quiet on item properties any number of items can have", () => {
  const code = source`
    class Todo {
      final String title;
      final bool done;
      final bool isActive;
      final bool isArchived;
    }

    final todos = <Todo>[];
    List<Todo> visible(List<Todo> all) => all;
  `;
  expect(detect(write("lib/todo.dart", code))).toEqual([]);
});

test("stays quiet on a widget that takes selected from its owner", () => {
  const code = source`
    class Chip extends StatelessWidget {
      const Chip({required this.label, required this.selected});

      final String label;
      final bool selected;
    }

    final List<Chip> chips = [];
  `;
  expect(detect(write("lib/chip.dart", code))).toEqual([]);
});

test("stays quiet in a declaration file", () => {
  expect(detect(write("types/records.d.ts", finding))).toEqual([]);
});

test("judges a full write of a large file within its time", () => {
  const item = (i: number) =>
    `export interface Item${i} {\n  id: string;\n  title: string;\n  done: boolean;\n${i % 50 === 0 ? "  selected: boolean;\n" : ""}}\n\nexport type Items${i} = Item${i}[];\n`;
  const code = Array.from({ length: 200 }, (_, i) => item(i)).join("\n");
  // 200 item types, one flag in every fiftieth. Kept small enough for a slower CI runner.
  const lines = code.split("\n");
  const expected = lines.flatMap((text, i) => (text === "  selected: boolean;" ? [{ line: i + 1, match: "selected" }] : []));
  expect(expected).toHaveLength(4);
  expect(detect(write("src/items.ts", code))).toEqual(expected);
});
