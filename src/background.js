importScripts("core.js");

const { DEFAULT_SETTINGS, buildSubmissionFiles, normalizeSettings, validateSubmission } = LeetSyncCore;
const RECENT_SUBMISSION_LIMIT = 50;
const activeSubmissionIds = new Set();

// The service worker is the trust boundary: page code never receives the GitHub token.
chrome.runtime.onInstalled.addListener(seedDefaultSettings);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  routeMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: readableError(error) }));
  return true;
});

async function seedDefaultSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missing = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).filter(([key]) => stored[key] === undefined)
  );
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
}

async function routeMessage(message, sender) {
  if (!message || typeof message.type !== "string") throw new Error("Invalid extension message.");

  switch (message.type) {
    case "getState":
      return { ok: true, state: await getPublicState() };
    case "saveSettings":
      return saveSettings(message.settings);
    case "clearToken":
      await chrome.storage.local.set({ token: "" });
      return { ok: true };
    case "testConnection":
      return testConnection();
    case "syncSubmission":
      assertLeetCodeSender(sender);
      return syncSubmission(message.payload);
    case "recordError":
      assertLeetCodeSender(sender);
      await recordSync({ status: "error", error: String(message.error || "Unknown sync error.") });
      setActionBadge("!", "#cf222e");
      return { ok: true };
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function getSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...stored };
}

async function getPublicState() {
  const settings = await getSettings();
  const { token, ...publicSettings } = settings;
  const { lastSync = null } = await chrome.storage.local.get("lastSync");
  return { settings: publicSettings, hasToken: Boolean(token), lastSync };
}

async function saveSettings(input) {
  const current = await getSettings();
  const settings = normalizeSettings(input || {}, current);
  await chrome.storage.local.set(settings);
  return { ok: true, state: await getPublicState() };
}

async function testConnection() {
  const settings = await getSettings();
  requireSettings(settings, ["token", "owner", "repo", "branch"]);

  const [viewer, repository] = await Promise.all([
    githubRequest(settings, "/user"),
    githubRequest(settings, `/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}`)
  ]);
  await getBranchHead(settings);
  return { ok: true, login: viewer.login, repository: repository.full_name };
}

async function syncSubmission(payload) {
  validateSubmission(payload);
  const submissionId = String(payload.submission.submissionId);
  if (activeSubmissionIds.has(submissionId)) return { ok: true, duplicate: true };

  activeSubmissionIds.add(submissionId);
  try {
    return await performSync(payload, submissionId);
  } finally {
    activeSubmissionIds.delete(submissionId);
  }
}

async function performSync(payload, submissionId) {
  const settings = await getSettings();
  requireSettings(settings, ["token", "owner", "repo", "branch"]);

  const { recentSubmissionIds = [] } = await chrome.storage.local.get("recentSubmissionIds");
  if (recentSubmissionIds.includes(submissionId)) {
    return { ok: true, duplicate: true };
  }

  await recordSync({ status: "syncing", title: payload.question.title, submissionId });
  setActionBadge("...", "#57606a");

  try {
    const files = buildSubmissionFiles(settings, payload);
    const commit = await commitFiles(settings, files, `Sync ${payload.question.title} (#${submissionId})`);
    await chrome.storage.local.set({
      recentSubmissionIds: [submissionId, ...recentSubmissionIds].slice(0, RECENT_SUBMISSION_LIMIT)
    });
    await recordSync({
      status: "success",
      title: payload.question.title,
      submissionId,
      files: files.map((file) => file.path),
      commitUrl: commit.htmlUrl
    });
    setActionBadge("OK", "#1a7f37");
    return { ok: true, files: files.map((file) => file.path), commitUrl: commit.htmlUrl };
  } catch (error) {
    await recordSync({ status: "error", title: payload.question.title, submissionId, error: readableError(error) });
    setActionBadge("!", "#cf222e");
    throw error;
  }
}

// Git's tree API puts every generated file in one commit, avoiding half-finished syncs.
async function commitFiles(settings, files, message, attempt = 0) {
  const head = await getBranchHead(settings);
  const currentCommit = await githubRequest(settings, repoPath(settings, `/git/commits/${head.sha}`));
  const blobs = await Promise.all(files.map((file) => githubRequest(settings, repoPath(settings, "/git/blobs"), {
    method: "POST",
    body: { content: file.content, encoding: "utf-8" }
  })));
  const tree = await githubRequest(settings, repoPath(settings, "/git/trees"), {
    method: "POST",
    body: {
      base_tree: currentCommit.tree.sha,
      tree: files.map((file, index) => ({ path: file.path, mode: "100644", type: "blob", sha: blobs[index].sha }))
    }
  });
  const commit = await githubRequest(settings, repoPath(settings, "/git/commits"), {
    method: "POST",
    body: { message, tree: tree.sha, parents: [head.sha] }
  });

  try {
    await githubRequest(settings, repoPath(settings, `/git/refs/heads/${encodeURIComponent(settings.branch)}`), {
      method: "PATCH",
      body: { sha: commit.sha, force: false }
    });
  } catch (error) {
    // One retry handles the common race where another commit reached the branch first.
    if (attempt === 0 && (error.status === 409 || error.status === 422)) {
      return commitFiles(settings, files, message, 1);
    }
    throw error;
  }

  return { sha: commit.sha, htmlUrl: `https://github.com/${settings.owner}/${settings.repo}/commit/${commit.sha}` };
}

async function getBranchHead(settings) {
  const reference = await githubRequest(settings, repoPath(settings, `/git/ref/heads/${encodeURIComponent(settings.branch)}`));
  if (!reference?.object?.sha) throw new Error("GitHub returned an invalid branch reference.");
  return { sha: reference.object.sha };
}

function repoPath(settings, suffix) {
  return `/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}${suffix}`;
}

async function githubRequest(settings, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (_) {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function recordSync(details) {
  await chrome.storage.local.set({ lastSync: { ...details, at: new Date().toISOString() } });
}

function requireSettings(settings, keys) {
  const missing = keys.filter((key) => !settings[key]);
  if (missing.length) throw new Error(`Complete these settings first: ${missing.join(", ")}.`);
}

function assertLeetCodeSender(sender) {
  if (!sender?.url?.startsWith("https://leetcode.com/problems/")) {
    throw new Error("This request did not come from a LeetCode problem page.");
  }
}

function readableError(error) {
  if (error?.status === 401) return "GitHub rejected the token. Create a new token and try again.";
  if (error?.status === 403) return "GitHub denied this action. Check the token's repository permissions.";
  if (error?.status === 404) return "The GitHub repository or branch could not be found.";
  return error?.message || String(error);
}

function setActionBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}
