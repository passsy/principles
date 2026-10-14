import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const renderer = source`
  /// Renders invoices.
  class InvoiceRenderer {
    String render(List<String> lines) {
      return _formatLines(lines).join(', ');
    }

    static List<String> _formatLines(List<String> lines) {
      return lines;
    }
  }
`;

test("fires on a private static helper", () => {
  expect(detect(write("lib/invoice_renderer.dart", renderer))).toEqual([{ line: 7 }]);
});

test("stays quiet on a top-level private helper", () => {
  const code = source`
    /// Renders invoices.
    class InvoiceRenderer {
      String render(List<String> lines) {
        return _formatLines(lines).join(', ');
      }
    }

    List<String> _formatLines(List<String> lines) {
      return lines;
    }
  `;
  expect(detect(write("lib/invoice_renderer.dart", code))).toEqual([]);
});

test("stays quiet on a static const and a public static method", () => {
  const code = source`
    class Timeouts {
      static const _zero = Duration.zero;
      static Timeouts parse(String raw) {
        return Timeouts();
      }
    }
  `;
  expect(detect(write("lib/timeouts.dart", code))).toEqual([]);
});

test("stays quiet in test files", () => {
  const code = source`
    class TestHelpers {
      static String _wrap(String value) {
        return value;
      }
    }

    void main() {}
  `;
  expect(detect(write("test/helpers_test.dart", code))).toEqual([]);
});

test("stays quiet on a static helper the agent did not write", () => {
  expect(detect(edit("lib/invoice_renderer.dart", renderer, { written: "    return lines;" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/invoice_renderer.dart", renderer))).toEqual([]);
});
