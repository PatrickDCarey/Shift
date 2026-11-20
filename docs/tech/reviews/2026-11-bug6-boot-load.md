# BUG-6 owner notes: every pixel sheet fails decode, twice (tech-lead, 2026-11-20)

_Owner notes for `docs/qa/bugs.md` BUG-6 (QA's file; not edited here). Files changed: `src/scenes/bootLoad.ts`, `src/scenes/bootLoad.test.ts`, `src/scenes/BootScene.ts`, `docs/tech/architecture.md` (Boot order). Run by me: `npx vitest run src/scenes` (21 green), `npm run typecheck` (clean). Not run by me: build, e2e, `npm run check` (orchestrator's)._

## What was reproduced, and how

Scratch harness (not committed): a `VITE_QA_HOOK=1` build served by `vite preview` on port 5192, driven by a Node script with Playwright's Chromium (headless, software WebGL). Each boot opens a new context in a long-lived browser (as a Playwright worker does), and an init script records every XHR (`status`, response size) and every `<img>` `error`, keeping the blob it was given so it can be inspected afterwards (`blob.size`, first bytes, `createImageBitmap`).

| Run | Load | Boots | Result |
|---|---|---|---|
| 1 | 4 browsers, CPU throttle 4x (CDP `Emulation.setCPUThrottlingRate`), 1 background page playing a level per browser | 40 that loaded | 0 decode failures (20 navigations timed out at start-up: machine overload, not this bug) |
| 2 | 2 browsers, no throttle, 3 s dwell per page, title and `?level=` alternating | 240 | 0 failures |
| 3 | 4 browsers, throttle 2x, 2 background games per browser | about 140 before the machine stalled | **1 exact BUG-6 signature** (worker 3, boot 5), then mass timeouts as the machine stalled (watchdog stopped the run) |

The reproduced boot matches QA's evidence line for line: `Failed to process file ... image pixel-*` for all seven images on attempt 1 and again on the immediate retry, then `Boot: ... still missing after 2 load attempts`, then `#boot-error`. The new detail, from the instrumentation:

- Every image's blob was **0 bytes**, with type `image/png` (so the response headers arrived: `Content-Type: image/png`). Reading the blob gave 0 bytes; `createImageBitmap(blob)` failed ("source image could not be decoded"); a fresh `<img>` on the same blob 500 ms later also failed.
- Phaser only processes a file whose XHR succeeded (`File.onLoad`: status 200), so each XHR finished as a 200 with an empty blob, and no `requestfailed` event fired.
- No `webglcontextlost`, no page crash. The failure is in fetch-to-blob, before decode and long before texture upload.

Deliberate reproduction is therefore possible but expensive: it needs more load than this shared machine can take with other sittings running (the orchestrator capped repro runs at 2 browsers after run 3). Not re-run.

## Cause (best explanation, not proven)

Phaser 3.90 loads images by XHR with `responseType: 'blob'`, then `URL.createObjectURL(blob)` into an `Image` (`ImageFile.onProcess`). Chromium builds an XHR blob response in the browser process's blob storage. When that storage cannot take the data (memory pressure; Playwright contexts are off-the-record, so blob data cannot be paged to disk), the response comes back as an empty blob while the request itself still reports 200. Every image in that page hits the same condition, and an immediate retry (a few ms later, same page, same storage) hits it again. That explains "all sheets at once", "twice in the same page", "passes alone", and why a fresh worker (Playwright restarts the browser after a failed test) is fine. The once-seen `net::ERR_NETWORK_ACCESS_DENIED` on a page load is a different, socket-level symptom of the same overloaded machine; it is not this path.

What I ruled out: WebGL texture creation or a lost context (the error is raised by `Image.onerror` on an empty blob, before `addToCache`; no context-lost event); bad bytes from the server (headers were right, the same files load in every other boot and the 240-boot run); network errors (those go through `File.onError` and Phaser's own retries, logged as `File failed`, not `Failed to process file`).

## The change

`BOOT_LOAD_PLAN` in `bootLoad.ts` (pure, unit tested), applied by `BootScene`:

| Attempt | Wait before it | Image path |
|---|---|---|
| 1 (normal load) | 0 | XHR + blob (Phaser's default, unchanged) |
| 2 (retry of what is missing) | 500 ms | `HTMLImageElement`: `<img src=url>`, no XHR, no blob |
| 3 (last retry) | 2000 ms | `HTMLImageElement` |

Then `#boot-error` as before. The retry sets `this.load.imageLoadType` before re-queuing (each `ImageFile` reads it when it is created, which covers atlas images, the tileset and the bitmap-font image). The wait uses the scene clock (`this.time.delayedCall`). A clean boot is unchanged (one request per asset, no wait, no warning). A recovered boot logs one `console.warn`, now naming the attempt: `Boot: <keys> failed to load the first time and loaded on attempt <n>`. Worst case before the message: 2.5 s of waiting plus three loads. No load timeout was added (BUG-6 does not hang; a wrong timeout would fail slow players).

Why this and not only a backoff: the reproduced failure is in the blob path itself, so a retry over the same path in the same page is the weakest bet; `<img src>` takes the ordinary resource path into the renderer's image cache and never touches blob storage. The wait is there in case the pressure is momentary. A third attempt is cheap insurance if the first retry lands in the same moment.

Tests (`bootLoad.test.ts`, written first, 6 failed before the change): three attempts and never a fourth; partial recovery narrows the keys; attempt 1 is XHR with no wait; retries wait 500 ms then 2 s over `HTMLImageElement`; total wait under 3 s; returned keys are a copy; attempt numbers outside 1..3 throw.

## Not verified (orchestrator / QA)

- **Not run in a browser after the change** (no build allowed in this sitting). Suggested check, on a `VITE_QA_HOOK=1` build: an init script that makes every `pixel-*.png` XHR blob empty reproduces the exact signature; with the change the Title must open with one `Boot:` warning naming attempt 2; without it, `#boot-error`. For example:

  ```js
  await page.addInitScript(() => {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, url, ...rest) { this.__url = String(url); return open.call(this, m, url, ...rest); };
    const res = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
    Object.defineProperty(XMLHttpRequest.prototype, 'response', {
      get() { return /pixel-.*\.png/.test(this.__url ?? '') && this.responseType === 'blob' ? new Blob([], { type: 'image/png' }) : res.get.call(this); },
    });
  });
  ```
- **QA spec B6-2 needs its bound changed** (`tests/e2e/boot-retry.spec.ts`, QA's): an always-corrupt sheet is now requested 3 times, not 2 (`toBeLessThanOrEqual(2)` becomes 3; the header comment "2 requests" becomes 3). Filed in `docs/production/requests.md`. B6-1 (one Boot: warning) and B6-3 (no asset fetched twice on a clean boot) should pass unchanged.
- Whether `<img src>` recovers the real blob-storage failure was not observed directly (only one reproduction, before the change). It is the reasoning above, not a measurement.

## Could a real player hit it? (judgement)

Rare, but possible. The trigger is Chromium's blob storage refusing a few small (2 to 20 KB) responses, which needs heavy memory pressure in the browser; normal profiles can also page blob data to disk, so a single tab on an ordinary machine is very unlikely to hit it. The most plausible real cases are a low-memory machine with many tabs, or a private/incognito window under pressure. Before this change such a player saw the reload message; after it, the retry no longer depends on blob storage, so they should get the game. I would close BUG-6 as fixed once the injection check above and a full e2e run pass, and reopen if QA sees the signature again with `loaded on attempt` absent.
