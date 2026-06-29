import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const packageFile = JSON.parse(readFileSync("package.json", "utf8"));

test("manifest and package versions match", () => {
  assert.equal(manifest.version, packageFile.version);
});

test("every manifest entry point exists", () => {
  const paths = [
    manifest.action.default_popup,
    manifest.background.service_worker,
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
    ...manifest.content_scripts.flatMap((script) => script.js)
  ];
  for (const path of paths) assert.equal(existsSync(path), true, `${path} should exist`);
});

test("release permissions stay narrow", () => {
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://leetcode.com/*", "https://api.github.com/*"]);
});
