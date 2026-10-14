import { onWrite } from "@wellactually/sdk/v3";

/**
 * The file name is the complete signal: the content of a changelog does not
 * need to be inspected, and mentioning a changelog in conversation is not
 * enough. The finding points at the file.
 */
onWrite({
  *detect(event) {
    // Case-insensitive: CHANGELOG.md is the convention, changelog.md exists.
    if (!/^changelog(?:\.|$)/i.test(event.file.name)) {
      return;
    }
    yield {};
  },
});
