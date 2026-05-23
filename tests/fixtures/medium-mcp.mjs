#!/usr/bin/env node
/**
 * Synthetic "medium" MCP server — designed to score 50-70/100.
 *
 *   - 4 tools, single `med_` prefix, snake_case
 *   - all schemas valid
 *   - one mutation tool, NOT gated
 *   - no agent_manifest tool
 *   - 1 resource (partial credit)
 *   - descriptions 30-60 chars (warn band)
 *   - read tools missing annotations
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
  { name: 'medium-fixture', version: '0.2.0' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

const tools = [
  {
    name: 'med_capabilities',
    description: 'Lists supported things for this server.', // ~42 chars
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'med_get_thing',
    description: 'Returns the current thing value.', // ~33 chars
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'med_list_things',
    description: 'Lists all things stored locally.', // ~33 chars
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'med_delete_thing',
    description: 'Deletes the thing with the given id.', // ungated mutation
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false
    }
  }
];

const resources = [{ uri: 'med://summary', name: 'Summary', mimeType: 'application/json' }];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }));
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: 'text', text: '{}' }] }));

await server.connect(new StdioServerTransport());
