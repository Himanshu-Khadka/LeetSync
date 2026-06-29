const GRAPHQL_URL = "https://leetcode.com/graphql";
const ACCEPTED_STATUS = "Accepted";
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60000;

let currentRun = null;

// A sync starts only from a deliberate submission, never from stale page text.
document.addEventListener("click", handleClick, true);
document.addEventListener("keydown", handleKeydown, true);

function handleClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest("button, [role='button']");
  if (button && /^submit$/i.test(button.textContent?.trim() || "")) startWatching();
}

function handleKeydown(event) {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) startWatching();
}

function startWatching() {
  const slug = problemSlug();
  if (!slug || currentRun) return;

  currentRun = { slug, startedAt: Math.floor(Date.now() / 1000), stopped: false };
  showPageStatus("Waiting for result", "working");
  pollForAcceptedSubmission(currentRun);
}

async function pollForAcceptedSubmission(run) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  try {
    while (!run.stopped && Date.now() < deadline && problemSlug() === run.slug) {
      const submission = await fetchLatestAcceptedSubmission(run.slug, run.startedAt - 3);
      if (submission) {
        const question = await fetchQuestion(run.slug);
        await sendForSync({ source: "leetcode.com", question, submission });
        showPageStatus("Saved to GitHub", "success");
        return;
      }
      await delay(POLL_INTERVAL_MS);
    }
    if (!run.stopped) showPageStatus("No accepted result", "neutral");
  } catch (error) {
    console.warn("[LeetSync] Could not sync the submission:", error);
    showPageStatus("Sync failed", "error");
    if (!error.alreadyRecorded) await reportError(error);
  } finally {
    if (currentRun === run) currentRun = null;
  }
}

async function sendForSync(payload) {
  const response = await chrome.runtime.sendMessage({ type: "syncSubmission", payload });
  if (!response?.ok) {
    const error = new Error(response?.error || "The extension could not save this submission.");
    error.alreadyRecorded = true;
    throw error;
  }
}

async function fetchQuestion(titleSlug) {
  const data = await leetcodeGraphQL(
    `query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags { name slug }
      }
    }`,
    { titleSlug }
  );
  if (!data?.question) throw new Error("LeetCode did not return the problem details.");
  return {
    frontendId: data.question.questionFrontendId,
    title: data.question.title,
    titleSlug: data.question.titleSlug,
    difficulty: data.question.difficulty,
    topicTags: data.question.topicTags || []
  };
}

async function fetchLatestAcceptedSubmission(questionSlug, minimumTimestamp) {
  const list = await leetcodeGraphQL(
    `query submissionList($questionSlug: String!, $limit: Int!, $offset: Int!) {
      questionSubmissionList(questionSlug: $questionSlug, limit: $limit, offset: $offset) {
        submissions { id statusDisplay lang langName runtime memory timestamp }
      }
    }`,
    { questionSlug, limit: 10, offset: 0 }
  );
  const accepted = (list?.questionSubmissionList?.submissions || []).find((item) =>
    item.statusDisplay === ACCEPTED_STATUS && Number(item.timestamp || 0) >= minimumTimestamp
  );
  if (!accepted) return null;

  // The list gives us the result; the details query provides the submitted source code.
  const details = await leetcodeGraphQL(
    `query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code runtime memory timestamp lang { name verboseName }
      }
    }`,
    { submissionId: Number(accepted.id) }
  );
  const detail = details?.submissionDetails;
  if (!detail?.code) throw new Error("LeetCode did not return the accepted solution code.");
  return {
    submissionId: String(accepted.id),
    statusDisplay: ACCEPTED_STATUS,
    lang: detail.lang?.name || accepted.lang || "text",
    langName: detail.lang?.verboseName || accepted.langName || accepted.lang || "Text",
    runtime: detail.runtime || accepted.runtime || "",
    memory: detail.memory || accepted.memory || "",
    timestamp: detail.timestamp || accepted.timestamp || "",
    code: detail.code
  };
}

async function leetcodeGraphQL(query, variables) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrftoken": readCookie("csrftoken")
    },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `LeetCode returned HTTP ${response.status}.`);
  }
  return payload.data;
}

function problemSlug() {
  return window.location.pathname.match(/^\/problems\/([^/]+)/)?.[1] || "";
}

function readCookie(name) {
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reportError(error) {
  try {
    await chrome.runtime.sendMessage({ type: "recordError", error: error?.message || String(error) });
  } catch (_) {
    // The popup cannot show diagnostics if the extension was reloaded during a submission.
  }
}

function showPageStatus(message, state) {
  let notice = document.getElementById("leetsync-status");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "leetsync-status";
    notice.setAttribute("role", "status");
    notice.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:9px 12px;border-radius:6px;color:#fff;font:13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.2)";
    document.documentElement.appendChild(notice);
  }
  const colors = { working: "#57606a", success: "#1a7f37", error: "#cf222e", neutral: "#57606a" };
  notice.style.background = colors[state] || colors.neutral;
  notice.textContent = `LeetSync: ${message}`;
  clearTimeout(notice.removeTimer);
  notice.removeTimer = setTimeout(() => notice.remove(), state === "working" ? POLL_TIMEOUT_MS : 5000);
}
