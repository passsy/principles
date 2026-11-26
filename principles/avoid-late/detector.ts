import { mentioned, onPrompt, onWrite } from "@wellactually/detector-sdk/v3";
import { DART, isComment, isDartProject } from "dart-kit";

/**
 * Bare "late" is out of the word list. In conversation it is almost always
 * about time ("too late", "later than expected"), so only the phrases that
 * are unambiguously about the keyword count, plus the runtime error a user
 * pastes when a late field bit them.
 */
onPrompt({
  *detect(event) {
    if (isDartProject(event)) {
      yield* mentioned(event, ["late keyword", "late final", "late var", "late initialization", "LateInitializationError"]);
    }
  },
});

// Only a `late` the agent writes; legacy late fields stay unjudged.
// The exceptions below are questions about the whole file, so each `late` is
// looked at by its offset in the code of the file.
onWrite({
  globs: DART,
  *detect(event) {
    // Most writes hold no `late`; find those that do before building the code of the whole file.
    const lates: { line: number; column: number }[] = [];
    for (const written of event.written) {
      // A comment is not code the agent wrote.
      if (!written.text.includes("late") || isComment(written.text)) {
        continue;
      }
      const column = /(?<![\p{L}\p{N}_$.])late(?![\p{L}\p{N}_$])/u.exec(written.text)?.index;
      if (column !== undefined) {
        lates.push({ line: written.line, column });
      }
    }
    if (lates.length === 0) {
      return;
    }

    // Comment lines are blanked at their length, so a brace in a comment
    // opens no scope and every offset stays where it is.
    const codeLines: string[] = [];
    const lineStarts: number[] = [];
    let lineStart = 0;
    for (const line of event.lines) {
      lineStarts.push(lineStart);
      lineStart += line.length + 1;
      if (isComment(line)) {
        codeLines.push(" ".repeat(line.length));
      } else {
        codeLines.push(line);
      }
    }
    const code = codeLines.join("\n");
    // Found once per write, not once per `late`: on a large file that was most of the time.
    const classes = classDeclarations(code);
    const braces = braceDepths(code);
    for (const { line, column } of lates) {
      const at = (lineStarts[line - 1] ?? 0) + column;
      const body = enclosingClass(code, classes, at);
      const depth = depthAt(braces, at) - (body ? depthAt(braces, body.open + 1) : 0);
      const late = { at, body, depth };
      if (isSelfReferentialLocalConstruction(code, late)) {
        continue;
      }
      if (isLazyStateFieldRequiringThis(code, late)) {
        continue;
      }
      if (isLazyBeaconControllerField(code, late)) {
        continue;
      }
      if (isStateLifecycleField(code, late)) {
        continue;
      }
      yield { line };
    }
  },
});

interface ClassDeclaration {
  at: number;
  open: number;
  /** Found when a `late` lies after `open`, as most classes never need it. */
  close?: number;
}

interface Late {
  at: number;
  body: ClassBody | null;
  /** Brace depth below the class body, or below the file outside a class. */
  depth: number;
}

interface ClassBody {
  open: number;
  close: number;
  isFlutterState: boolean;
  hasBeaconController: boolean;
}

/**
 * `late final item; item = Item(onDismissed: () => remove(item));` is the one
 * local cycle that cannot be expressed with an ordinary final initializer:
 * the callback needs the value while that value is still being constructed.
 */
function isSelfReferentialLocalConstruction(code: string, { at: lateAt, depth }: Late): boolean {
  // Inside a function or block, below its class or the file.
  if (depth <= 0) {
    return false;
  }

  const declarationEnd = statementEnd(code, lateAt);
  if (declarationEnd === -1) {
    return false;
  }
  const declaration = code.slice(lateAt, declarationEnd).trim();
  if (!/^late\s+final\b/.test(declaration) || declaration.includes("=")) {
    return false;
  }

  const name = /([A-Za-z_$][\w$]*)\s*;$/.exec(declaration)?.[1];
  if (!name) {
    return false;
  }

  // Sticky at the end of the declaration instead of a copy of the rest of the file.
  const assignment = new RegExp(`\\s*${escapeRegExp(name)}\\s*=(?!=)`, "y");
  assignment.lastIndex = declarationEnd;
  if (!assignment.test(code)) {
    return false;
  }

  const assignmentAt = declarationEnd;
  const assignmentEnd = statementEnd(code, assignmentAt);
  if (assignmentEnd === -1) {
    return false;
  }
  const equalsAt = code.indexOf("=", assignmentAt);
  const initializer = code.slice(equalsAt + 1, assignmentEnd - 1);
  if (!isConstructorCall(initializer)) {
    return false;
  }

  return callbackCaptures(initializer, name);
}

/**
 * A direct field initializer cannot normally use `this`. A `late final` field
 * makes that initializer lazy, which is legitimate for State-owned resources
 * such as `AnimationController(vsync: this)`.
 */
