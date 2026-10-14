import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const lonely = source`
  // How strong the trainer signal is.
  enum SignalStrength { lost, poor, fair, good, best }
`;

test("fires on an enum the agent puts in a file of its own", () => {
  expect(detect(write("lib/signal_strength.dart", lonely))).toEqual([{ line: 2 }]);
});

test("stays quiet when the enum sits next to its class", () => {
  const code = source`
    class SignalMeter {
      SignalStrength strength = SignalStrength.lost;
    }

    enum SignalStrength { lost, poor, fair, good, best }
  `;
  expect(detect(write("lib/signal_meter.dart", code))).toEqual([]);
});

test("stays quiet when a top-level function gives the file its own reason", () => {
  const code = source`
    enum SignalStrength { lost, poor, fair, good, best }

    SignalStrength? fromRssi(int? rssi) {
      return SignalStrength.lost;
    }
  `;
  expect(detect(write("lib/signal_strength.dart", code))).toEqual([]);
});

test("stays quiet when the edit writes no enum", () => {
  expect(detect(edit("lib/signal_strength.dart", lonely, { written: "// How strong the trainer signal is." }))).toEqual([]);
});

test("stays quiet on a read and in tests", () => {
  expect(detect(read("lib/signal_strength.dart", lonely))).toEqual([]);
  expect(detect(write("test/signal_strength_test.dart", lonely))).toEqual([]);
});
