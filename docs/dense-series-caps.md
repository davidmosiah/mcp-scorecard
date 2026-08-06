# dense_series_caps check

Dense/stream/series tools must:

1. **Hard cap (schema required):** `max_points` or `maxPoints` in `inputSchema.properties`. Description-only text does **not** count, and `agent-safe-series` is never treated as a hard cap.
2. **Series contract marker (separate):** `contract_version` in schema and/or `agent-safe-series` / `agent-safe-series/vN` in description or schema.

See agent-safe-series/v1 on delx-wellness hub.
