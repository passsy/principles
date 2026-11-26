import { onWrite, type WriteEvent } from "@wellactually/detector-sdk/v3";
import { DART } from "dart-kit";

// Names that mean "the one picked among its siblings". Item properties like
// isActive or done are left out: any number of items can carry those.
const PICK = "(?:is)?(?:[Rr]ecommended|[Ss]elected|[Dd]efault|[Pp]rimary|[Cc]urrent|[Aa]ccepted|[Cc]hosen|[Pp]referred)";
const DART_FLAG = new RegExp(`^\\s*(?:final\\s+|late\\s+)*bool\\??\\s+(${PICK})\\s*[;=]`);
const TS_FLAG = new RegExp(`^\\s*(?:readonly\\s+)?(${PICK})\\??\\s*:\\s*boolean\\s*[;,]?\\s*$`);
const TYPE = /^(\s*)(?:export\s+)?(?:(?:abstract|final|sealed|base|declare)\s+)*(?:class|interface|type)\s+([A-Za-z_$][\w$]*)(.*)$/;

/**
 * A pick flag declared on a type that the same file also holds in a
 * collection: `bool isDefault` on Address beside `List<Address>`, or
 * `recommended?: boolean` on Fix beside `Fix[]`. Without the collection the
 * type is not clearly a list item, so the detector stays quiet. Widgets take
 * `selected` as an input from the owner and are left alone.
 */
function* flags(event: WriteEvent, flag: RegExp) {
  const collected = new Map<string, boolean>();
  for (const written of event.written) {
    const field = flag.exec(written.text);
    if (!field) {
      continue;
    }
    const owner = enclosingType(event.lines, written.line - 1);
    if (!owner || /\bextends\s+(?:State\s*<|\w*Widget\b)/.test(owner.rest)) {
      continue;
    }
    if (!collected.has(owner.name)) {
      collected.set(owner.name, inCollection(event.text, owner.name));
    }
    if (collected.get(owner.name)) {
      yield { line: written.line, match: field[1] };
    }
  }
}

function enclosingType(lines: readonly string[], index: number) {
  const indent = /^\s*/.exec(lines[index]!)![0].length;
  for (let i = index - 1; i >= 0; i--) {
    const type = TYPE.exec(lines[i]!);
    if (type && type[1]!.length < indent) {
      return { name: type[2]!, rest: type[3]! };
    }
  }
  return null;
}

function inCollection(text: string, name: string) {
  const escaped = name.replace(/\$/g, "\\$");
  return new RegExp(`\\b(?:List|Set|Iterable|Array|ReadonlyArray)<${escaped}\\??>|\\b${escaped}\\[\\]`).test(text);
}

onWrite({
  globs: DART,
  *detect(event) {
    yield* flags(event, DART_FLAG);
  },
});

onWrite({
  globs: ["**/*.{ts,tsx,mts,cts}", "!**/*.d.{ts,mts,cts}"],
  *detect(event) {
    yield* flags(event, TS_FLAG);
  },
});
