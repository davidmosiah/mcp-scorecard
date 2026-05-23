# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-23

### Added

- Initial release.
- CLI `mcp-scorecard <subject> [--json] [--min-score N]`.
- Three resolvers: npm package (via `npm pack`), absolute local path, and GitHub URL.
- Probe over `StdioClientTransport` with `MCP_PROBE=1` env flag set on the target.
- Ten quality checks, each scored 0-10:
  1. Schema validity (ajv-compiled inputSchema per tool)
  2. Tool naming convention (shared prefix + snake_case)
  3. Privacy modes documented (`privacy_mode` param or summary/structured/raw in descriptions)
  4. Mutation gating (write tools must document a gate)
  5. Agent manifest (`*_agent_manifest` returning `recommended_first_calls` + `standard_tools`)
  6. Smoke test (presence of `scripts/smoke*.{mjs,js,ts}` or a real `test` script)
  7. Resources advertised (count via `listResources`)
  8. Tool descriptions (average length across tools)
  9. Annotations (`annotations.readOnlyHint` on read tools)
  10. Manifest discoverability (any of `*_agent_manifest`, `*_data_inventory`, `*_capabilities`, `*_connection_status`)
- Markdown and JSON output formats.
- Redaction pass on probe-derived strings: `customer_id`, `email`, `phone`,
  `access_token`, `refresh_token`, `client_secret`, `developer_token`, `api_key`.
- Four synthetic fixtures (`good`, `medium`, `bad`, `readonly`) under
  `tests/fixtures/`. Test runner asserts each lands in its expected band.
- Self-test (`scripts/smoke-self.mjs`) that audits the good fixture
  end-to-end and asserts score >= 80 before publish.
