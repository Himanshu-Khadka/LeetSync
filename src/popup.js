const form = document.getElementById("settings-form");
const statusText = document.getElementById("status");
const testGitHubButton = document.getElementById("test-github");

const fields = {
  token: document.getElementById("token"),
  owner: document.getElementById("owner"),
  repo: document.getElementById("repo"),
  branch: document.getElementById("branch"),
  basePath: document.getElementById("basePath")
};

document.addEventListener("DOMContentLoaded", loadSettings);
form.addEventListener("submit", saveSettings);
testGitHubButton.addEventListener("click", testGitHub);

async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: "getSettings" });

  if (!response?.ok) {
    setStatus(response?.error || "Could not load settings.", "error");
    return;
  }

  fillForm(response.settings);
  setStatus("Settings loaded.", "success");
}

async function saveSettings(event) {
  event.preventDefault();

  await withButtonsDisabled(async () => {
    const response = await chrome.runtime.sendMessage({
      type: "saveSettings",
      settings: readForm()
    });

    if (!response?.ok) {
      setStatus(response?.error || "Save failed.", "error");
      return;
    }

    fields.token.value = "";
    fillForm(response.settings);
    setStatus("Settings saved.", "success");
  });
}

async function testGitHub() {
  await withButtonsDisabled(async () => {
    const saved = await saveSettingsBeforeTest();
    if (!saved) return;

    const response = await chrome.runtime.sendMessage({ type: "testGitHub" });

    if (!response?.ok) {
      setStatus(response?.error || "GitHub test failed.", "error");
      return;
    }

    setStatus(`Connected as ${response.login}.`, "success");
  });
}

async function saveSettingsBeforeTest() {
  const response = await chrome.runtime.sendMessage({
    type: "saveSettings",
    settings: readForm()
  });

  if (!response?.ok) {
    setStatus(response?.error || "Save failed.", "error");
    return false;
  }

  fields.token.value = "";
  fillForm(response.settings);
  return true;
}

function readForm() {
  return {
    token: fields.token.value,
    owner: fields.owner.value,
    repo: fields.repo.value,
    branch: fields.branch.value,
    basePath: fields.basePath.value
  };
}

function fillForm(settings) {
  fields.owner.value = settings.owner || "";
  fields.repo.value = settings.repo || "";
  fields.branch.value = settings.branch || "main";
  fields.basePath.value = settings.basePath || "leetcode";
  fields.token.placeholder = settings.hasToken ? "Stored token" : "Fine-grained PAT";
}

async function withButtonsDisabled(work) {
  const buttons = Array.from(document.querySelectorAll("button"));
  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    await work();
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function setStatus(message, type) {
  statusText.textContent = message;
  statusText.className = type;
}
