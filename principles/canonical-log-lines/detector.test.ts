import { expect, test } from "vitest";
import { detect, edit, source, write } from "@wellactually/sdk/v3/test";

const charge = source`
  export async function handleCharge(req: Request) {
    const user = await authenticate(req);
    log.info('authenticated', { requestId: req.id, userId: user.id });
  }
`;

test("a log call threading a request id by hand fires", () => {
  expect(detect(write("src/charge.ts", charge))).toEqual([{ line: 3 }]);
});

test("a log call the agent did not write stays quiet", () => {
  expect(detect(edit("src/charge.ts", charge, { written: "  const user = await authenticate(req);" }))).toEqual([]);
});

test("a string key in Go and Dart fires, though blanking would erase it", () => {
  expect(detect(write("server/charge.go", 'func charge(id string) {\n\tslog.Info("charged", "trace_id", id)\n}'))).toEqual([{ line: 2 }]);
  expect(detect(write("lib/upload.dart", "void report(String cid) {\n  chirp.error('upload failed', {'correlation_id': cid});\n}"))).toEqual([{ line: 2 }]);
});

test("the canonical emitter and the context it drains stay quiet", () => {
  const code = source`
    export function emit(req: Request) {
      const ctx = { request_id: req.id, path: req.url };
      log.info('canonical', ctx);
    }
  `;
  expect(detect(write("src/canonical.ts", code))).toEqual([]);
});

test("an id named in the message is prose, not a field", () => {
  expect(detect(write("src/lookup.ts", "export function lookup() {\n  log.debug('handling requestId lookups');\n}"))).toEqual([]);
});

test("a code example in markdown is prose, not a log call", () => {
  expect(detect(write("docs/logging.md", "```ts\nlog.info('x', { requestId: id });\n```"))).toEqual([]);
});

test("a Dart test file stays quiet", () => {
  expect(detect(write("test/upload_test.dart", "void main() {\n  chirp.error('x', {'request_id': id});\n}"))).toEqual([]);
});
