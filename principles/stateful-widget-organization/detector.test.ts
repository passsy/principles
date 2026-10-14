import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const split = source`
  class Counter extends StatefulWidget {
    const Counter({super.key});

    @override
    State<Counter> createState() => _CounterState();
  }

  const _step = 1;

  class _CounterState extends State<Counter> {
    int count = 0;
  }
`;

test("fires on a declaration between the widget and its State", () => {
  expect(detect(write("lib/counter.dart", split))).toEqual([{ line: 8 }]);
});

test("fires on a function between the pair", () => {
  const code = source`
    class Counter extends StatefulWidget {
      @override
      State<Counter> createState() => _CounterState();
    }

    int increment(int value) => value + 1;

    class _CounterState extends State<Counter> {}
  `;
  expect(detect(write("lib/counter.dart", code))).toEqual([{ line: 6 }]);
});

test("stays quiet when the pair is adjacent", () => {
  const code = source`
    class Counter extends StatefulWidget {
      const Counter({super.key});

      @override
      State<Counter> createState() => _CounterState();
    }

    class _CounterState extends State<Counter> {
      int count = 0;
    }

    const _step = 1;
  `;
  expect(detect(write("lib/counter.dart", code))).toEqual([]);
});

test("stays quiet when the edit does not touch the pair", () => {
  expect(detect(edit("lib/counter.dart", split, { written: "  int count = 0;" }))).toEqual([]);
});

test("fires when the edit touches the pair", () => {
  expect(detect(edit("lib/counter.dart", split, { written: "class _CounterState extends State<Counter> {" }))).toEqual([{ line: 8 }]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/counter.dart", split))).toEqual([]);
});

test("stays quiet in a test file", () => {
  expect(detect(write("test/counter_test.dart", split))).toEqual([]);
});

test("has no text trigger", () => {
  expect(detect(prompt("Put a helper between the StatefulWidget and its State"))).toEqual([]);
});
