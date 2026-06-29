(function exposeCore(global) {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    basePath: "leetcode",
    includeReadme: true
  });

  const LANGUAGE_EXTENSIONS = Object.freeze({
    bash: "sh",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    dart: "dart",
    elixir: "ex",
    erlang: "erl",
    golang: "go",
    go: "go",
    java: "java",
    javascript: "js",
    kotlin: "kt",
    mysql: "sql",
    mssql: "sql",
    oraclesql: "sql",
    php: "php",
    postgresql: "sql",
    python: "py",
    python3: "py",
    racket: "rkt",
    ruby: "rb",
    rust: "rs",
    scala: "scala",
    swift: "swift",
    typescript: "ts"
  });

  function normalizeSettings(input = {}, current = DEFAULT_SETTINGS) {
    const token = typeof input.token === "string" && input.token.trim()
      ? input.token.trim()
      : current.token || "";
    const settings = {
      token,
      owner: text(input.owner),
      repo: text(input.repo),
      branch: text(input.branch) || "main",
      basePath: normalizeBasePath(input.basePath),
      includeReadme: Boolean(input.includeReadme)
    };

    if (settings.owner && !/^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/.test(settings.owner)) {
      throw new Error("Enter a valid GitHub owner.");
    }
    if (settings.repo && !/^[A-Za-z0-9_.-]{1,100}$/.test(settings.repo)) {
      throw new Error("Enter a valid GitHub repository name.");
    }
    if (!isValidBranch(settings.branch)) {
      throw new Error("Enter a valid Git branch name.");
    }

    return settings;
  }

  function normalizeBasePath(value) {
    const path = text(value)
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/{2,}/g, "/") || "leetcode";
    const segments = path.split("/");
    if (segments.some((part) => !part || part === "." || part === ".." || /[\x00-\x1f]/.test(part))) {
      throw new Error("Enter a valid destination folder.");
    }
    return path;
  }

  function isValidBranch(branch) {
    const forbidden = ["~", "^", ":", "?", "*", "[", "\\"];
    return Boolean(branch)
      && branch !== "@"
      && !branch.startsWith(".")
      && !branch.startsWith("/")
      && !branch.endsWith(".")
      && !branch.endsWith("/")
      && !branch.endsWith(".lock")
      && !branch.includes("..")
      && !branch.includes("@{")
      && !branch.includes("//")
      && !forbidden.some((character) => branch.includes(character))
      && ![...branch].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127);
  }

  function validateSubmission(payload) {
    if (!payload || typeof payload !== "object" || !payload.question || !payload.submission) {
      throw new Error("LeetCode sent an incomplete submission.");
    }
    if (!text(payload.question.titleSlug) || !text(payload.question.title)) {
      throw new Error("The problem details are incomplete.");
    }
    if (!text(payload.submission.code) || !text(payload.submission.submissionId)) {
      throw new Error("The accepted solution could not be read.");
    }
  }

  function buildSubmissionFiles(settings, payload) {
    validateSubmission(payload);
    const { question, submission } = payload;
    const folder = joinPath(settings.basePath, problemFolderName(question));
    const extension = extensionForLanguage(submission.lang);
    const files = [{
      path: joinPath(folder, `${question.titleSlug}.${extension}`),
      content: String(submission.code)
    }];

    if (settings.includeReadme) {
      files.push({
        path: joinPath(folder, "README.md"),
        content: buildProblemReadme(question, submission)
      });
    }
    return files;
  }

  function buildProblemReadme(question, submission) {
    const tags = Array.isArray(question.topicTags)
      ? question.topicTags.map((tag) => text(tag.name)).filter(Boolean).join(", ")
      : "";
    const submittedAt = parseSubmissionDate(submission.timestamp);

    return [
      `# ${question.frontendId ? `${question.frontendId}. ` : ""}${question.title}`,
      "",
      `- **Difficulty:** ${question.difficulty || "Unknown"}`,
      `- **Language:** ${submission.langName || submission.lang || "Unknown"}`,
      `- **Runtime:** ${submission.runtime || "Not reported"}`,
      `- **Memory:** ${submission.memory || "Not reported"}`,
      `- **Submitted:** ${submittedAt}`,
      `- **Topics:** ${tags || "Not listed"}`,
      "",
      `[View the problem on LeetCode](https://leetcode.com/problems/${question.titleSlug}/)`,
      "",
      `<!-- Synced by LeetSync from submission ${submission.submissionId}. -->`,
      ""
    ].join("\n");
  }

  function parseSubmissionDate(timestamp) {
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || seconds <= 0) return "Unknown";
    return new Date(seconds * 1000).toISOString();
  }

  function problemFolderName(question) {
    const rawId = text(question.frontendId);
    const id = /^\d+$/.test(rawId) ? rawId.padStart(4, "0") : rawId || "0000";
    const slug = text(question.titleSlug).replace(/[^A-Za-z0-9_.-]/g, "-");
    return `${id}-${slug}`;
  }

  function extensionForLanguage(language) {
    const key = text(language).toLowerCase().replace(/[^a-z0-9]/g, "");
    return LANGUAGE_EXTENSIONS[key] || "txt";
  }

  function joinPath(...parts) {
    return parts.filter(Boolean).join("/").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  global.LeetSyncCore = Object.freeze({
    DEFAULT_SETTINGS,
    buildSubmissionFiles,
    extensionForLanguage,
    joinPath,
    normalizeBasePath,
    normalizeSettings,
    problemFolderName,
    validateSubmission
  });
})(globalThis);
