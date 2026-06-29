# Release Guide

## Before packaging

1. Update the version in `manifest.json`, `package.json`, and `CHANGELOG.md`.
2. Run `npm run build`.
3. Load the unpacked extension from the repository root in Edge and Chrome.
4. Check a valid token, an invalid token, a missing branch, an accepted submission, and a rejected submission.
5. Inspect `dist/leetsync-VERSION.zip` and confirm it contains no learning files, tests, tokens, or local settings.
6. Read the permission descriptions and privacy statement as a new user would.

## GitHub release

The repository workflow in `.github/workflows/release.yml` builds a release when a `v*` tag is pushed. For version 1.0.0:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions runs all checks, creates `leetsync-1.0.0.zip`, and attaches it to a GitHub Release. Users must extract this package and load it as an unpacked extension. GitHub-hosted installations do not update automatically.

## Store submission

Upload the zip from `dist/` to the Microsoft Edge Add-ons Partner Center or Chrome Web Store dashboard. Use `STORE_LISTING.md` for the Edge listing copy, permission explanations, data disclosures, and certification notes. Listing images in `store-assets/` are uploaded separately and are not part of the extension package.

Edge Partner Center is rolling out a dedicated Privacy page. Complete its single-purpose, permission, remote-code, data-use, and privacy-policy fields accurately. LeetSync accesses and transmits user data, so host `PRIVACY.md` at a stable public HTTPS URL and provide that URL in Partner Center.

Permission explanations:

- `storage`: keeps repository settings, the token, recent submission IDs, and the latest diagnostic in the browser profile.
- `https://leetcode.com/*`: detects submissions and reads the signed-in user's accepted code.
- `https://api.github.com/*`: checks repository access and commits generated files.

The current Edge listing requires a square extension logo; `store-assets/logo-300.png` uses the recommended 300x300 size. The 440x280 small promotional tile and 640x480 or 1280x800 screenshots are optional but useful.

## Versioning

Use semantic versioning. Patch releases fix behavior without changing the stored-data or message contracts. Minor releases add backward-compatible features. Major releases may change configuration or generated repository structure.
