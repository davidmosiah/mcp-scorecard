import assert from "node:assert/strict";
import { createScorecardServer } from "../dist/mcp-server.js";
import { handleHttpV2Request, listenHttpV2 } from "../dist/http-v2.js";
import { SERVER_NAME, SERVER_VERSION } from "../dist/constants.js";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

const initBody = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "http-v2-test", version: "0" }
  }
};

function healthViaHandler() {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = "GET";
    req.url = "/health";
    const res = new ServerResponse(req);
    const chunks = [];
    res.write = (chunk, enc, cb) => {
      chunks.push(Buffer.from(chunk));
      if (typeof enc === "function") enc();
      else if (typeof cb === "function") cb();
      return true;
    };
    res.end = (chunk, enc, cb) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      if (typeof enc === "function") enc();
      else if (typeof cb === "function") cb();
      try {
        resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") });
      } catch (error) {
        reject(error);
      }
      return res;
    };
    handleHttpV2Request(
      { name: SERVER_NAME, version: SERVER_VERSION, createServer: createScorecardServer },
      req,
      res
    ).catch(reject);
  });
}

const health = await healthViaHandler();
assert.equal(health.body.ok, true);
assert.equal(health.body.name, "mcp-scorecard");
assert.ok(health.body.version);

const first = await listenHttpV2({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  createServer: createScorecardServer,
  host: "127.0.0.1",
  port: 0
});
const second = await listenHttpV2({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  createServer: createScorecardServer,
  host: "127.0.0.1",
  port: 0
});

try {
  for (const { url } of [first, second]) {
    const healthRes = await fetch(`${url}/health`);
    const healthJson = await healthRes.json();
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.name, "mcp-scorecard");
    assert.ok(healthJson.version);

    const mcpRes = await fetch(`${url}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify(initBody)
    });
    const text = await mcpRes.text();
    assert.equal(mcpRes.headers.get("mcp-session-id"), null);
    assert.match(text, /"jsonrpc"\s*:\s*"2\.0"/);
    assert.doesNotMatch(text, /<html/i);
  }
} finally {
  await first.close();
  await second.close();
}

console.log(JSON.stringify({ ok: true, suite: "http-v2", version: SERVER_VERSION }));
