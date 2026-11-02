/**
 * Streamable HTTP v2 stateless transport — same contract as garmin-mcp:
 * no session id, JSON responses, new MCP server per POST, loopback default.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

import { HttpBodyError, readJsonBody } from "./http-body.js";

export type HttpV2Options = {
  name: string;
  version: string;
  createServer: () => Server;
  host?: string;
  port?: number;
};

export async function handleHttpV2Request(
  options: HttpV2Options,
  req: IncomingMessage,
  res: ServerResponse,
  body?: unknown
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${options.host ?? "127.0.0.1"}`);
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, name: options.name, version: options.version }));
    return;
  }
  if (req.method === "POST" && url.pathname === "/mcp") {
    const server = options.createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on("close", () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

export function listenHttpV2(options: HttpV2Options): Promise<{ url: string; close: () => Promise<void> }> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 3000;
  return new Promise((resolve, reject) => {
    const httpServer = createServer((req, res) => {
      const run = async () => {
        const body = req.method === "POST" ? await readJsonBody(req) : undefined;
        await handleHttpV2Request({ ...options, host }, req, res, body);
      };
      run().catch((error) => {
        if (error instanceof HttpBodyError) {
          if (!res.headersSent && !res.destroyed) {
            res.writeHead(error.status, { "content-type": "application/json", connection: "close" });
            res.end(JSON.stringify({ error: error.message }), () => req.destroy());
          }
          return;
        }
        console.error("MCP HTTP request failed:", error);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(
            JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null })
          );
        }
      });
    });
    httpServer.on("error", reject);
    httpServer.listen(port, host, () => {
      const addr = httpServer.address();
      const bound = typeof addr === "object" && addr ? addr.port : port;
      resolve({
        url: `http://${host}:${bound}`,
        close: () =>
          new Promise((done, fail) => {
            httpServer.close((err) => (err ? fail(err) : done()));
          })
      });
    });
  });
}
