/**
 * Probe: connects to one MCP target over stdio, captures tools/resources/
 * prompts, optionally calls *_agent_manifest, then closes the transport.
 *
 * The captured snapshot is the only thing checks see — we never re-probe
 * during scoring. This keeps the audit deterministic and avoids hammering
 * the target.
 *
 * Privacy: we never log full responses to stdout/stderr; only counts and
 * field names. If a probe lands on a logged-in server, no user data leaks.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { PROBE_CLIENT_NAME, PROBE_ENV_FLAG, SERVER_VERSION } from '../constants.js';
import type { ProbeSnapshot, ResolvedTarget, ToolSnapshot } from '../types.js';

const PROBE_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Probe step "${label}" timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Find an *_agent_manifest tool from the captured list, if any. */
function findManifestTool(tools: ToolSnapshot[]): string | undefined {
  return tools.find((t) => /(^|_)agent_manifest$/.test(t.name))?.name;
}

/**
 * Sanitize a probe response into counts + key names only. NEVER returns
 * nested values — strings/numbers/booleans/arrays are reduced to lengths
 * or omitted entirely.
 */
function sanitizeManifestResponse(raw: unknown): ProbeSnapshot['agentManifest'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const rec = obj.recommended_first_calls;
  const std = obj.standard_tools;
  return {
    has_recommended_first_calls: Array.isArray(rec),
    recommended_first_calls_count: Array.isArray(rec) ? rec.length : 0,
    has_standard_tools: Array.isArray(std),
    standard_tools_count: Array.isArray(std) ? std.length : 0,
    raw_keys: Object.keys(obj).slice(0, 50)
  };
}

/**
 * Spawn the target MCP server and capture a snapshot.
 *
 * The transport inherits a sanitized env: the original env is passed
 * through (so the target finds node, paths, etc.) plus MCP_PROBE=1 so
 * authors can detect they are being audited and short-circuit auth.
 */
export async function probeTarget(target: ResolvedTarget): Promise<ProbeSnapshot> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v;
  }
  env[PROBE_ENV_FLAG] = '1';

  const transport = new StdioClientTransport({
    command: target.command,
    args: target.args,
    env,
    cwd: target.packageDir
  });

  const client = new Client({ name: PROBE_CLIENT_NAME, version: SERVER_VERSION });

  await withTimeout(client.connect(transport), PROBE_TIMEOUT_MS, 'connect');

  let toolsRes: { tools: ToolSnapshot[] } = { tools: [] };
  let resourcesRes: { resources: ProbeSnapshot['resources'] } = { resources: [] };
  let promptsRes: { prompts: ProbeSnapshot['prompts'] } = { prompts: [] };
  let agentManifest: ProbeSnapshot['agentManifest'];
  let serverInfo: ProbeSnapshot['serverInfo'] = {};

  try {
    // serverInfo from the negotiated server (available after connect)
    const sv = client.getServerVersion?.();
    if (sv) {
      serverInfo = { name: sv.name, version: sv.version };
    }

    toolsRes = (await withTimeout(client.listTools(), PROBE_TIMEOUT_MS, 'listTools')) as {
      tools: ToolSnapshot[];
    };

    // Resources and prompts are optional — some servers don't implement them.
    try {
      resourcesRes = (await withTimeout(
        client.listResources(),
        PROBE_TIMEOUT_MS,
        'listResources'
      )) as { resources: ProbeSnapshot['resources'] };
    } catch {
      resourcesRes = { resources: [] };
    }

    try {
      promptsRes = (await withTimeout(
        client.listPrompts(),
        PROBE_TIMEOUT_MS,
        'listPrompts'
      )) as { prompts: ProbeSnapshot['prompts'] };
    } catch {
      promptsRes = { prompts: [] };
    }

    // Call agent_manifest if present, sanitize, never log raw payload.
    const manifestToolName = findManifestTool(toolsRes.tools);
    if (manifestToolName) {
      try {
        const callRes = (await withTimeout(
          client.callTool({ name: manifestToolName, arguments: {} }),
          PROBE_TIMEOUT_MS,
          `call ${manifestToolName}`
        )) as {
          content?: Array<{ type: string; text?: string }>;
          structuredContent?: unknown;
        };
        // Prefer MCP 2025-06+ structuredContent (object-shaped) over text content,
        // because many servers default to markdown text rendering — JSON.parse on
        // markdown throws and we'd incorrectly flag the manifest as malformed.
        if (callRes.structuredContent && typeof callRes.structuredContent === 'object') {
          agentManifest = sanitizeManifestResponse(callRes.structuredContent);
        } else {
          // Fall back to text content (most likely JSON-encoded for older servers).
          const text = callRes.content?.find((c) => c.type === 'text')?.text;
          if (text) {
            try {
              agentManifest = sanitizeManifestResponse(JSON.parse(text));
            } catch {
              // not JSON — record an unusable shape so the check can mention it
              agentManifest = {
                has_recommended_first_calls: false,
                recommended_first_calls_count: 0,
                has_standard_tools: false,
                standard_tools_count: 0,
                raw_keys: []
              };
            }
          }
        }
      } catch {
        // call failed — leave agentManifest undefined; agent_manifest check
        // will treat that as missing.
      }
    }
  } finally {
    try {
      await transport.close();
    } catch {
      // already closed
    }
  }

  return {
    serverInfo,
    tools: toolsRes.tools ?? [],
    resources: resourcesRes.resources ?? [],
    prompts: promptsRes.prompts ?? [],
    agentManifest
  };
}
