# Architecture

LeetSync has three browser contexts. Keeping their responsibilities separate is the main security and maintenance rule in the project.

## Content script

`src/contentScript.js` runs only on LeetCode problem pages. It detects a Submit click or `Ctrl+Enter`/`Cmd+Enter`, then polls for a recent accepted submission. It reads the problem metadata and source code from LeetCode and sends plain data to the service worker.

The content script must never receive GitHub credentials or call GitHub. Code running in a web page has a larger attack surface than extension-only code.

## Service worker

`src/background.js` owns extension storage and every GitHub request. It checks that sync messages came from a LeetCode problem URL, validates the payload, prevents duplicate submission IDs, and records the latest activity.

GitHub writes use the Git Data API:

1. Read the configured branch head.
2. Create one blob per generated file.
3. Create a tree based on the current tree.
4. Create a commit with the old head as its parent.
5. move the branch reference without forcing it.

If another writer moves the branch during this process, LeetSync retries once from the new head. This design produces one commit per accepted solution and does not leave a solution without its README.

## Shared core

`src/core.js` has browser-independent rules for settings, paths, language extensions, payload validation, and generated files. It attaches one frozen `LeetSyncCore` object to the service worker global. Keeping these rules free of Chrome APIs makes them easy to test with Node.

## Popup

`popup.html`, `src/popup.js`, and `src/popup.css` provide configuration and diagnostics. The popup sends messages to the worker rather than accessing storage directly. It never asks the worker to return the saved token; it receives only `hasToken`.

## Stored data

Chrome local storage contains:

- GitHub token and repository settings.
- The latest sync status.
- Up to 50 recent LeetCode submission IDs for duplicate prevention.

There is no external LeetSync server. See `PRIVACY.md` before introducing any new network destination or stored field.

## Message contract

Popup messages: `getState`, `saveSettings`, `clearToken`, and `testConnection`.

Content-script messages: `syncSubmission` and `recordError`.

When adding a message, validate its sender and payload in the service worker. Return `{ ok: true, ... }` on success. The top-level router converts thrown errors into `{ ok: false, error }`.
