# Security Policy

Report security issues privately when they involve credentials, private MCP
payloads, local files, hosted endpoints or target server behavior that should not
be disclosed publicly.

Do not paste API keys, OAuth tokens, private MCP responses, customer data,
internal URLs or local secrets into public issues or pull requests.

`mcp-scorecard` is designed to probe MCP servers without forwarding your shell
secrets. If a target server needs credentials merely to list tools, it should
detect `MCP_PROBE=1` and return its manifest safely.

For private reports, contact:

```text
support@delx.ai
```
