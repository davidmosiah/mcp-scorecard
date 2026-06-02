/**
 * MCP server mode — exposes mcp-scorecard itself as an MCP server so an agent
 * can call the `audit` tool mid-task (e.g. to vet a server before installing it).
 * An MCP that scores MCPs. Run with: `mcp-scorecard serve`.
 *
 * Uses the low-level Server + setRequestHandler API with a plain JSON-Schema
 * tool definition (no zod shape) to stay decoupled from the SDK's zod version.
 */
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SERVER_VERSION } from './constants.js';
import type { AuditReport } from './types.js';
import { runAudit } from './audit/runner.js';
import { runWebAudit } from './audit/web/web-runner.js';
import { resolveGithubRepo } from './resolvers/github-resolver.js';
import { resolveLocal } from './resolvers/local-resolver.js';
import { resolveNpmPackage } from './resolvers/npm-resolver.js';

/**
 * JSON Schema for the audit tool's structured output (mirrors AuditReport).
 * Declared as a plain object to stay decoupled from the SDK's zod version.
 * Lets agents grade-gate reliably (e.g. only install if grade <= "B").
 */
const AUDIT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    target: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        version: { type: 'string' },
        serverName: { type: 'string' },
        serverVersion: { type: 'string' }
      },
      required: ['displayName']
    },
    totalScore: { type: 'number', description: '0–100 agent-readiness + security score' },
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    mode: { type: 'string', enum: ['stdio', 'web'] },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          score: { type: 'number' },
          status: { type: 'string', enum: ['pass', 'warn', 'fail'] },
          summary: { type: 'string' },
          details: { type: 'array', items: { type: 'string' } },
          fixes: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'label', 'score', 'status']
      }
    },
    generatedAt: { type: 'string' },
    scorecardVersion: { type: 'string' }
  },
  required: ['target', 'totalScore', 'grade', 'mode', 'checks', 'generatedAt', 'scorecardVersion']
};

async function auditTarget(target: string): Promise<AuditReport> {
  if (/^https?:\/\//.test(target) && !/github\.com/.test(target)) {
    return runWebAudit(target);
  }
  let resolved;
  if (/^https?:\/\/github\.com\//.test(target) || target.startsWith('github:')) {
    resolved = await resolveGithubRepo(target);
  } else if (isAbsolute(target) && existsSync(target)) {
    resolved = await resolveLocal(target);
  } else {
    resolved = await resolveNpmPackage(target);
  }
  return runAudit(resolved);
}

export async function serve(): Promise<void> {
  const server = new Server(
    { name: 'mcp-scorecard', version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'audit',
        description:
          "Grade an MCP server's agent-readiness and security. Accepts an npm package name, a GitHub repo URL, a local dist path (→ stdio protocol-quality checks), or a hosted https:// URL (→ web security + agent-readiness checks). Returns a 0–100 score, an A–F grade, itemized checks, and actionable fixes.",
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'npm package, GitHub URL, local dist path, or https:// hosted MCP server'
            }
          },
          required: ['target']
        },
        annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
        outputSchema: AUDIT_OUTPUT_SCHEMA
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name !== 'audit') {
      return { content: [{ type: 'text', text: `unknown tool: ${req.params.name}` }], isError: true };
    }
    const target = String((req.params.arguments as Record<string, unknown> | undefined)?.target ?? '').trim();
    if (!target) {
      return { content: [{ type: 'text', text: 'missing required argument: target' }], isError: true };
    }
    try {
      const report = await auditTarget(target);
      const summary = `${report.target.displayName}: ${report.totalScore}/100 (grade ${report.grade}, ${report.mode} mode)`;
      return {
        content: [{ type: 'text', text: `${summary}\n\n${JSON.stringify(report, null, 2)}` }],
        structuredContent: report as unknown as Record<string, unknown>
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `audit failed for "${target}": ${err instanceof Error ? err.message : String(err)}` }],
        isError: true
      };
    }
  });

  await server.connect(new StdioServerTransport());
  console.error(`mcp-scorecard MCP server v${SERVER_VERSION} running (stdio) — tool: audit`);
}
