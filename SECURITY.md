# Security Policy

Report security issues privately when they involve credentials, private MCP
payloads, local files, hosted endpoints or target server behavior that should not
be disclosed publicly.

Do not paste API keys, OAuth tokens, private MCP responses, customer data,
internal URLs or local secrets into public issues or pull requests.

`mcp-scorecard` is designed to probe MCP servers without forwarding your shell
secrets. If a target server needs credentials merely to list tools, it should
detect `MCP_PROBE=1` and return its manifest safely.

The stdio transport receives only `MCP_PROBE=1` from the probe, in addition to
the MCP SDK's platform-specific runtime allowlist. Arbitrary shell variables
such as API tokens, auth sockets, proxy settings and `NODE_OPTIONS` are not
forwarded. This reduces ambient authority but is not process isolation: target
code runs as the current OS user, may read files or OS credential stores, use
the network, and have side effects. Audit trusted targets or use a separate
isolated environment. `MCP_PROBE` is a cooperative hook, not a sandbox.

For private reports, contact:

```text
support@delx.ai
```
