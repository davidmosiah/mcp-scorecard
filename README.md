<h1 align="center">mcp-scorecard</h1>

<p align="center">
  <a href="https://github.com/davidmosiah/mcp-scorecard/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/davidmosiah/mcp-scorecard/ci.yml?style=for-the-badge&labelColor=0F172A&color=10B981&logo=github" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/mcp-scorecard"><img src="https://img.shields.io/npm/v/mcp-scorecard?style=for-the-badge&labelColor=0F172A&color=10B981&logo=npm&logoColor=white" alt="npm version" /></a>
  <a href="https://github.com/davidmosiah/mcp-scorecard/releases/latest"><img src="https://img.shields.io/github/v/release/davidmosiah/mcp-scorecard?style=for-the-badge&labelColor=0F172A&color=2563EB&logo=github" alt="GitHub release" /></a>
  <a href="https://www.npmjs.com/package/mcp-scorecard"><img src="https://img.shields.io/npm/dm/mcp-scorecard?style=for-the-badge&labelColor=0F172A&color=0EA5A3&logo=npm&logoColor=white" alt="npm downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-22C55E?style=for-the-badge&labelColor=0F172A" alt="License MIT" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/BUILT_FOR-MCP-7C3AED?style=for-the-badge&labelColor=0F172A" alt="Built for MCP" /></a>
  <a href="https://github.com/davidmosiah/delx-wellness/blob/main/docs/release-index.md"><img src="https://img.shields.io/badge/VERIFIED-release_index-0EA5A3?style=for-the-badge&labelColor=0F172A" alt="Verified release index" /></a>
</p>

<h3 align="center">
  Agent-readiness scorecard for any MCP server.<br>
  Probes a target over stdio, runs 10 checks, outputs a 0-100 score with itemized findings.
</h3>

---

## Quick start

```bash
# Audit a published npm package
npx -y mcp-scorecard whoop-mcp-unofficial

# Audit a GitHub repo (auto-resolves to the published npm package, or local dist)
npx -y mcp-scorecard https://github.com/davidmosiah/whoop-mcp

# Audit a local build
npx -y mcp-scorecard /Users/you/Desktop/my-mcp/dist/index.js

# CI gate: fail the build if the score drops
npx -y mcp-scorecard my-mcp --min-score 80

# Structured JSON for piping into your own tooling
npx -y mcp-scorecard my-mcp --json
```

## Demo

