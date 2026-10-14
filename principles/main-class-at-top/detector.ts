import { onWrite } from "@wellactually/sdk/v3";

/** A class, mixin, enum or extension declared at column 0, with its name captured. */
const DECLARATION = /^(?:(?:abstract\s+|base\s+|final\s+|sealed\s+|interface\s+|mixin\s+)*class|(?:base\s+)?mixin|enum|extension(?:\s+type)?)\s+(\w+)/;

/**
 * Fires when the class the file is named after exists but sits below another
 * declaration. A file where no declaration matches the name is file-naming's
 * case, so the two principles never fire together.
 */
onWrite({
  globs: ["**/*.dart", "!**/*.{g,freezed,gr,config,mocks}.dart", "!**/test/**", "!**/*_test.dart", "!**/main.dart"],
  *detect(event) {
    // Order is decided when declarations are written, not when a method of a
    // long-standing file gets edited.
    if (!event.written.some((line) => DECLARATION.test(line.text))) {
      return;
    }
    // user_profile.dart is named after UserProfile, and after _UserProfile.
    const expected = event.file.name.replace(/\.dart$/, "").replaceAll("_", "").toLowerCase();
    const namesake = event.lines.findIndex((line) => DECLARATION.exec(line)?.[1]?.replace(/^_+/, "").toLowerCase() === expected);
    // Without a namesake there is nothing to yield, which is not this principle's complaint.
    for (let index = 0; index < namesake; index++) {
      if (DECLARATION.test(event.lines[index] ?? "")) {
        yield { line: index + 1 };
      }
    }
  },
});
