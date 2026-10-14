import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

test("fires on FormatException around a request, a decode and a parse", () => {
  const code = source`
    Future<Firmware> readFirmware(Device device) async {
      try {
        final response = await connection.request(device, 'fw-version');
        final text = utf8.decode(response);
        return KnownFirmware(Version.parse(text.trim()));
      } on FormatException {
        return const UnknownFirmware();
      } catch (e, stackTrace) {
        await connection.restartSession(device);
        rethrow;
      }
    }
  `;
  expect(detect(write("lib/firmware_reader.dart", code))).toEqual([{ line: 6 }]);
});

test("stays quiet when the request is split from the parse", () => {
  const code = source`
    Future<Firmware> readFirmware(Device device) async {
      final List<int> response;
      try {
        response = await connection.request(device, 'fw-version');
      } catch (e, stackTrace) {
        log('reading the firmware version failed', error: e, stackTrace: stackTrace);
        await connection.restartSession(device);
        return const UnknownFirmware();
      }

      final text = utf8.decode(response, allowMalformed: true).trim();
      try {
        return KnownFirmware(Version.parse(text));
      } on FormatException {
        return const UnknownFirmware();
      }
    }
  `;
  expect(detect(write("lib/firmware_reader.dart", code))).toEqual([]);
});

test("fires on both typed clauses around two synchronous parses", () => {
  const code = source`
    TimeOfDay? parseTimeOfDay(String raw) {
      try {
        final hour = int.parse(raw.substring(0, 2));
        final minute = int.parse(raw.substring(3, 5));
        return TimeOfDay(hour: hour, minute: minute);
      } on FormatException catch (e, stackTrace) {
        return null;
      } on RangeError catch (e, stackTrace) {
        return null;
      }
    }
  `;
  expect(detect(write("lib/time_of_day_parser.dart", code))).toEqual([
    { line: 6 },
    { line: 8 },
  ]);
});

test("stays quiet on one parse next to statements without calls", () => {
  const code = source`
    int? parsePort(String raw) {
      try {
        final port = int.parse(raw);
        return port;
      } on FormatException catch (e, stackTrace) {
        return null;
      }
    }
  `;
  expect(detect(write("lib/port_parser.dart", code))).toEqual([]);
});

test("fires on TimeoutException around several awaits", () => {
  const code = source`
    Future<void> sync(Device device) async {
      try {
        await connection.connect(device);
        await connection.upload(device, settings);
      } on TimeoutException catch (e, stackTrace) {
        log('device did not answer', error: e, stackTrace: stackTrace);
        rethrow;
      }
    }
  `;
  expect(detect(write("lib/device_sync.dart", code))).toEqual([{ line: 5 }]);
});

test("stays quiet on TimeoutException around the one await", () => {
  const code = source`
    Future<bool> isReachable(Device device) async {
      try {
        final pong = await connection.ping(device);
        return pong.isValid;
      } on TimeoutException catch (e, stackTrace) {
        return false;
      }
    }
  `;
  expect(detect(write("lib/device_ping.dart", code))).toEqual([]);
});

test("stays quiet on a broad on Exception around a large block", () => {
  const code = source`
    Future<Firmware> readFirmware(Device device) async {
      try {
        final response = await connection.request(device, 'fw-version');
        final text = utf8.decode(response);
        return KnownFirmware(Version.parse(text.trim()));
      } on Exception catch (e, stackTrace) {
        log('reading the firmware version failed', error: e, stackTrace: stackTrace);
        rethrow;
      }
    }
  `;
  expect(detect(write("lib/firmware_reader.dart", code))).toEqual([]);
});

test("stays quiet in a test asserting the throw", () => {
  const code = source`
    void main() {
      test('throws without a shell', () async {
        try {
          final result = await lister.processes();
          fail('should have thrown, got \$result');
        } on StateError catch (e, stackTrace) {
          // expected
        }
      });
    }
  `;
  expect(detect(write("test/process_lister_test.dart", code))).toEqual([]);
});

test("stays quiet on a wide try that is commented out", () => {
  const code = source`
    // try {
    //   final response = await connection.request(device, 'fw-version');
    //   return KnownFirmware(Version.parse(utf8.decode(response)));
    // } on FormatException {
    //   return const UnknownFirmware();
    // }
    void unused() {}
  `;
  expect(detect(write("lib/firmware_reader.dart", code))).toEqual([]);
});

const config = source`
  Future<Config> loadConfig(File file) async {
    try {
      final raw = await file.readAsString();
      return Config.fromJson(jsonDecode(raw));
    } on FormatException catch (e, stackTrace) {
      throw ConfigException(file.path);
    }
  }
`;

test("stays quiet when an edit only touches the handler of a wide try", () => {
  expect(detect(edit("lib/config_loader.dart", config, { written: "    throw ConfigException(file.path);" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/config_loader.dart", config))).toEqual([]);
});