function isLazyStateFieldRequiringThis(code: string, { at: lateAt, body, depth }: Late): boolean {
  if (!body?.isFlutterState || depth !== 0) {
    return false;
  }

  const end = statementEnd(code, lateAt);
  if (end === -1) {
    return false;
  }
  const declaration = code.slice(lateAt, end);
  if (!/^late\s+final\b/.test(declaration)) {
    return false;
  }

  const equalsAt = declaration.indexOf("=");
  return equalsAt !== -1 && /(?<![\p{L}\p{N}_$.])this(?![\p{L}\p{N}_$])/u.test(declaration.slice(equalsAt + 1));
}

/**
 * State Beacon controllers own `B` as an instance field. Their beacons must be
 * lazy fields so the initializer can use that group and join its disposal.
 */
function isLazyBeaconControllerField(code: string, { at: lateAt, body, depth }: Late): boolean {
  if (!body?.hasBeaconController || depth !== 0) {
    return false;
  }

  const end = statementEnd(code, lateAt);
  if (end === -1) {
    return false;
  }
  const declaration = code.slice(lateAt, end);
  if (!/^late\s+final\b/.test(declaration)) {
    return false;
  }

  const equalsAt = declaration.indexOf("=");
  return equalsAt !== -1 && /\bB\s*\./.test(declaration.slice(equalsAt + 1));
}

/**
 * `late final _controller;` in a State class, assigned in `initState()`.
 * Flutter runs initState before build, so the field cannot be read early.
 * Not in the handbook runtime, which leaves this exception to the reader.
 */
