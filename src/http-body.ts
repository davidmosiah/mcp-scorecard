import type { IncomingMessage } from "node:http";

export const MAX_JSON_BODY_BYTES = 1024 * 1024;

export class HttpBodyError extends Error {
  constructor(public readonly status: 400 | 413 | 415, message: string) {
    super(message);
  }
}

/** Bound retained raw bytes before parsing; this is not a concurrency quota. */
export function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    let finished = false;
    const fail = (error: unknown) => {
      if (finished) return;
      finished = true;
      chunks.length = 0;
      req.pause();
      reject(error);
    };
    // Observe errors even when rejecting headers before reading any body bytes.
    req.on("error", fail);
    const encoding = req.headers["content-encoding"];
    if (encoding && String(encoding).trim().toLowerCase() !== "identity") {
      fail(new HttpBodyError(415, "Compressed request bodies are not supported"));
      return;
    }
    req.on("data", (chunk: Buffer | string) => {
      if (finished) return;
      const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += part.length;
      if (bytes > MAX_JSON_BODY_BYTES) {
        fail(new HttpBodyError(413, "JSON request body exceeds 1 MiB"));
        return;
      }
      chunks.push(part);
    });
    req.on("end", () => {
      if (finished) return;
      finished = true;
      if (bytes === 0) { resolve(undefined); return; }
      try { resolve(JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"))); }
      catch { reject(new HttpBodyError(400, "Invalid JSON request body")); }
      finally { chunks.length = 0; }
    });
    req.on("aborted", () => fail(new HttpBodyError(400, "Request body aborted")));
  });
}
