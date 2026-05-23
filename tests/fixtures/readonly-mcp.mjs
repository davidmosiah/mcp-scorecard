#!/usr/bin/env node
/**
 * Synthetic "read-only" MCP server — has zero mutation tools. Used to
 * verify checkMutationGating returns 10 (vacuously gated) and that
 * checkAnnotations correctly counts annotated read tools.
 *
 *   - 5 tools, all `ro_` prefix
 *   - no mutations
 *   - 3 resources
 *   - all read tools annotated readOnlyHint
 *   - agent_manifest returns valid shape
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
  { name: 'readonly-fixture', version: '0.3.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

const tools = [
  {
    name: 'ro_agent_manifest',
    description: 'Returns agent onboarding manifest including recommended_first_calls and standard_tools so agents know where to start.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'ro_capabilities',
    description: 'Returns capability descriptors, supported modes, and rate limits so agents know what they can ask for.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'ro_get_summary',
    description: 'Returns the summary in summary, structured, or raw mode controlled by the privacy_mode parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        privacy_mode: { type: 'string', enum: ['summary', 'structured', 'raw'] }
      },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'ro_list_items',
    description: 'Lists items with pagination. Supports privacy_mode for response shaping by the caller side.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer' } },
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  },
  {
    name: 'ro_get_item',
    description: 'Returns one item by id. Read-only. Supports privacy_mode for shaping the response payload.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' }, privacy_mode: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true }
  }
];

const resources = [
  { uri: 'ro://agent-manifest', name: 'Agent manifest', mimeType: 'application/json' },
  { uri: 'ro://capabilities', name: 'Capabilities', mimeType: 'application/json' },
  { uri: 'ro://summary', name: 'Summary', mimeType: 'application/json' }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === 'ro_agent_manifest') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            recommended_first_calls: ['ro_capabilities'],
            standard_tools: ['ro_get_summary', 'ro_list_items']
          })
        }
      ]
    };
  }
  return { content: [{ type: 'text', text: '{}' }] };
});

await server.connect(new StdioServerTransport());