function isStateLifecycleField(code: string, { at: lateAt, body, depth }: Late): boolean {
  if (!body?.isFlutterState || depth !== 0) {
    return false;
  }
  const end = statementEnd(code, lateAt);
  if (end === -1) {
    return false;
  }
  const declaration = code.slice(lateAt, end).trim();
  if (!/^late\s+final\b/.test(declaration) || declaration.includes("=")) {
    return false;
  }
  const name = /([A-Za-z_$][\w$]*)\s*;$/.exec(declaration)?.[1];
  if (!name) {
    return false;
  }
  const classCode = code.slice(body.open, body.close);
  const initState = /\bvoid\s+initState\s*\(\s*\)\s*\{/.exec(classCode);
  if (!initState) {
    return false;
  }
  const open = initState.index + initState[0].length - 1;
  const close = matchingBrace(classCode, open);
  if (close === -1) {
    return false;
  }
  return new RegExp(`(?<![\\w$])${escapeRegExp(name)}\\s*=(?!=)`).test(classCode.slice(open, close));
}

function classDeclarations(code: string): ClassDeclaration[] {
  const classes: ClassDeclaration[] = [];
  for (const match of code.matchAll(/\bclass\s+[A-Za-z_$][\w$]*/g)) {
    const at = match.index ?? -1;
    classes.push({ at, open: code.indexOf("{", at) });
  }
  return classes;
}

function enclosingClass(code: string, classes: ClassDeclaration[], offset: number): ClassBody | null {
  // Classes come in order of their braces, so the innermost one around the
  // offset is the first that still encloses it, looking back from the offset.
  let index = lastOpenBefore(classes, offset);
  for (; index >= 0; index--) {
    const declaration = classes[index] as ClassDeclaration;
    declaration.close ??= matchingBrace(code, declaration.open);
    if (declaration.close !== -1 && offset < declaration.close) {
      break;
    }
  }
  if (index < 0) {
    return null;
  }
  const close = classes[index]?.close ?? -1;
  // Of declarations that share one brace, the first names the class.
  while (index > 0 && classes[index - 1]?.open === classes[index]?.open) {
    index--;
  }
  const innermost = classes[index] as ClassDeclaration;
  const header = code.slice(innermost.at, innermost.open);
  return {
    open: innermost.open,
    close,
    isFlutterState: /\bextends\s+State\s*(?:<[^{}]*>)?/.test(header),
    hasBeaconController: /\bwith\b[^{}]*\bBeaconController(?:Mixin)?\b/.test(header),
  };
}

/** Index of the last class that opens at or before `offset`, by binary search, or -1. */
function lastOpenBefore(classes: ClassDeclaration[], offset: number): number {
  let low = 0;
  let high = classes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const open = classes[middle]?.open ?? -1;
    // A class with no brace after it has none after any later class either.
    if (open !== -1 && open <= offset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

function callbackCaptures(initializer: string, name: string): boolean {
  let at = initializer.indexOf("=>");
  while (at !== -1) {
    if (looksLikeCallbackParameters(initializer, at)) {
      const end = arrowBodyEnd(initializer, at + 2);
      if (usesName(initializer.slice(at + 2, end), name)) {
        return true;
      }
    }
    at = initializer.indexOf("=>", at + 2);
  }

  for (let open = initializer.indexOf("{"); open !== -1; open = initializer.indexOf("{", open + 1)) {
    if (!looksLikeCallbackParameters(initializer, open)) {
      continue;
    }
    const close = matchingBrace(initializer, open);
    if (close !== -1 && usesName(initializer.slice(open + 1, close), name)) {
      return true;
    }
  }
  return false;
}

function looksLikeCallbackParameters(code: string, bodyAt: number): boolean {
  let end = bodyAt - 1;
  while (end >= 0 && /\s/.test(code[end] ?? "")) {
    end--;
  }

  let start = end;
  if (code[end] === ")") {
    start = matchingOpenParen(code, end);
    if (start === -1) {
      return false;
    }

    const before = previousNonSpace(code, start - 1);
    return before === -1 || ":,=([{\n".includes(code[before] ?? "");
  }

  while (start >= 0 && /[A-Za-z0-9_$]/.test(code[start] ?? "")) {
    start--;
  }
  start++;
  if (start > end) {
    return false;
  }

  const before = previousNonSpace(code, start - 1);
  return before === -1 || ":,=([{\n".includes(code[before] ?? "");
}

function arrowBodyEnd(code: string, from: number): number {
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let i = from; i < code.length; i++) {
    const char = code[i];
    const topLevel = parentheses === 0 && brackets === 0 && braces === 0;
    switch (char) {
      case "(":
        parentheses++;
        break;
      case ")":
        if (topLevel) {
          return i;
        }
        parentheses--;
        break;
      case "[":
        brackets++;
        break;
      case "]":
        if (topLevel) {
          return i;
        }
        brackets--;
        break;
      case "{":
        braces++;
        break;
      case "}":
        if (topLevel) {
          return i;
        }
        braces--;
        break;
      case ",":
      case ";":
        if (topLevel) {
          return i;
        }
        break;
    }
  }
  return code.length;
}

function isConstructorCall(initializer: string): boolean {
  return /^\s*(?:const\s+)?(?:[A-Za-z_$][\w$]*\.)*[A-Z_$][\w$]*(?:\s*<[^;(){}]+>)?(?:\.[A-Za-z_$][\w$]*)?\s*\(/.test(initializer);
}

/** Index just after the statement's top-level semicolon. */
function statementEnd(code: string, from: number): number {
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let i = from; i < code.length; i++) {
    const char = code[i];
    const topLevel = parentheses === 0 && brackets === 0 && braces === 0;
    switch (char) {
      case "(":
        parentheses++;
        break;
      case ")":
        parentheses--;
        break;
      case "[":
        brackets++;
        break;
      case "]":
        brackets--;
        break;
      case "{":
        braces++;
        break;
      case "}":
        braces--;
        break;
      case ";":
        if (topLevel) {
          return i + 1;
        }
        break;
    }
  }
  return -1;
}

// Hops from brace to brace with indexOf: a loop over every character is slow in the sandbox.
function matchingBrace(code: string, open: number): number {
  let depth = 0;
  let at = open;
  while (true) {
    const nextOpen = code.indexOf("{", at);
    const nextClose = code.indexOf("}", at);
    if (nextClose === -1) {
      return -1;
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      at = nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        return nextClose;
      }
      at = nextClose + 1;
    }
  }
}

function matchingOpenParen(code: string, close: number): number {
  let depth = 0;
  for (let i = close; i >= 0; i--) {
    switch (code[i]) {
      case ")":
        depth++;
        break;
      case "(":
        depth--;
        if (depth === 0) {
          return i;
        }
        break;
    }
  }
  return -1;
}

interface BraceDepths {
  /** Offsets of the braces in the code, in order. */
  at: number[];
  /** Depth just after each of those braces. */
  depth: number[];
}

// Counted once per write: counting from the start for each `late` was most of the time on large files.
function braceDepths(code: string): BraceDepths {
  const braces: BraceDepths = { at: [], depth: [] };
  let depth = 0;
  let nextOpen = code.indexOf("{");
  let nextClose = code.indexOf("}");
  while (nextOpen !== -1 || nextClose !== -1) {
    if (nextClose === -1 || (nextOpen !== -1 && nextOpen < nextClose)) {
      depth++;
      braces.at.push(nextOpen);
      nextOpen = code.indexOf("{", nextOpen + 1);
    } else {
      depth--;
      braces.at.push(nextClose);
      nextClose = code.indexOf("}", nextClose + 1);
    }
    braces.depth.push(depth);
  }
  return braces;
}

/** Depth of the braces before `offset`, by binary search. */
function depthAt(braces: BraceDepths, offset: number): number {
  let low = 0;
  let high = braces.at.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((braces.at[middle] ?? 0) < offset) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low === 0 ? 0 : (braces.depth[low - 1] ?? 0);
}

function previousNonSpace(code: string, from: number): number {
  let at = from;
  while (at >= 0 && /\s/.test(code[at] ?? "")) {
    at--;
  }
  return at;
}

/** Whether `code` uses `name` as a word of its own: not as part of a longer name, and not as a member of something else. */
function usesName(code: string, name: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}_$.])${escapeRegExp(name)}(?![\\p{L}\\p{N}_$])`, "u").test(code);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
