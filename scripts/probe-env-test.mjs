import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

// Exercise the real probe boundary with a fake SDK transport. The target is
// never spawned, and the probe sees only this synthetic parent environment.
const parentEnv = {
  PATH: '/synthetic/runtime/bin',
  HOME: '/synthetic/home',
  API_KEY: 'synthetic-api-sentinel',
  AWS_SESSION_TOKEN: 'synthetic-cloud-sentinel',
  GITHUB_TOKEN: 'synthetic-github-sentinel',
  NODE_OPTIONS: '--require=/synthetic/injection.cjs',
  NODE_PATH: '/synthetic/modules',
  PYTHONPATH: '/synthetic/python',
  BASH_ENV: '/synthetic/shell-init',
  NPM_CONFIG_USERCONFIG: '/synthetic/npmrc',
  SSH_AUTH_SOCK: '/synthetic/agent.sock',
  HTTPS_PROXY: 'http://synthetic-proxy.invalid',
  UNRECOGNIZED_SECRET: 'synthetic-unknown-sentinel',
  MCP_PROBE: '0'
};
const captured = [];
class FakeTransport {
  constructor(options) { captured.push(options); }
  async close() {}
}
class FakeClient {
  async connect() {}
  getServerVersion() { return { name: 'synthetic-target', version: '0' }; }
  async listTools() { return { tools: [] }; }
  async listResources() { return { resources: [] }; }
  async listPrompts() { return { prompts: [] }; }
}

const context = createContext({ process: { env: parentEnv }, setTimeout, clearTimeout });
const client = new SyntheticModule(['Client'], function () {
  this.setExport('Client', FakeClient);
}, { context });
const transport = new SyntheticModule(['StdioClientTransport'], function () {
  this.setExport('StdioClientTransport', FakeTransport);
}, { context });
const constants = new SourceTextModule(
  readFileSync(new URL('../dist/constants.js', import.meta.url), 'utf8'), { context }
);
const probe = new SourceTextModule(
  readFileSync(new URL('../dist/audit/probe.js', import.meta.url), 'utf8'), { context }
);
await probe.link((specifier) => {
  if (specifier === '@modelcontextprotocol/sdk/client/index.js') return client;
  if (specifier === '@modelcontextprotocol/sdk/client/stdio.js') return transport;
  if (specifier === '../constants.js') return constants;
  throw new Error(`Unexpected probe dependency: ${specifier}`);
});
await probe.evaluate();
await probe.namespace.probeTarget({
  command: 'synthetic-never-executed', args: [], packageDir: '/synthetic/target'
});

assert.equal(captured.length, 1);
// The SDK supplies its own runtime allowlist. The probe must add only its
// author hook, never override that allowlist with the caller's shell env.
assert.deepEqual(Object.fromEntries(Object.entries(captured[0].env)), { MCP_PROBE: '1' });
assert.equal(parentEnv.MCP_PROBE, '0', 'the caller environment is not mutated');
console.log('probe environment: hook preserved; shell secrets and injection settings excluded (fake transport)');
