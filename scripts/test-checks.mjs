#!/usr/bin/env node
/**
 * Synthetic-fixture tests. Boots each of the 4 fixture MCP servers via
 * the runAudit() pipeline (so probe + checks + scorer run end-to-end)
 * and asserts the score lands in the expected band for each.
 *
 * These tests use ONLY the local synthetic fixtures — no real npm
 * packages, no real MCPs probed.
 */
import assert from 'node:assert/strict';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runAudit } from '../dist/audit/runner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = pathResolve(__dirname, '..', 'tests', 'fixtures');

function fixtureTarget(file, displayName) {
  return {
    displayName,
    version: '0.0.0-fixture',
    command: 'node',
    args: [pathResolve(FIXTURES, file)],
    packageDir: FIXTURES,
    packageJson: {
      name: displayName,
      version: '0.0.0-fixture',
      scripts: {} // intentionally no smoke script, no test script
    }
  };
}

async function runCase(label, file, displayName, predicate) {
  process.stdout.write(`[test] ${label} ... `);
  const report = await runAudit(fixtureTarget(file, displayName));
  const ok = predicate(report);
  if (!ok) {
    process.stdout.write(`FAIL\n`);
    process.stderr.write(`Score: ${report.totalScore}\n`);
    for (const c of report.checks) {
      process.stderr.write(`  [${c.status}] ${c.label} (${c.score}/10) — ${c.summary}\n`);
    }
    throw new Error(`Predicate failed for ${label}`);
  }
  process.stdout.write(`OK (score=${report.totalScore})\n`);
  return report;
}

let failures = 0;
try {
  // "good" fixture should score very high; smoke-test will dock it (~10pts)
  // because we deliberately omit a smoke script in the fake package.json.
  await runCase('good fixture scores >= 80', 'good-mcp.mjs', 'good-fixture', (r) => r.totalScore >= 80);

  // "medium" fixture should land mid-band
  await runCase(
    'medium fixture scores 35-65',
    'medium-mcp.mjs',
    'medium-fixture',
    (r) => r.totalScore >= 35 && r.totalScore <= 65
  );

  // "bad" fixture should score low
  await runCase('bad fixture scores <= 35', 'bad-mcp.mjs', 'bad-fixture', (r) => r.totalScore <= 35);

  // "readonly" fixture: no mutations → mutation_gating = 10 (vacuous);
  // all annotations present → annotations check = 10
  const ro = await runCase('readonly fixture scores >= 80', 'readonly-mcp.mjs', 'readonly-fixture', (r) => r.totalScore >= 80);
  const mg = ro.checks.find((c) => c.id === 'mutation_gating');
  assert.equal(mg?.score, 10, 'readonly: mutation_gating should be 10 (n/a)');
  const ann = ro.checks.find((c) => c.id === 'annotations');
  assert.equal(ann?.score, 10, 'readonly: annotations should be 10');

  // Spot-check per-check behavior on "bad"
  const bad = await runAudit(fixtureTarget('bad-mcp.mjs', 'bad-fixture'));
  const sv = bad.checks.find((c) => c.id === 'schema_validity');
  assert.ok(sv && sv.score < 10, 'bad: schema_validity should be < 10 (one tool missing schema)');
  const tn = bad.checks.find((c) => c.id === 'tool_naming');
  assert.ok(tn && tn.score < 7, 'bad: tool_naming should be < 7 (hyphen + camelCase)');
  const am = bad.checks.find((c) => c.id === 'agent_manifest');
  assert.equal(am?.score, 0, 'bad: agent_manifest should be 0');
  const md = bad.checks.find((c) => c.id === 'manifest_discoverability');
  assert.equal(md?.score, 0, 'bad: manifest_discoverability should be 0');

  process.stdout.write('\nAll check tests passed.\n');
} catch (err) {
  failures = 1;
  process.stderr.write(`\nTest failure: ${err instanceof Error ? err.message : String(err)}\n`);
  if (err instanceof Error && err.stack) process.stderr.write(err.stack + '\n');
}
process.exit(failures);
