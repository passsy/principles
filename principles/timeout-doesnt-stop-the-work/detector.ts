import { onWrite } from "@wellactually/sdk/v3";

/**
 * No prompt handler: "timeout" in conversation is a test timeout or a config value
 * far more often than a race. The written race shapes are the signal, in any
 * language.
 *
 * None of these race-a-timer shapes cancel the loser: `asyncio.wait(` is the
 * racing form, `asyncio.wait_for(` cancels and does not match because the `_`
 * comes before the paren.
 */
onWrite({
  globs: ["!**/*.{g,freezed,gr,config,mocks}.dart"],
  *detect(event) {
    for (const written of event.written) {
      if (/Promise\.race\(|Future\.any\(|asyncio\.wait\(|select!|\.timeout\(/.test(written.text)) {
        yield { line: written.line };
      }
    }
  },
});
