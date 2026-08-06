import assert from 'node:assert/strict';
import { checkDenseSeriesCaps } from '../dist/audit/checks/dense-series-caps.js';

const pass = checkDenseSeriesCaps({
  tools: [
    {
      name: 'x_activity_series',
      description: 'agent-safe-series/v1 dense series',
      inputSchema: { properties: { max_points: { type: 'number' }, contract_version: { type: 'string' } } }
    }
  ]
});
assert.equal(pass.score, 10);

const passDescOnly = checkDenseSeriesCaps({
  tools: [
    {
      name: 'y_heart_series',
      description: 'agent-safe-series/v1 with max_points hard cap',
      inputSchema: { properties: { max_points: { type: 'number' } } }
    }
  ]
});
assert.equal(passDescOnly.score, 10);

const fail = checkDenseSeriesCaps({
  tools: [{ name: 'x_get_streams', description: 'returns all samples', inputSchema: {} }]
});
assert.ok(fail.score < 10);

const missingContract = checkDenseSeriesCaps({
  tools: [
    {
      name: 'z_activity_series',
      description: 'dense points only',
      inputSchema: { properties: { max_points: { type: 'number' } } }
    }
  ]
});
assert.ok(missingContract.score < 10, 'should penalize missing contract marker');

console.log(
  JSON.stringify({
    ok: true,
    suite: 'dense-series-caps',
    pass: pass.score,
    passDescOnly: passDescOnly.score,
    fail: fail.score,
    missingContract: missingContract.score
  })
);
