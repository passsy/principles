import { type Finding, onWrite } from "@wellactually/sdk/v3";

/** A class declaration at the top level, with whatever modifiers it carries. */
const CLASS = /^(?:abstract\s+|base\s+|final\s+|sealed\s+|interface\s+|mixin\s+)*class\s+(\w+)/;

onWrite({
  globs: ["**/*.dart", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart", "!**/main.dart"],
  *detect(event) {
    // Naming is decided when the classes are written, not when a method of a
    // long-standing file gets edited.
    if (event.written.some((line) => CLASS.test(line.text))) {
      yield* missingNamesake(event.file.name, event.lines);
    }
  },
});

/**
 * Fires when a file declares classes but none of them earns the file its name.
 * A file with no top-level class is a function library and names itself
 * however it likes. The wrong-order case belongs to main-class-at-top.
 */
function* missingNamesake(fileName: string, lines: string[]): Generator<Finding> {
  // config_loader.dart compared as "configloader", so HTTPClient still counts.
  const expected = fileName.replace(/\.dart$/, "").replaceAll("_", "").toLowerCase();
  let firstClass: number | null = null;

  for (const [index, line] of lines.entries()) {
    const cls = CLASS.exec(line);
    // A mixin, an enum or an extension can be the namesake as well.
    const name = cls?.[1] ?? /^(?:(?:base\s+)?mixin|enum|extension(?:\s+type)?)\s+(\w+)/.exec(line)?.[1];
    if (name === undefined) {
      continue;
    }
    // `ReportFetcher` earns `report/fetcher.dart` its name: the directory carries
    // the qualifier, so a class that ends with the file's name still counts.
    if (name.replace(/^_+/, "").toLowerCase().endsWith(expected)) {
      return;
    }
    if (cls && firstClass === null) {
      firstClass = index;
    }
  }

  if (firstClass !== null) {
    yield { line: firstClass + 1 };
  }
}
