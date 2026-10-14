import { onWrite } from "@wellactually/sdk/v3";
import { DART_WITHOUT_TESTS } from "dart-kit";

onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    // The structure is only this change's business when the change touches it.
    if (!event.written.some(({ text }) => text.includes("StatefulWidget") || text.includes("State<"))) {
      return;
    }
    const code = event.lines;
    for (const [index, line] of code.entries()) {
      const widget = /class\s+(\w+)\s+extends\s+StatefulWidget/.exec(line);
      if (!widget?.[1]) {
        continue;
      }
      // `extends State<X>`, not just `State<X>`: the widget's own
      // `State<X> createState()` names the type too.
      const statePattern = new RegExp(`extends\\s+State<${widget[1]}>`);
      const stateLine = code.findIndex((candidate, at) => at > index && statePattern.test(candidate));
      if (stateLine === -1) {
        continue;
      }
      for (let at = index + 1; at < stateLine; at++) {
        // Members of the widget class are indented, so a column-0 declaration
        // between the widget and its State is genuinely an interloper.
        if (/^(?:class|enum|extension|typedef|mixin|final|const|var)\s|^[A-Za-z_][\w<>, ?]*\s+\w+\(/.test(code[at] ?? "")) {
          yield { line: at + 1 };
          break;
        }
      }
    }
  },
});
