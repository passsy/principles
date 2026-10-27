import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const nested = source`
  void submit(Order? order, User? user) {
    if (order != null) {
      if (user != null) {
        saveOrder(order, user);
        sendConfirmation(order);
      } else {
        showLoginRequired();
      }
    } else {
      showMissingOrder();
    }
  }
`;

test("points once at the enclosing nested conditional", () => {
  expect(detect(write("lib/order.dart", nested))).toEqual([{ line: 2, endLine: 11 }]);
});

test("notices edits inside an existing conditional, not only a rewritten else", () => {
  expect(detect(edit("lib/order.dart", nested, { written: "    saveOrder(order, user);" }))).toEqual([{ line: 2, endLine: 11 }]);
});

test("leaves flat two-way returns, assignments and operations alone", () => {
  for (const bodies of [["return flutter(args);", "return dart(args);"], ["caption = top;", "caption = next;"], ["hidePhoto();", "deletePhoto();"]]) {
    const code = `void f() {\n  if (flag) {\n    ${bodies[0]}\n  } else {\n    ${bodies[1]}\n  }\n}`;
    expect(detect(write("lib/flat.dart", code))).toEqual([]);
  }
});

test("branch count alone does not flag flat dispatch", () => {
  const code = source`
    void route() {
      if (mode == 1) {
        one();
      } else if (mode == 2) {
        two();
      } else if (mode == 3) {
        three();
      } else {
        other();
      }
    }
  `;
  expect(detect(write("lib/route.dart", code))).toEqual([]);
});

const guarded = source`
  void process(bool skip, bool invalid) {
    if (skip) {
      return;
    } else {
      final input = load();
      if (invalid) {
        reject(input);
      }
      save(input);
      notify();
    }
    finish();
  }
`;

test("an existing unconditional exit can release substantial nested work", () => {
  expect(detect(write("lib/process.dart", guarded))).toEqual([{ line: 2, endLine: 11 }]);
});

test("moving a closing brace or else to its own line does not hide the region", () => {
  const code = guarded.replace("  } else {", "  }\n  else\n  {");
  expect(detect(write("lib/process.dart", code))).toEqual([{ line: 2, endLine: 13 }]);
});

test("a multiline condition with named arguments is counted as one condition", () => {
  const code = guarded.replace("if (skip)", "if (canSkip(\n    options: Options(flags: {'skip': true}),\n  ))");
  expect(detect(write("lib/process.dart", code))).toEqual([{ line: 2, endLine: 13 }]);
});

test("does not insert a guard across shared follow-up work", () => {
  const code = nested.replace("\n}", "\n  finish();\n}");
  expect(detect(write("lib/order.dart", code))).toEqual([]);
});

test("a prerequisite funnel must not skip follow-up work inside its outer branch", () => {
  const withCleanup = nested.replace("  } else {\n    showMissingOrder();", "    cleanup();\n  } else {\n    showMissingOrder();");
  expect(detect(write("lib/order.dart", withCleanup))).toEqual([]);
});

test("the end of an enclosing if is not the end of a function", () => {
  const code = `void f() {\n  if (enabled) {\n${nested.split("\n").slice(1, -1).map((line) => `  ${line}`).join("\n")}\n  }\n  finish();\n}`;
  expect(detect(write("lib/order.dart", code))).toEqual([]);
});

test("a nested callback does not count as nesting in its caller", () => {
  const code = source`
    void setup() {
      if (skip) {
        return;
      } else {
        final listener = stream.listen((message) {
          if (message != null) {
            use(message);
          }
        });
        register(listener);
      }
    }
  `;
  expect(detect(write("lib/listener.dart", code))).toEqual([]);
});

test("a terminal callback owns its own prerequisite funnel", () => {
  const body = nested.split("\n").slice(1, -1).join("\n");
  const code = `void setup() {\n  listen((event) {\n${body}\n  });\n  finish();\n}`;
  expect(detect(write("lib/listener.dart", code))).toHaveLength(1);
});

