import { onWrite } from "@wellactually/sdk/v3";
import { DART_LIB, isComment } from "dart-kit";

/**
 * The main widget, the one the file is named after or failing that the first,
 * must say where it is used. Secondary widgets in the same file are optional
 * per the rule, so only the main one is checked.
 */
onWrite({
  globs: DART_LIB,
  *detect(event) {
    const expected = pascalCase(event.file.name.replace(/\.dart$/, ""));
    const widgets: { line: number; name: string }[] = [];
    for (const [index, line] of event.lines.entries()) {
      // A widget in a comment, such as a dartdoc example, is not a declaration.
      if (isComment(line)) {
        continue;
      }
      const match = /class\s+(\w+)\s+extends\s+(?:StatelessWidget|StatefulWidget)/.exec(line);
      if (match?.[1]) {
        widgets.push({ line: index, name: match[1] });
      }
    }
    const main = widgets.find((widget) => widget.name === expected) ?? widgets[0];
    if (main === undefined || documented(event.lines, main.line)) {
      return;
    }

    // Only when the agent is writing the widget itself. Editing some method of
    // an undocumented legacy widget is not the moment to demand its dartdoc.
    const wroteDeclaration = event.written.some((written) => written.text.includes(`class ${main.name} `));
    if (wroteDeclaration) {
      yield { line: main.line + 1 };
    }
  },
});

function pascalCase(snake: string): string {
  let pascal = "";
  for (const part of snake.split("_")) {
    pascal += part.charAt(0).toUpperCase() + part.slice(1);
  }
  return pascal;
}

/** Whether a `///` sits directly above `index`, allowing annotations between. */
function documented(lines: string[], index: number): boolean {
  for (let at = index - 1; at >= 0; at--) {
    const above = (lines[at] ?? "").trim();
    if (above.startsWith("@") || above === "") {
      continue;
    }
    return above.startsWith("///");
  }
  return false;
}
