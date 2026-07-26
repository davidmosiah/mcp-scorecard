import assert from 'node:assert/strict';
import { buildProbeEnv } from '../dist/audit/probe.js';
import { applyProfile, isProfile } from '../dist/profiles.js';

process.env.MCP_SCORECARD_SECRET_TEST = 'must-not-be-forwarded';
const probeEnv = buildProbeEnv('/tmp/mcp-scorecard-test-home');
assert.equal(probeEnv.MCP_PROBE, '1', 'probe env sets MCP_PROBE');
assert.equal(probeEnv.HOME, '/tmp/mcp-scorecard-test-home', 'probe env uses isolated HOME');
assert.equal(probeEnv.MCP_SCORECARD_SECRET_TEST, undefined, 'probe env does not forward arbitrary secrets');

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
console.log('features OK: applyProfile filters+rescales (security=50, agent-ready=100, all=4)');
