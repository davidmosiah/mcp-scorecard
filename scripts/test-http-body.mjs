import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readJsonBody, HttpBodyError, MAX_JSON_BODY_BYTES as max } from '../dist/http-body.js';

let checks = 0;
function request(headers = {}) { const r = new PassThrough(); r.headers = headers; return r; }
async function accepted(parts, expected) {
  const req = request(); const promise = readJsonBody(req);
  for (const part of parts) req.write(part);
  req.end(); assert.deepEqual(await promise, expected); checks++;
}
async function rejected(parts, status, headers = {}, event = null) {
  const req = request(headers); const promise = readJsonBody(req);
  const rejected = assert.rejects(promise, error => error instanceof HttpBodyError && error.status === status);
  for (const part of parts) req.write(part);
  if (event) req.emit(event); else req.end();
  await rejected; req.destroy(); checks++;
}
await accepted([], undefined);
await accepted([Buffer.from('{"ok":'), Buffer.from('true}')], { ok: true });
await accepted([Buffer.from('"😀"').subarray(0, 3), Buffer.from('"😀"').subarray(3)], '😀');
const exact = JSON.stringify({ x: 'a'.repeat(max - 8) });
assert.equal(Buffer.byteLength(exact), max);
await accepted([exact], { x: 'a'.repeat(max - 8) });
await rejected([exact + ' '], 413);
await rejected([exact, ' '], 413);
await rejected(['"' + '😀'.repeat(max / 4) + '"'], 413);
await rejected(['{'], 400);
for (const encoding of ['gzip', 'deflate', 'br', 'identity,gzip']) await rejected([], 415, { 'content-encoding': encoding });
const identity = request({ 'content-encoding': 'IDENTITY' }); const body = readJsonBody(identity); identity.end('{}'); assert.deepEqual(await body, {}); checks++;
await rejected(['{'], 400, {}, 'aborted');
// Oversize returns a fixed diagnostic, never echoes the request content.
const req = request(); const pending = readJsonBody(req).catch(error => error);
req.write('PRIVATE_FIXTURE_' + 'x'.repeat(max));
const error = await pending; assert.equal(error.status, 413); assert.doesNotMatch(error.message, /PRIVATE_FIXTURE/); assert.equal(req.isPaused(), true); req.destroy(); checks++;
// A late stream error after early header rejection must be observed, not uncaught.
const early = request({ 'content-encoding': 'gzip' });
const earlyResult = readJsonBody(early).catch(error => error);
early.emit('error', new Error('synthetic disconnect'));
assert.equal((await earlyResult).status, 415); early.destroy(); checks++;
console.log(JSON.stringify({ ok: true, suite: 'http-body', checks }));