test("two terminal platform alternatives stay quiet despite uneven size", () => {
  const code = source`
    int lineNumber() {
      if (web) {
        final match = parseWeb();
        if (match == null) {
          throw StateError('No line');
        }
        final line = match.line;
        return int.parse(line);
      } else {
        final parts = parseNative();
        return parts.line;
      }
    }
  `;
  expect(detect(write("test/line_number_test.dart", code))).toEqual([]);
});

test("a missing-data default does not condemn an ordinary source-selection ladder", () => {
  const code = source`
    int? battery() {
      int result;
      if (advertised != null) {
        final level = advertised;
        if (level == 0) {
          result = 100;
        } else {
          result = 20;
        }
      } else if (reported != null) {
        result = reported;
      } else {
        return null;
      }
      return result;
    }
  `;
  expect(detect(write("lib/battery.dart", code))).toEqual([]);
});

test("a conditional inline return is not an unconditional short exit", () => {
  const code = source`
    bool covered() {
      if (node is Group) {
        final state = node.state;
        if (state != partial) {
          if (broken) return false;
          if (matching) return true;
        }
      } else if (node is Shape) {
        if (broken) return false;
        if (matching) return true;
      }
      return false;
    }
  `;
  expect(detect(write("lib/coverage.dart", code))).toEqual([]);
});

test("mutually exclusive state updates with shared work stay quiet", () => {
  const code = source`
    void update() {
      if (enabled) {
        if (first) {
          prepare();
        }
        enable();
      } else {
        disable();
      }
      publish();
    }
  `;
  expect(detect(write("lib/state.dart", code))).toEqual([]);
});

test("comments and ordinary, raw and multiline strings do not introduce branches", () => {
  for (const decoration of ["// if (a) { if (b) {} else {} } else {}", "/* if (a) { /* nested */ if (b) {} else {} } else {} */", "final a = 'if (a) { if (b) {} else {} } else {}';", "final a = r'if (a) { if (b) {} else {} } else {}';", "final a = '''\nif (a) {\n if (b) {\n  use();\n } else {\n  reject();\n }\n} else {\n return;\n}\n''';"]) {
    expect(detect(write("lib/string.dart", `void f() {\n${decoration}\n}`))).toEqual([]);
  }
});

test("an edit limited to a comment in old nested code stays quiet", () => {
  const code = nested.replace("saveOrder(order, user);", "// clarified comment\n    saveOrder(order, user);");
  expect(detect(edit("lib/order.dart", code, { written: "    // clarified comment" }))).toEqual([]);
});

test("generated code is excluded", () => {
  for (const suffix of ["g", "freezed", "gr", "config", "mocks"]) {
    expect(detect(write(`lib/order.${suffix}.dart`, nested))).toEqual([]);
  }
});

test("build methods remain the responsibility of the widget-specific principle", () => {
  const code = nested.replace("void submit(Order? order, User? user)", "Widget build(BuildContext context)");
  expect(detect(write("lib/widget.dart", code))).toEqual([]);
});

test("an incomplete or unbraced conditional does not throw", () => {
  expect(detect(write("lib/partial.dart", "void f() {\n  if (ready) {\n    if (ok) {\n"))).toEqual([]);
  expect(detect(write("lib/flat.dart", "void f() {\n  if (ready) return;\n  else doWork();\n}"))).toEqual([]);
});

test("independent short alternatives do not accumulate across a function", () => {
  const code = `void f() {\n${["a", "b", "c", "d"].map((name) => `  if (${name}) {\n    on();\n  } else {\n    off();\n  }`).join("\n")}\n}`;
  expect(detect(write("lib/independent.dart", code))).toEqual([]);
});

test("reads and unrelated edits do not resurrect old branching", () => {
  expect(detect(read("lib/order.dart", nested))).toEqual([]);
  const code = `final unrelated = 1;\n${nested}`;
  expect(detect(edit("lib/order.dart", code, { written: "final unrelated = 1;" }))).toEqual([]);
});

test("guards without alternatives stay quiet", () => {
  const code = source`
    void submit(Order? order, User? user) {
      if (order == null) {
        showMissingOrder();
        return;
      }
      if (user == null) {
        showLoginRequired();
        return;
      }
      saveOrder(order, user);
    }
  `;
  expect(detect(write("lib/guard.dart", code))).toEqual([]);
});
