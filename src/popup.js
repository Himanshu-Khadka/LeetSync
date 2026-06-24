const DEFAULT_SETTINGS = {
  token: "",
  owner: "",
  repo: "",
  branch: "main",
  basePath: "leetcode"
};

const form = document.getElementById("settings-form");
const statusText = document.getElementById("status");

const fields = {
  token: document.getElementById("token"),
  owner: document.getElementById("owner"),
  repo: document.getElementById("repo"),
  branch: document.getElementById("branch"),
  basePath: document.getElementById("basePath")
};

document.addEventListener("DOMContentLoaded", loadSettings);
form.addEventListener("submit", saveSettings);

async function loadSettings() {
  const savedSettings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = {
    ...DEFAULT_SETTINGS,
    ...savedSettings
  };

  fields.owner.value = settings.owner;
  fields.repo.value = settings.repo;
  fields.branch.value = settings.branch;
  fields.basePath.value = settings.basePath;

  // Do not show the saved token again. Just tell the user that one exists.
  fields.token.placeholder = settings.token ? "Stored token" : "Fine-grained PAT";

  setStatus("Settings loaded.", "success");
}

async function saveSettings(event) {
  event.preventDefault();

  const currentSettings = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = {
    token: fields.token.value.trim() || currentSettings.token || "",
    owner: fields.owner.value.trim(),
    repo: fields.repo.value.trim(),
    branch: fields.branch.value.trim() || "main",
    basePath: normalizeBasePath(fields.basePath.value)
  };

  const error = validateSettings(settings);
  if (error) {
    setStatus(error, "error");
    return;
  }

  await chrome.storage.local.set(settings);

  fields.token.value = "";
  fields.token.placeholder = settings.token ? "Stored token" : "Fine-grained PAT";
  setStatus("Settings saved.", "success");
}

function validateSettings(settings) {
  if (!settings.owner) return "GitHub owner is required.";
  if (!settings.repo) return "Repository name is required.";

  if (!/^[A-Za-z0-9-]+$/.test(settings.owner)) {
    return "GitHub owner looks invalid.";
  }

  if (!/^[A-Za-z0-9_.-]+$/.test(settings.repo)) {
    return "Repository name looks invalid.";
  }

  return "";
}

function normalizeBasePath(path) {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/") || "leetcode";
}

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = type;
}