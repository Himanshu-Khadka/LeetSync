import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(readFileSync("src/core.js", "utf8"), context);
const core = context.LeetSyncCore;

test("normalizes settings and keeps an existing token", () => {
  const settings = core.normalizeSettings({
    token: "",
    owner: "octocat",
    repo: "solutions",
    branch: "main",
    basePath: "/leetcode//daily/",
    includeReadme: true
  }, { ...core.DEFAULT_SETTINGS, token: "saved-token" });

  assert.equal(settings.token, "saved-token");
  assert.equal(settings.basePath, "leetcode/daily");
});

test("rejects unsafe destination paths", () => {
  assert.throws(() => core.normalizeBasePath("leetcode/../private"), /destination folder/);
});

test("rejects invalid Git branch names", () => {
  assert.throws(() => core.normalizeSettings({ branch: "feature..broken" }), /branch name/);
  assert.throws(() => core.normalizeSettings({ branch: "release.lock" }), /branch name/);
});

test("builds stable solution and README paths", () => {
  const files = core.buildSubmissionFiles(core.DEFAULT_SETTINGS, {
    question: {
      frontendId: "1",
      title: "Two Sum",
      titleSlug: "two-sum",
      difficulty: "Easy",
      topicTags: [{ name: "Array" }]
    },
    submission: {
      submissionId: "123",
      lang: "python3",
      langName: "Python3",
      code: "class Solution: pass",
      timestamp: "1700000000"
    }
  });

  assert.deepEqual(Array.from(files, (file) => file.path), [
    "leetcode/0001-two-sum/two-sum.py",
    "leetcode/0001-two-sum/README.md"
  ]);
  assert.match(files[1].content, /View the problem on LeetCode/);
  assert.doesNotMatch(files[1].content, /Problem statement/);
});

test("uses a text file for unknown languages", () => {
  assert.equal(core.extensionForLanguage("new-language"), "txt");
});
