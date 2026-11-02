import assert from 'node:assert/strict';
import { checkSchemaValidity } from '../dist/audit/checks/schema-validity.js';
const dialects = [undefined, 'http://json-schema.org/draft-07/schema#', 'https://json-schema.org/draft/2019-09/schema', 'https://json-schema.org/draft/2020-12/schema'];
const snapshot = schemas => ({ serverInfo: {}, resources: [], prompts: [], tools: schemas.map((inputSchema, i) => ({ name: `fixture_${i}`, inputSchema })) });
let cases = 0;
for (const dialect of dialects) {
  const meta = dialect ? { $schema: dialect } : {};
  const valid = { ...meta, type: 'object', properties: { value: { type: 'string' } }, required: ['value'] };
  const result = checkSchemaValidity(snapshot([valid]));
  assert.equal(result.score, 10, `${dialect ?? 'default draft07'} must compile: ${result.details}`);
  assert.equal(result.status, 'pass'); cases++;
  for (const invalid of [{ ...meta, type: 'not-a-json-type' }, { ...meta, type: 'object', required: 'not-an-array' }, { ...meta, properties: { value: { minimum: 'not-a-number' } } }]) {
    const rejected = checkSchemaValidity(snapshot([invalid]));
    assert.equal(rejected.score, 0, `${dialect}: malformed schema must not pass`);
    assert.equal(rejected.status, 'fail'); cases++;
  }
}
for (const suffix of ['', '#']) {
  const result = checkSchemaValidity(snapshot([{ $schema: 'https://json-schema.org/draft/2020-12/schema' + suffix, type: 'object', properties: { tuple: { type: 'array', prefixItems: [{ type: 'string' }], items: false } } }]));
  assert.equal(result.score, 10); cases++;
}
// Draft-specific keyword shapes must be checked against their own meta-schema.
for (const invalid of [
  { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'array', items: [{ type: 'string' }] },
  { $schema: 'https://json-schema.org/draft/2020-12/schema', prefixItems: 'invalid' },
  { $schema: 'https://json-schema.org/draft/2019-09/schema', dependentRequired: { x: 'invalid' } },
  { $schema: 'https://unknown.invalid/schema', type: 'object' },
  { $schema: 42, type: 'object' }, null, [], true, 'object'
]) { assert.equal(checkSchemaValidity(snapshot([invalid])).score, 0); cases++; }
const mixed = checkSchemaValidity(snapshot([
  { type: 'object' },
  { $schema: dialects[3], type: 'object', $defs: { label: { type: 'string' } }, properties: { label: { $ref: '#/$defs/label' } } },
  { $schema: dialects[3], type: 'invalid' },
  { $schema: 'https://unknown.invalid/schema', type: 'object' }
]));
assert.equal(mixed.score, 5); assert.match(mixed.summary, /^2\/4 /); assert.equal(mixed.details.length, 2); cases++;
assert.equal(checkSchemaValidity(snapshot([])).status, 'fail'); cases++;
console.log(JSON.stringify({ ok: true, suite: 'schema-dialects', cases }));
