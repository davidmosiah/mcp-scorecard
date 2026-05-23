#!/usr/bin/env node
/**
 * Self-test. Runs the scorecard against this very package and asserts
 * the score >= 80. If it doesn't, the build is dogfooding incorrectly
 * and we should not ship.
 *
 * We resolve our own dist/index.js directly (no npm pack) so this works
 * pre-publish.
 */
import assert from 'node:assert/strict';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAudit } from '../dist/audit/runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = pathResolve(__dirname, '..');
const SELF_BIN = pathResolve(PKG_DIR, 'dist', 'index.js');

const pkgJson = JSON.parse(
  await import('node:fs').then((fs) => fs.readFileSync(pathResolve(PKG_DIR, 'package.json'), 'utf8'))
);

const target = {
  displayName: pkgJson.name,
  version: pkgJson.version,
  command: 'node',
  args: [SELF_BIN, '--help'], // probe needs ANY stdio MCP — but we are an
  packageDir: PKG_DIR,
  packageJson: pkgJson
};

// Wait — mcp-scorecard is itself a CLI, NOT an MCP server. Auditing it
// would fail at probe.connect() because the binary doesn't speak MCP.
//
// Self-test strategy: run against the synthetic "good" fixture (which
// IS an MCP server), then assert the scorecard reports >= 80 on it.
// This proves the audit pipeline works end-to-end while not making a
// non-MCP binary pretend to be one.

const goodFixture = pathResolve(PKG_DIR, 'tests', 'fixtures', 'good-mcp.mjs');
const goodTarget = {
  displayName: pkgJson.name + ' (self-test against good fixture)',
  version: pkgJson.version,
  command: 'node',
  args: [goodFixture],
  packageDir: PKG_DIR, // use our own package.json so smoke-test check sees our scripts/smoke-self.mjs
  packageJson: pkgJson
};

const report = await runAudit(goodTarget);

process.stdout.write(`\nSelf-test report for ${pkgJson.name} v${pkgJson.version}\n`);
process.stdout.write(`Score: ${report.totalScore}/100\n`);
for (const c of report.checks) {
  process.stdout.write(`  [${c.status}] ${c.label} (${c.score}/10) — ${c.summary}\n`);
}

assert.ok(
  report.totalScore >= 80,
  `Self-test failed: score ${report.totalScore} < 80. Fix the flagged checks before shipping.`
);

process.stdout.write(`\nSelf-test passed (score=${report.totalScore} >= 80).\n`);
