import { expect, test } from "vitest";
import { detect, edit, prompt, read, source, write } from "@wellactually/sdk/v3/test";

const direct = source`
  class ConnectionPage extends StatelessWidget {
    ConnectionPage(this.analytics);
    final ConnectionAnalytics analytics;

    @override
    Widget build(BuildContext context) {
      analytics.pageShown();
      return const Placeholder();
    }
  }
`;

test("fires on a direct analytics call during build", () => {
  expect(detect(write("lib/connection_page.dart", direct))).toEqual([{ line: 7 }]);
});

const forwarding = source`
  class ConnectionPage extends StatefulWidget {
    const ConnectionPage({required this.analytics, super.key});
    final ConnectionAnalytics analytics;
  }

  class ConnectionPageState extends State<ConnectionPage> {
    @override
    Widget build(BuildContext context) {
      _report(isConnected: true);
      return const Placeholder();
    }

    void _report({required bool isConnected}) {
      if (isConnected) {
        widget.analytics.backpackConnected();
      }
    }
  }
`;

test("fires on a forwarding method called during build", () => {
  expect(detect(write("lib/connection_page.dart", forwarding))).toEqual([{ line: 9 }]);
});

test("fires when an edit adds the call to an existing build", () => {
  expect(detect(edit("lib/connection_page.dart", direct, { written: "    analytics.pageShown();" }))).toEqual([{ line: 7 }]);
});

test("stays quiet on analytics in lifecycle methods and user action callbacks", () => {
  const code = source`
    class ConnectionPageState extends State<ConnectionPage> {
      @override
      void didChangeDependencies() {
        super.didChangeDependencies();
        widget.analytics.pageShown();
      }

      @override
      Widget build(BuildContext context) {
        return FilledButton(
          onPressed: () {
            widget.analytics.confirmClicked();
          },
          child: const Text('Confirm'),
        );
      }
    }
  `;
  expect(detect(write("lib/connection_page.dart", code))).toEqual([]);
});

test("stays quiet when the edit did not touch the call", () => {
  expect(detect(edit("lib/connection_page.dart", direct, { written: "    return const Placeholder();" }))).toEqual([]);
});

test("stays quiet when the agent only reads the file", () => {
  expect(detect(read("lib/connection_page.dart", direct))).toEqual([]);
});

test("stays quiet in a test file", () => {
  expect(detect(write("test/connection_page_test.dart", direct))).toEqual([]);
});

test("has no text trigger", () => {
  expect(detect(prompt("Track analytics when the page builds"))).toEqual([]);
});
