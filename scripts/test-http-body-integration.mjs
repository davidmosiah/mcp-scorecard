import assert from 'node:assert/strict';
import { request } from 'node:http';
import { connect } from 'node:net';
import { listenHttpV2 } from '../dist/http-v2.js';
import { createScorecardServer } from '../dist/mcp-server.js';

let factories = 0;
const server = await listenHttpV2({ name: 'body-limit-fixture', version: '0', host: '127.0.0.1', port: 0,
  createServer: () => { factories++; return createScorecardServer(); } });
let checks = 0;
try {
  for (const [body, encoding, status] of [['{', null, 400], ['{}', 'gzip', 415], ['x'.repeat(1024 * 1024 + 1), null, 413]]) {
    const headers = { 'content-type': 'application/json' };
    if (encoding) headers['content-encoding'] = encoding;
    const res = await fetch(server.url + '/mcp', { method: 'POST', headers, body });
    assert.equal(res.status, status); assert.equal(res.headers.get('connection'), 'close');
    const text = await res.text(); assert.ok(text.length < 200); checks++;
  }
  const chunked = await new Promise((resolve, reject) => {
    const req = request(server.url + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json' } }, res => {
      let body = ''; res.on('data', x => { body += x; }); res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    for (let i = 0; i < 17; i++) req.write(Buffer.alloc(65536, 120));
    req.end();
  });
  assert.equal(chunked.status, 413); checks++;
  // A disconnected client with unsupported encoding must not crash the server.
  const endpoint = new URL(server.url);
  await new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port: Number(endpoint.port) });
    socket.on('error', reject);
    socket.on('connect', () => {
      socket.write('POST /mcp HTTP/1.1\r\nHost: localhost\r\nContent-Encoding: gzip\r\nContent-Length: 10000\r\n\r\n{');
      setImmediate(() => socket.destroy());
    });
    socket.on('close', resolve);
  });
  assert.equal((await fetch(server.url + '/health')).status, 200); checks++;
  assert.equal(factories, 0, 'rejected bodies must not instantiate MCP servers'); checks++;
  assert.equal((await fetch(server.url + '/health')).status, 200); checks++;
  const valid = await fetch(server.url + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'body-fixture', version: '0' } } }) });
  assert.equal(valid.status, 200); assert.equal(factories, 1); checks++;
  console.log(JSON.stringify({ ok: true, suite: 'http-body-integration', checks }));
} finally { await server.close(); }
