import assert from 'node:assert/strict';
import {
  checkDenseSeriesCaps,
  _denseSeriesCapHintForTests as CAP_HINT
} from '../dist/audit/checks/dense-series-caps.js';

// Contract text must NOT satisfy hard-cap regex (skeptic: no agent-safe-series in CAP).
assert.equal(CAP_HINT.test('agent-safe-series/v1'), false);
assert.equal(CAP_HINT.test('max_points hard cap'), true);

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

// Schema max_points + contract in description only — FAIL (OSS-300 #13)
const passContractInDesc = checkDenseSeriesCaps({
  tools: [
    {
      name: 'y_heart_series',
      description: 'agent-safe-series/v1 dense series',
      inputSchema: { properties: { max_points: { type: 'number' } } }
    }
  ]
});
assert.ok(passContractInDesc.score < 10, 'description-only contract_version must fail');

const passOutputContract = checkDenseSeriesCaps({
  tools: [
    {
      name: 'y_heart_series',
      description: 'dense series',
      inputSchema: { properties: { max_points: { type: 'number' } } },
      outputSchema: { properties: { contract_version: { const: 'agent-safe-series/v1' } } }
    }
  ]
});
assert.equal(passOutputContract.score, 10);

// Empty schema + contract description only — MUST fail hard cap (inventory #19)
const contractDescOnly = checkDenseSeriesCaps({
  tools: [
    {
      name: 'w_activity_series',
      description: 'agent-safe-series/v1',
      inputSchema: {}
    }
  ]
});
assert.ok(contractDescOnly.score < 10, 'contract-only description must not pass hard cap');
assert.ok(
  contractDescOnly.details.some((d) => /missing hard cap.*max_points in inputSchema\.properties.*w_activity_series/.test(d)),
  `expected hard-cap schema detail, got: ${JSON.stringify(contractDescOnly.details)}`
);

// Description mentions max_points but schema empty — still fail (schema required)
const capInDescOnly = checkDenseSeriesCaps({
  tools: [
    {
      name: 'v_stream_series',
      description: 'returns series with max_points hard cap and agent-safe-series/v1',
      inputSchema: {}
    }
  ]
});
assert.ok(capInDescOnly.score < 10, 'description-only max_points must not pass');
assert.ok(capInDescOnly.details.some((d) => /missing hard cap/.test(d)));

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
    passContractInDesc: passContractInDesc.score,
    passOutputContract: passOutputContract.score,
    contractDescOnly: contractDescOnly.score,
    capInDescOnly: capInDescOnly.score,
    fail: fail.score,
    missingContract: missingContract.score
  })
);
