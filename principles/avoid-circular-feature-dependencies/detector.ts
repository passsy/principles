import fs from "node:fs";
import path from "node:path";
import { DART_WITHOUT_TESTS } from "dart-kit";
import { onWrite } from "@wellactually/sdk/v3";

/**
 * A cycle is invisible in one file; it only exists between two. So the
 * detector does the two-file check for real, and only for imports the agent
 * just wrote: the moment it fires, the agent has just created the cycle and
 * can still route the dependency differently.
 */
onWrite({
  globs: DART_WITHOUT_TESTS,
  *detect(event) {
    for (const written of event.written) {
      if (createsCycle(written.text, event.file.path, event.project)) {
        yield { line: written.line };
      }
    }
  },
});

/** Resolve the written import, read that file, see if it imports us back. */
function createsCycle(line: string, filePath: string, project: string | null): boolean {
  const target = importOf(line);
  if (!target) {
    return false;
  }
  const resolved = resolveImport(target, filePath, project);
  if (resolved === null) {
    return false;
  }
  let back: string;
  try {
    back = fs.readFileSync(resolved, "utf8");
  } catch {
    return false;
  }
  for (const backLine of back.split("\n")) {
    const backTarget = importOf(backLine);
    if (backTarget && resolveImport(backTarget, resolved, project) === filePath) {
      return true;
    }
  }
  return false;
}

/** What an import line imports, or undefined when the line is no import. */
function importOf(line: string): string | undefined {
  return /^import\s+['"]([^'"]+)['"]/.exec(line.trim())?.[1];
}

/**
 * A project-local import resolved to an absolute path, or null for dart:.
 * `package:` imports resolve through lib/, relative ones against the file.
 */
function resolveImport(target: string, from: string, project: string | null): string | null {
  if (target.startsWith("dart:")) {
    return null;
  }
  if (target.startsWith("package:")) {
    const below = target.slice("package:".length).split("/").slice(1).join("/");
    let libRoot: string;
    if (from.includes("/lib/")) {
      libRoot = `${from.split("/lib/")[0]}/lib`;
    } else if (project !== null) {
      libRoot = path.join(project, "lib");
    } else {
      return null;
    }
    return path.resolve(libRoot, below);
  }
  return path.resolve(path.dirname(from), target);
}
