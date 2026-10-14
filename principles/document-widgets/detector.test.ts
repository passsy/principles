import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const undocumented = source`
  import 'package:flutter/widgets.dart';

  class DeviceItem extends StatelessWidget {
    const DeviceItem({super.key});

    @override
    Widget build(BuildContext context) => const SizedBox();
  }
`;

test("fires on an undocumented main widget the agent writes", () => {
  expect(detect(write("lib/device_item.dart", undocumented))).toEqual([{ line: 3 }]);
});

test("stays quiet on a documented main widget, with annotations in between", () => {
  const code = source`
    /// Device list item shown on [DevicesPage] and [DevicePickerPage].
    @immutable
    class DeviceItem extends StatelessWidget {
      const DeviceItem({super.key});
    }
  `;
  expect(detect(write("lib/device_item.dart", code))).toEqual([]);
});

test("picks the widget named after the file, leaving internal helpers alone", () => {
  const code = source`
    class ZoneIndicator extends StatelessWidget {}

    /// Heart rate zone selector used on [WorkoutEditorPage].
    class HeartRatePicker extends StatelessWidget {}
  `;
  expect(detect(write("lib/heart_rate_picker.dart", code))).toEqual([]);
});

test("stays quiet when the agent edits a method of an undocumented legacy widget", () => {
  expect(detect(edit("lib/device_item.dart", undocumented, { written: "  Widget build(BuildContext context) => const SizedBox();" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/device_item.dart", undocumented))).toEqual([]);
});

test("stays quiet outside lib", () => {
  expect(detect(write("example/device_item.dart", undocumented))).toEqual([]);
});
