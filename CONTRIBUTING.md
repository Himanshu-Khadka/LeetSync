# Contributing

LeetSync should remain understandable without a framework, build pipeline, or application server. Changes are welcome when they make syncing more reliable, secure, or easier to maintain.

## Working locally

1. Use Node.js 20 or newer.
2. Run `npm test` and `npm run check` before loading the extension.
3. Load the repository root as an unpacked extension.
4. Reload both the extension and the LeetCode tab after changing a content script.

## Code guidelines

- Keep GitHub credentials in the service worker.
- Treat every message and API response as untrusted input.
- Add comments for intent, browser constraints, and non-obvious API behavior. Do not narrate ordinary syntax.
- Keep the shared core independent of Chrome and DOM APIs.
- Prefer a focused function over a general abstraction that is used once.
- Do not add analytics, remote code, or another network host without documenting the need and updating the privacy policy.
- Preserve the one-submission, one-commit behavior.

Add a unit test when changing validation, paths, language mapping, or generated content. Browser integration changes should include manual test steps in the pull request because LeetCode does not provide a stable test environment.

## Pull requests

Explain the user-visible behavior, the failure cases considered, and how the change was tested. Keep unrelated formatting or refactoring out of the same pull request.
