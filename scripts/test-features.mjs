import assert from 'node:assert/strict';
import { dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyProfile, isProfile } from '../dist/profiles.js';
import { isLocalSubject, resolveLocal } from '../dist/resolvers/local-resolver.js';

const rep = {
  target: { displayName: 'x' }, totalScore: 0, grade: 'F', mode: 'web', generatedAt: 'now', scorecardVersion: '0.4.0',
  checks: [
    { id: 'web_https', label: 'HTTPS', score: 10, status: 'pass', summary: '', details: [], fixes: [] },           // security
    { id: 'web_exposed_paths', label: 'No exposed secrets', score: 0, status: 'fail', summary: '', details: [], fixes: [] }, // security
    { id: 'web_llms_txt', label: 'llms', score: 10, status: 'pass', summary: '', details: [], fixes: [] },          // agent-ready
    { id: 'web_structured_data', label: 'sd', score: 10, status: 'pass', summary: '', details: [], fixes: [] }      // agent-ready
  ]
};
assert.ok(isProfile('security') && isProfile('agent-ready') && !isProfile('bogus'), 'isProfile');
const sec = applyProfile(rep, 'security');
assert.equal(sec.checks.length, 2, 'security profile keeps 2 security checks');
assert.equal(sec.totalScore, 50, 'security rescaled: (10+0)/20 = 50');  // rescored over filtered
const ar = applyProfile(rep, 'agent-ready');
assert.equal(ar.checks.length, 2, 'agent-ready keeps 2');
assert.equal(ar.totalScore, 100, 'agent-ready rescaled: 100');
const all = applyProfile(rep, 'all');
assert.equal(all.checks.length, 4, 'all keeps everything');

// Local path classification + package-dir bin resolution (offline CLI UX)
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = pathResolve(__dirname, '..');
const fixtureRel = 'tests/fixtures/good-mcp.mjs';
assert.ok(isLocalSubject(fixtureRel), 'relative fixture path is local');
assert.ok(isLocalSubject(pathResolve(pkgRoot, fixtureRel)), 'absolute fixture path is local');
assert.ok(!isLocalSubject('whoop-mcp-unofficial'), 'bare npm name is not local');
const fileTarget = resolveLocal(fixtureRel);
assert.equal(fileTarget.args[0], pathResolve(pkgRoot, fixtureRel));
const dirTarget = resolveLocal(pkgRoot);
assert.ok(dirTarget.args[0].endsWith('dist/index.js'), 'package dir resolves bin entry');
assert.equal(dirTarget.displayName, 'mcp-scorecard');

console.log('features OK: applyProfile filters+rescales (security=50, agent-ready=100, all=4); local resolver relative+dir');
