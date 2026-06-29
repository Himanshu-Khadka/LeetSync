import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const releaseName = `leetsync-${manifest.version}`;
const stage = join("dist", releaseName);
const archive = join("dist", `${releaseName}.zip`);
const files = [
  "manifest.json",
  "popup.html",
  "README.md",
  "INSTALL.md",
  "PRIVACY.md",
  "LICENSE",
  "assets",
  "store-assets",
  "src"
];

rmSync(stage, { recursive: true, force: true });
rmSync(archive, { force: true });
mkdirSync(stage, { recursive: true });

for (const source of files) {
  if (!existsSync(source)) throw new Error(`Release file is missing: ${source}`);
  const destination = join(stage, source);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

const result = spawnSync("tar", ["-a", "-c", "-f", archive, "-C", stage, "."], { stdio: "inherit" });
if (result.status !== 0) throw new Error("Could not create the release archive.");
console.log(`Created ${archive}`);
