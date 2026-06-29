# Install LeetSync from GitHub

LeetSync is distributed as a source package through GitHub Releases. Edge and Chrome do not permanently install ordinary extension ZIP files, so the package must be extracted first.

## Microsoft Edge

1. Open the repository's **Releases** page on GitHub.
2. Download `leetsync-VERSION.zip` from the latest release.
3. Extract the ZIP to a permanent folder. Do not delete this folder after installation.
4. Open `edge://extensions`.
5. Enable **Developer mode**.
6. Select **Load unpacked**.
7. Select the extracted folder that directly contains `manifest.json`.
8. Pin LeetSync from Edge's Extensions menu.

The LeetSync code-and-check icon should appear beside the extension name and in the toolbar when pinned.

## Google Chrome

Follow the same process from `chrome://extensions`.

## Updating

GitHub installations do not update automatically:

1. Download and extract the newer release over the existing LeetSync folder.
2. Open the browser's extensions page.
3. Select **Reload** on LeetSync.
4. Reload any open LeetCode tabs.

Browser stores are required for automatic consumer updates. Organization-managed Edge installations can also use enterprise extension distribution policies.

## Safety check

Download releases only from the project's own GitHub Releases page. A release package should contain `manifest.json`, `popup.html`, `assets/`, and `src/` at its top level. It should never contain a preconfigured GitHub token.
