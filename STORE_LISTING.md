# Microsoft Edge Store Listing

This copy matches version 1.0.0. Recheck it whenever behavior or permissions change.

## Single purpose

Save a signed-in user's accepted LeetCode submissions to a GitHub repository they configure.

## Short description

Save accepted LeetCode submissions to a GitHub repository.

## Description

LeetSync saves your accepted LeetCode solutions to a GitHub repository you control. After you submit a solution, the extension waits for an accepted result, reads the submitted source code and basic problem details, and creates one Git commit containing the solution and an optional README.

You choose the repository, branch, folder, and whether README files are created. The popup can verify repository access and shows the latest sync result when something needs attention.

LeetSync has no analytics, advertisements, external application server, or remote code. Your GitHub token stays in your browser profile and is sent only to GitHub's API. LeetCode data is sent only to the GitHub repository you selected.

An existing GitHub repository, an initialized branch, and a fine-grained GitHub token with Contents read/write permission are required.

## Permission justifications

**Storage**

Stores the GitHub token and repository preferences, the latest sync diagnostic, and recent submission IDs used to prevent duplicate commits.

**Access to `https://leetcode.com/*`**

Detects a deliberate submission on a problem page and reads the signed-in user's recent accepted result, source code, and basic problem metadata.

**Access to `https://api.github.com/*`**

Checks the configured repository and commits the user's accepted solution and generated metadata.

## Remote code

LeetSync does not use remote code. All executable JavaScript is included in the extension package. LeetCode and GitHub are called only as data APIs.

## Data disclosure

LeetSync handles authentication information, website content, and user-generated source code. It uses this data only for the extension's single purpose. Data is not sold, used for advertising, or sent to the developer.

The public privacy policy URL should point to the hosted contents of `PRIVACY.md`.

## Certification notes

LeetSync requires the reviewer's own LeetCode and GitHub accounts because it operates on user-owned submissions and repositories. No LeetSync account exists.

Test steps:

1. Create or select an initialized GitHub repository with a `main` branch.
2. Create a fine-grained token limited to that repository with Contents read/write permission.
3. Enter the token, owner, repository, and branch in the popup, then select **Check connection**.
4. Sign in to LeetCode, open a problem, submit an accepted solution, and keep the tab open.
5. Confirm that the page shows **Saved to GitHub** and the repository receives one commit.

The extension deliberately ignores non-accepted results and previously synced submission IDs.

## Listing assets

- `store-assets/logo-300.png`: recommended square store logo.
- `store-assets/small-promo-440x280.png`: optional small promotional tile.
- Screenshots must be captured from the running extension at 640x480 or 1280x800.
