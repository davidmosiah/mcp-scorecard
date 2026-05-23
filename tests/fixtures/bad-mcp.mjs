#!/usr/bin/env node
/**
 * Synthetic "bad" MCP server — designed to score < 30/100.
 *
 *   - 3 tools, no common prefix, mixed case + hyphen
 *   - one tool has NO inputSchema at all
 *   - mutation tool present, NOT gated
 *   - no agent_manifest, no capabilities, no discovery tools
 *   - 0 resources
 *   - all descriptions < 20 chars
 *   - no annotations anywhere
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
  { name: 'bad-fixture', version: '0.0.1' },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

const tools = [
  {
    name: 'doThing',
    description: 'does a thing',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    name: 'send-mail',
    description: 'sends mail',
    // Bad: protocol-level valid (type:object) but a property uses an
    // invalid type that ajv refuses to compile in strict mode.
    inputSchema: {
      type: 'object',
      properties: { to: { type: 'banana' } }
    }
  },
  {
    name: 'create_widget',
    description: 'makes widget',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));
server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: 'text', text: '{}' }] }));

await server.connect(new StdioServerTransport());
