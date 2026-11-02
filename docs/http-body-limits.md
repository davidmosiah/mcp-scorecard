# HTTP request-body limits

The optional HTTP listener now retains at most 1 MiB of incoming POST body bytes before JSON parsing. Larger bodies return 413 and the connection closes, including chunked requests; malformed JSON returns 400. Empty bodies retain the previous undefined-body behavior. Compressed Content-Encoding values are explicitly unsupported (415); send uncompressed JSON.

This deliberately restricts previously unbounded request sizes and changes malformed-body errors from 500 to 400. It does not add authentication or change the loopback default, scoring weights, target resolution, or stdio transport. A byte cap is not a global memory, concurrency, input-complexity or slow-client quota. The direct handleHttpV2Request API accepts an already-parsed body; embedding callers remain responsible for bounding their own parser.

Tests use local synthetic MCP fixtures and a loopback server, not arbitrary npm targets or third-party endpoints.
