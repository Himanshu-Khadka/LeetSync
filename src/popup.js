const form = document.getElementById("settings-form");
const statusNode = document.getElementById("status");
const lastSyncSection = document.getElementById("last-sync");
const lastSyncText = lastSyncSection.querySelector("p");
const fields = {
  token: document.getElementById("token"),
  owner: document.getElementById("owner"),
  repo: document.getElementById("repo"),
  branch: document.getElementById("branch"),
  basePath: document.getElementById("basePath"),
  includeReadme: document.getElementById("includeReadme")
};

// The popup contains no GitHub logic; it asks the service worker to do privileged work.
document.addEventListener("DOMContentLoaded", loadState);
form.addEventListener("submit", saveSettings);
document.getElementById("test").addEventListener("click", testConnection);
document.getElementById("clear-token").addEventListener("click", clearToken);

async function loadState() {
  const response = await sendMessage({ type: "getState" });
  if (!response?.ok) return showStatus(response?.error || "Could not load settings.", "error");
  renderState(response.state);
  showStatus(response.state.hasToken ? "Ready to sync." : "Add a GitHub token to get started.", response.state.hasToken ? "success" : "");
}

async function saveSettings(event) {
  event.preventDefault();
  await whileDisabled(async () => {
    const response = await sendMessage({ type: "saveSettings", settings: readForm() });
    if (!response?.ok) return showStatus(response?.error || "Could not save settings.", "error");
    fields.token.value = "";
    renderState(response.state);
    showStatus("Settings saved.", "success");
  });
}

async function testConnection() {
  await whileDisabled(async () => {
    const saved = await sendMessage({ type: "saveSettings", settings: readForm() });
    if (!saved?.ok) return showStatus(saved?.error || "Could not save settings.", "error");
    fields.token.value = "";
    renderState(saved.state);

    showStatus("Checking GitHub...", "");
    const response = await sendMessage({ type: "testConnection" });
    if (!response?.ok) return showStatus(response?.error || "Could not connect to GitHub.", "error");
    showStatus(`Connected to ${response.repository} as ${response.login}.`, "success");
  });
}

async function clearToken() {
  if (!window.confirm("Remove the saved GitHub token from this browser?")) return;
  await whileDisabled(async () => {
    const response = await sendMessage({ type: "clearToken" });
    if (!response?.ok) return showStatus(response?.error || "Could not remove the token.", "error");
    fields.token.value = "";
    fields.token.placeholder = "Fine-grained token";
    showStatus("GitHub token removed.", "success");
  });
}

function renderState(state) {
  const settings = state.settings;
  fields.owner.value = settings.owner || "";
  fields.repo.value = settings.repo || "";
  fields.branch.value = settings.branch || "main";
  fields.basePath.value = settings.basePath || "leetcode";
  fields.includeReadme.checked = Boolean(settings.includeReadme);
  fields.token.placeholder = state.hasToken ? "Token saved" : "Fine-grained token";
  renderLastSync(state.lastSync);
}

function readForm() {
  return {
    token: fields.token.value,
    owner: fields.owner.value,
    repo: fields.repo.value,
    branch: fields.branch.value,
    basePath: fields.basePath.value,
    includeReadme: fields.includeReadme.checked
  };
}

async function whileDisabled(work) {
  const buttons = [...document.querySelectorAll("button")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await work();
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

async function sendMessage(message) {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function showStatus(message, kind) {
  statusNode.textContent = message;
  statusNode.className = kind || "";
}

function renderLastSync(lastSync) {
  if (!lastSync) {
    lastSyncSection.hidden = true;
    return;
  }
  const time = lastSync.at ? new Date(lastSync.at).toLocaleString() : "an unknown time";
  if (lastSync.status === "error") {
    lastSyncText.textContent = `Failed ${time}: ${lastSync.error || "Unknown error"}`;
    lastSyncText.className = "error";
  } else if (lastSync.status === "syncing") {
    lastSyncText.textContent = `Saving ${lastSync.title || "submission"}...`;
    lastSyncText.className = "";
  } else {
    lastSyncText.textContent = `${lastSync.title || "Submission"} saved ${time}.`;
    lastSyncText.className = "success";
  }
  lastSyncSection.hidden = false;
}
