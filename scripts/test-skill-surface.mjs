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
assert.match(skill, /"target"/);
assert.doesNotMatch(skill, /call audit --json '\{\}'/);

const bin = join(root, "dist/index.js");
assert.equal(existsSync(bin), true, "dist/index.js missing — build first");
const fixture = join(root, "tests/fixtures/good-mcp.mjs");
assert.equal(existsSync(fixture), true);

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

const missing = await run(["call", "audit", "--json", "{}"]);
assert.equal(missing.code, 1, missing.stdout + missing.stderr);
assert.match(missing.stderr + missing.stdout, /missing required argument: target/);
assert.doesNotMatch(missing.stderr + missing.stdout, /EINVALIDTAGNAME|npm pack failed|Invalid tag name/);

const audited = await run(["call", "audit", "--json", JSON.stringify({ target: fixture })]);
assert.equal(audited.code, 0, audited.stderr + audited.stdout);
const report = JSON.parse(audited.stdout);
assert.equal(typeof report.totalScore, "number", audited.stdout);
assert.match(String(report.grade), /^[A-F]$/);
assert.ok(Array.isArray(report.checks) && report.checks.length > 0, "audit report has checks");
assert.ok(report.totalScore >= 80, `good fixture via call audit scored ${report.totalScore}`);
assert.ok(report.target && typeof report.target.displayName === "string");

const unknown = await run(["call", "not_a_real_tool_name"]);
assert.equal(unknown.code, 1);
assert.match(unknown.stderr + unknown.stdout, /Unknown tool/);

console.log(
  JSON.stringify(
    {
      ok: true,
      suite: "skill-surface",
      tool: "audit",
      fixture,
      totalScore: report.totalScore,
      grade: report.grade
    },
    null,
    2
  )
);
