import { onWrite } from "@wellactually/sdk/v3";

/**
 * A grab-bag file is where helpers go to get far from their callers. The name
 * is the signal; nothing inside a utils.dart makes it a real API.
 *
 * Only writes count: creating the file or adding the next helper is the
 * moment to place it near its caller instead. The finding points at the
 * file.
 */
onWrite({
  globs: ["**/{utils,util,helpers,helper,misc,common}.dart", "**/*_utils.dart", "**/*_helpers.dart"],
  *detect(event) {
    // Helpers of tests are close to their callers already.
    if (event.file.relativePath.split("/").slice(0, -1).includes("test")) {
      return;
    }
    yield {};
  },
});
