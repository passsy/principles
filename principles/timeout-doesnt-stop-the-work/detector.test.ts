import { expect, test } from "vitest";
import { detect, edit, read, source, write } from "@wellactually/sdk/v3/test";

const race = source`
  async function fetchWithTimeout(url: string, ms: number) {
    return Promise.race([
      fetch(url),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms)),
    ]);
  }
`;

test("a Promise.race fires", () => {
  expect(detect(write("src/fetch.ts", race))).toEqual([{ line: 2 }]);
});

test("a race the agent did not write stays quiet, and so does a read", () => {
  expect(detect(edit("src/fetch.ts", race, { written: "    fetch(url)," }))).toEqual([]);
  expect(detect(read("src/fetch.ts", race))).toEqual([]);
});

test("a Dart .timeout( and Future.any fire", () => {
  const code = source`
    final user = await api.fetchUser(id).timeout(const Duration(seconds: 5));
    final first = await Future.any([primary(), fallback()]);
  `;
  expect(detect(write("lib/user.dart", code))).toEqual([
    { line: 1 },
    { line: 2 },
  ]);
});

test("asyncio.wait fires, asyncio.wait_for cancels and stays quiet", () => {
  expect(detect(write("app/fetch.py", "done, pending = await asyncio.wait(tasks, timeout=5)"))).toEqual([{ line: 1 }]);
  expect(detect(write("app/fetch.py", "return await asyncio.wait_for(fetch_user(id), 5)"))).toEqual([]);
});

test("an AbortController stays quiet", () => {
  const code = source`
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(new Error('timeout')), ms);
    return await fetch(url, { signal: ac.signal });
  `;
  expect(detect(write("src/fetch.ts", code))).toEqual([]);
});

test("generated code is exempt", () => {
  expect(detect(write("lib/api.g.dart", "final r = await call().timeout(limit);"))).toEqual([]);
});
