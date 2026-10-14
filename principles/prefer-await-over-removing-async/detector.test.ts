import { expect, test } from "vitest";
import { command, detect, prompt, read, write } from "@wellactually/sdk/v3/test";

const expected = [{ match: "async_return_with_no_await", depth: "pointer" }];

test("fires on the exact diagnostic in a prompt, outside a Dart project", () => {
  expect(detect(prompt("Please fix async_return_with_no_await."))).toEqual(expected);
});

test("fires on the diagnostic in a file the agent writes", () => {
  expect(detect(write("lint-output.txt", "info - lib/a.dart:2:3 - async_return_with_no_await"))).toEqual(expected);
});

test("fires on the diagnostic in a file the agent reads", () => {
  expect(detect(read("analyze.log", "info - lib/a.dart:2:3 - async_return_with_no_await"))).toEqual(expected);
});

test.each(["async", "await", "unnecessary_async", "async_return_with_no_await_extra", "not_async_return_with_no_await"])("stays quiet on %s", (text) => {
  expect(detect(prompt(text))).toEqual([]);
});

test("is not listening to commands", () => {
  expect(detect(command("echo async_return_with_no_await"))).toEqual([]);
});
