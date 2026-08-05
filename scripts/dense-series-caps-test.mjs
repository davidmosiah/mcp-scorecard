import assert from 'node:assert/strict';
import { checkDenseSeriesCaps } from '../dist/audit/checks/dense-series-caps.js';

const pass = checkDenseSeriesCaps({
  tools: [
    { name: 'x_activity_series', description: 'agent-safe-series/v1 with max_points hard cap', inputSchema: { properties: { max_points: { type: 'number' } } } }
  ]
});
assert.equal(pass.score, 10);

const fail = checkDenseSeriesCaps({
  tools: [{ name: 'x_get_streams', description: 'returns all samples', inputSchema: {} }]
});
assert.ok(fail.score < 10);
console.log(JSON.stringify({ ok: true, suite: 'dense-series-caps', pass: pass.score, fail: fail.score }));