Real captured run auditing the official MCP reference server
[`@modelcontextprotocol/server-everything`](https://www.npmjs.com/package/@modelcontextprotocol/server-everything)
— nothing here is hand-edited, this is exactly what the CLI printed:

```console
$ npx -y mcp-scorecard @modelcontextprotocol/server-everything

# mcp-scorecard - @modelcontextprotocol/server-everything @2026.1.26

**Agent-readiness score:** 44/100

- [PASS] Schema validity              (13/13 tools have valid input schema)
- [FAIL] Tool naming convention       (12/13 tools violate snake_case)
- [FAIL] Privacy modes documented     (only 1 tool(s) mention privacy modes)
- [PASS] Mutation gating              (no write tools — n/a)
- [FAIL] Agent manifest               (no agent_manifest tool)
- [FAIL] Smoke test                   (no smoke script and no test script)
- [PASS] Resources advertised         (7 resources registered)
- [PASS] Tool descriptions            (avg 88 chars across 13 tools)
- [FAIL] Annotations                  (0/13 read tools annotated)
- [FAIL] Manifest discoverability     (no discovery tools)

## Details
### Tool naming convention
- Non-snake_case names: get-annotated-message, get-env, get-resource-links, get-resource-reference, get-structured-content, get-sum, get-tiny-image, gzip-file-as-resource, toggle-simulated-logging, toggle-subscriber-updates
### Annotations
- Missing readOnlyHint: echo, get-annotated-message, get-env, get-resource-links, get-resource-reference, get-structured-content, get-sum, get-tiny-image, gzip-file-as-resource, toggle-simulated-logging

## Suggested fixes
- Rename tools to lowercase snake_case (a-z, 0-9, _).
- Add a `privacy_mode` parameter (summary | structured | raw) on read tools so agents can request only what they need.
- Expose a `<prefix>_agent_manifest` tool that returns { recommended_first_calls, standard_tools, ... } so agents can self-onboard.
- Add `scripts/smoke-tools.mjs` that boots the server via StdioClientTransport and asserts the tool list.
- Add `annotations: { readOnlyHint: true, openWorldHint: false }` to every read tool definition.
- Expose discovery tools so agents can self-onboard: `*_agent_manifest`, `*_data_inventory`, `*_capabilities`, `*_connection_status`.
```

The reference server is a feature showcase, not a production integration — a 44 is
expected and is exactly why the conventions checks exist. Agent-oriented servers
that adopt snake_case naming, a manifest tool, and read-only annotations land in
the 80s and 90s.

## What it checks

Ten quality dimensions, each scored 0-10. Final score is the sum, capped at 100.

1. **Schema validity** - boots the server, lists tools, and validates each
   tool's `inputSchema` with ajv. Missing or non-object schemas score zero
   per tool.
2. **Tool naming convention** - rewards a shared prefix and snake_case
   (e.g. `whoop_get_sleep`). Mixed case, hyphens, and missing prefixes lose
   points.
3. **Privacy modes documented** - looks for a `privacy_mode` parameter on
   any tool, or descriptions that mention `summary | structured | raw`.
4. **Mutation gating** - any tool name matching `(set|update|delete|create|
   pause|resume|enable|disable|cancel|publish|send)` must document a gate
   in its description (`Gated by ALLOW_MUTATIONS`, `requires explicit user
   intent`, `dry-run`, `confirm`).
5. **Agent manifest** - calls `<prefix>_agent_manifest` and checks the
   response object has `recommended_first_calls` (non-empty array) AND
   `standard_tools` (non-empty array). The probe NEVER persists the payload
   - only field names and lengths are recorded.
6. **Smoke test present** - looks for `scripts/smoke*.{mjs,js,ts}` in the
   package, or a real `test` script in `package.json` (not the npm default
   echo-and-fail).
7. **Resources advertised** - counts what `listResources()` returns. Zero
   scores zero; one or two scores 5; three or more scores 10.
8. **Tool descriptions** - average description length across all tools.
   Below 30 chars scores 0; 30-60 scores 5; 60+ scores 10.
9. **Annotations** - counts what fraction of read tools (any non-mutation
   tool) carry `annotations.readOnlyHint = true`. Score scales linearly.
10. **Manifest discoverability** - has any of `*_agent_manifest`,
    `*_data_inventory`, `*_capabilities`, `*_connection_status`. Two or
    more scores 10; exactly one scores 7; none scores 0.

## Output format

### Markdown (default)

```
# mcp-scorecard - whoop-mcp-unofficial @0.4.3

**Agent-readiness score:** 88/100

- [PASS] Schema validity              (28/28 tools have valid input schema)
- [PASS] Tool naming convention       (consistent `whoop_` prefix, snake_case)
- [PASS] Privacy modes documented     (privacy_mode parameter on 6 tool(s))
- [PASS] Mutation gating              (no write tools - n/a)
- [PASS] Agent manifest               (recommended_first_calls present, 5 entries)
- [PASS] Smoke test                   (scripts/smoke-tools.mjs found)
- [PASS] Resources advertised         (8 resources registered)
- [PASS] Tool descriptions            (avg 142 chars across 28 tools)
- [WARN] Annotations                  (20/28 read tools annotated)
- [PASS] Manifest discoverability     (4/4 discovery tools present (agent_manifest, data_inventory, capabilities, connection_status))

## Suggested fixes
- Add `annotations: { readOnlyHint: true, openWorldHint: false }` to every read tool definition.

_Generated by mcp-scorecard v0.1.0 at 2026-05-23T15:42:11.000Z_
```

### JSON (`--json`)

```json
{
  "target": {
    "displayName": "whoop-mcp-unofficial",
    "version": "0.4.3",
    "serverName": "whoop-mcp",
    "serverVersion": "0.4.3"
  },
  "totalScore": 88,
  "checks": [
    {
      "id": "schema_validity",
      "label": "Schema validity",
      "score": 10,
      "status": "pass",
      "summary": "28/28 tools have valid input schema",
      "details": [],
      "fixes": []
    }
  ],
  "generatedAt": "2026-05-23T15:42:11.000Z",
  "scorecardVersion": "0.1.0"
}
```

## How it probes

The scorecard launches the target MCP server over stdio with
`MCP_PROBE=1` set on the child's env. **Author hook:** if your MCP needs
OAuth or other credentials to even list tools, detect this env var and
return your tool/resource/prompt manifests anyway. The scorecard expects
to be able to read your contract without making any auth-requiring API
calls.

### Privacy model

- The probe response is **never persisted**. Only counts and field names
  are recorded into the in-memory snapshot used by checks.
- Any string going into the report is run through a redaction pass that
  replaces values for `customer_id`, `email`, `phone`, `access_token`,
  `refresh_token`, `client_secret`, `developer_token`, and `api_key` with
  `[REDACTED]`.
- No telemetry. No network calls beyond `npm pack` (when auditing a
  package by name) and `gh repo clone` (when auditing a GitHub URL).

## Use cases

- **CI gate** - block a PR if the score drops below a threshold:
  `npx -y mcp-scorecard my-mcp --min-score 85`.
- **Registry curation** - run the audit across a list of MCPs to pick
  the best-documented and most agent-friendly options for a directory or
  catalog.
- **Pre-publish self-check** - add it to `prepublishOnly` so you never
  ship a regressed contract by accident.
- **Comparative review** - score two MCPs that ostensibly cover the same
  API and see which is friendlier to agents.

## Limitations

- Cannot probe MCPs that REQUIRE auth before `listTools()` returns. If
  your server is one of these, support the `MCP_PROBE` env hook so the
  scorecard can still read your contract.
- Cannot grade logic correctness - the scorecard only inspects shape,
  metadata, and discoverability. A server can score 100/100 and still
  return wrong data.
- Mutation detection is name-based - if you call a write tool
  `prepare_thing` instead of `set_thing`, the check will miss it. This
  is intentional: we reward clear naming.

## Roadmap

- **v0.2** - rule pack for agent-rules-of-thumb (output shape stability,
  pagination patterns, error envelope consistency), a perf benchmark
  (median `listTools()` latency), and an OAuth probe with a mock token.

## Support

- Issues: <https://github.com/davidmosiah/mcp-scorecard/issues>
- Email: support@delx.ai

## Disclaimer

This is a quality audit tool. It does not certify security, privacy,
or correctness; it only measures whether a server follows agent-friendly
conventions. Always do your own review before plugging an MCP into a
production agent.

## License

MIT - see [LICENSE](LICENSE).

---

## New in v0.3.0 — differentiators

- **Run it AS an MCP server** so agents can call it mid-task:
  ```json
  { "mcpServers": { "mcp-scorecard": { "command": "npx", "args": ["-y", "mcp-scorecard", "serve"] } } }
  ```
  Then your agent can `audit("some-mcp-server")` before installing it. *An MCP that scores MCPs.*
- **Audit hosted/remote servers** by URL (12 security + agent-readiness checks): `npx -y mcp-scorecard https://your-server`
- **Badge for your README:** `npx -y mcp-scorecard my-mcp --badge` → a shields.io markdown badge.
- **GitHub Action:**
  ```yaml
  - uses: davidmosiah/mcp-scorecard@v0.3.0
    with:
      target: dist/index.js
      min-score: 80
  ```

### v0.4.0
- `mcp-scorecard compare a b c` — side-by-side ranking.
- `--profile security|quality|agent-ready` — score one category. `--baseline old.json` — regression diff. `--html` — shareable scorecard.
- Checks explainer: https://mcp-scorecard.vercel.app/checks.html
