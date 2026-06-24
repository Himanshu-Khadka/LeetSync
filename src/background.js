const DEFAULT_SETTINGS = {
  token: "",
  owner: "",
  repo: "",
  branch: "main",
  basePath: "leetcode"
};

// Give storage default values when the extension is first installed.
chrome.runtime.onInstalled.addListener(async () => {
  const savedSettings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const missingSettings = {};

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (savedSettings[key] === undefined) {
      missingSettings[key] = value;
    }
  }

  if (Object.keys(missingSettings).length > 0) {
    await chrome.storage.local.set(missingSettings);
  }
});

// Popup requests come here. The popup does not read storage or call GitHub directly.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function handleMessage(message) {
  if (!message || typeof message.type !== "string") {
    throw new Error("Invalid message.");
  }

  if (message.type === "getSettings") {
    return {
      ok: true,
      settings: await getSettingsForPopup()
    };
  }

  if (message.type === "saveSettings") {
    const currentSettings = await getSettings();
    const settings = normalizeSettings(message.settings || {}, currentSettings);
    validateSettings(settings);
    await chrome.storage.local.set(settings);

    return {
      ok: true,
      settings: await getSettingsForPopup()
    };
  }

  if (message.type === "testGitHub") {
    const settings = await getSettings();
    validateSettings(settings);

    if (!settings.token) {
      throw new Error("GitHub token is required.");
    }

    const user = await githubRequest(settings, "/user");

    return {
      ok: true,
      login: user.login
    };
  }

  throw new Error(`Unknown message type: ${message.type}`);
}

async function getSettings() {
  const savedSettings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings
  };
}

async function getSettingsForPopup() {
  const settings = await getSettings();
  const { token, ...safeSettings } = settings;

  return {
    ...safeSettings,
    hasToken: Boolean(token)
  };
}

function normalizeSettings(input, currentSettings) {
  return {
    token: typeof input.token === "string" && input.token.trim()
      ? input.token.trim()
      : currentSettings.token || "",
    owner: typeof input.owner === "string" ? input.owner.trim() : "",
    repo: typeof input.repo === "string" ? input.repo.trim() : "",
    branch: typeof input.branch === "string" && input.branch.trim() ? input.branch.trim() : "main",
    basePath: normalizeBasePath(input.basePath)
  };
}

function validateSettings(settings) {
  if (!settings.owner) {
    throw new Error("GitHub owner is required.");
  }

  if (!settings.repo) {
    throw new Error("Repository name is required.");
  }

  if (!/^[A-Za-z0-9-]+$/.test(settings.owner)) {
    throw new Error("GitHub owner looks invalid.");
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(settings.repo)) {
    throw new Error("Repository name looks invalid.");
  }
}

function normalizeBasePath(path) {
  if (typeof path !== "string") return "leetcode";

  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/") || "leetcode";
}

async function githubRequest(settings, path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || `GitHub request failed with ${response.status}.`);
  }

  return data;
}
