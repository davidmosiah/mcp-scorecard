# dense_series_caps check

Dense/stream/series tools must:

1. **Hard cap (schema required):** `max_points` or `maxPoints` in `inputSchema.properties`. Description-only text does **not** count, and `agent-safe-series` is never treated as a hard cap.
2. **Series contract marker (separate, required):** `contract_version` as a **schema property** on `outputSchema` (preferred — the envelope) or `inputSchema`. Description-only `agent-safe-series/v1` does **not** count.

See agent-safe-series/v1 on delx-wellness hub.
