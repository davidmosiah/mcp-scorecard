#!/usr/bin/env node
/**
 * Synthetic "good" MCP server — designed to score near 100/100.
 *
 *   - 6 tools, single `good_` prefix, snake_case
 *   - all tools have inputSchema (object)
 *   - good_set_thing is gated (description mentions "Gated by ALLOW_MUTATIONS")
 *   - good_agent_manifest returns recommended_first_calls + standard_tools
 *   - 4 resources advertised
 *   - read tools carry annotations.readOnlyHint
 *   - tool descriptions all > 60 chars
 *
 * Used by tests/synthetic-mcp-runner.mjs — never published.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'good-fixture', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

const tools = [
  {
    name: 'good_agent_manifest',
    description: 'Returns the agent onboarding manifest including recommended first calls and the standard tool list every agent should be aware of for this server.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'good_capabilities',
    description: 'Lists what this server can do, including supported modes, rate limits, and which tools accept which privacy_mode values.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'good_data_inventory',
    description: 'Inventory of cached data this server holds locally, organized by date and category, so an agent can decide if it needs to refresh.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'good_connection_status',
    description: 'Reports whether this server can reach its upstream API and whether OAuth credentials are present and valid.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'good_daily_summary',
    description: 'Returns a one-day summary across all data types this server tracks. Supports privacy_mode=summary|structured|raw.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        privacy_mode: { type: 'string', enum: ['summary', 'structured', 'raw'] }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'good_set_thing',
    description: 'Sets the value of a configuration thing. Gated by ALLOW_MUTATIONS=1 — refuses to write otherwise. Requires explicit user intent.',
    inputSchema: {
      type: 'object',
      properties: { value: { type: 'string' } },
      required: ['value'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: false }
  }
];

const resources = [
  { uri: 'good://agent-manifest', name: 'Agent manifest', mimeType: 'application/json' },
  { uri: 'good://capabilities', name: 'Capabilities', mimeType: 'application/json' },
  { uri: 'good://inventory', name: 'Inventory', mimeType: 'application/json' },
  { uri: 'good://summary/daily', name: 'Daily summary', mimeType: 'application/json' }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'good_agent_manifest') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            recommended_first_calls: ['good_capabilities', 'good_connection_status'],
            standard_tools: ['good_daily_summary', 'good_data_inventory']
          })
        }
      ]
    };
  }
  return { content: [{ type: 'text', text: '{}' }] };
});

await server.connect(new StdioServerTransport());
