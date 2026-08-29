import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL(".", import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
assert.ok(pkg.files.includes("skill"));
assert.equal(existsSync(join(root, "skill/SKILL.md")), true);
const skill = readFileSync(join(root, "skill/SKILL.md"), "utf8");
assert.doesNotMatch(skill, /^[A-Z][A-Z0-9_]*_ALLOW_MUTATIONS\s*=\s*true$/m);
assert.match(skill, /call audit/);

const bin = join(root, "dist/index.js");
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], { env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += c;
    });
    child.stderr.on("data", (c) => {
      stderr += c;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

const version = await run(["--version"]);
assert.equal(version.code, 0, version.stderr);
assert.match(version.stdout, /0\.\d+\.\d+/);

const unknown = await run(["call", "not_a_real_tool_name"]);
assert.equal(unknown.code, 1);
assert.match(unknown.stderr + unknown.stdout, /Unknown tool/);

console.log(JSON.stringify({ ok: true, suite: "skill-surface", tool: "audit" }, null, 2));
