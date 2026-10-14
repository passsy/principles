import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const normalize = source`
  int normalize(int value) {
    if (value < 0) return 0;
    final normalized = value + 1;
    return normalized;
  }
`;

test("fires on a lone inline guard before procedural work", () => {
  expect(detect(write("lib/normalize.dart", normalize))).toEqual([{ line: 2 }]);
});

test("fires on a bare inline return and an inline throw", () => {
  const code = source`
    Future<void> save() async {
      if (!mounted) return;
      if (!opened) throw Exception('failed to open');
      await repository.save(data);
    }
  `;
  expect(detect(write("lib/save.dart", code))).toEqual([
    { line: 2 },
    { line: 3 },
  ]);
});

test("stays quiet on a mapper that keeps multiple condition-result pairs together", () => {
  const code = source`
    SignalStrength? fromRssi(int? rssi) {
      logRssi(rssi);
      if (rssi == null || rssi >= 0) return SignalStrength.lost;
      if (rssi > -60) return SignalStrength.best;
      if (rssi > -70) return SignalStrength.good;
      if (rssi > -80) return SignalStrength.fair;
    }
  `;
  expect(detect(write("lib/signal_strength.dart", code))).toEqual([]);
});

test("stays quiet on a block guard", () => {
  const code = source`
    void save() {
      if (!mounted) {
        return;
      }
      repository.save(data);
    }
  `;
  expect(detect(write("lib/save.dart", code))).toEqual([]);
});

test("stays quiet on a legacy inline guard when the agent edits elsewhere or reads", () => {
  expect(detect(edit("lib/normalize.dart", normalize, { written: "  final normalized = value + 1;" }))).toEqual([]);
  expect(detect(read("lib/normalize.dart", normalize))).toEqual([]);
});

const dartApp = { project: "fixtures/dart_app" };

test("points at the principle when the user mentions a guard clause", () => {
  expect(detect(prompt("Add a guard clause for the empty list"), dartApp)).toEqual([{ match: "guard clause", depth: "pointer" }]);
});

test("stays quiet on the same words outside a Dart project", () => {
  expect(detect(prompt("Add a guard clause for the empty list"))).toEqual([]);
});
