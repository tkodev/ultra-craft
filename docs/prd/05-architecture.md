# Architecture

Version 0.1.0 uses Node.js 24 ESM, native HTTP/TLS/UDP/WebSocket/SQLite APIs, and buildless browser JavaScript/CSS. `happy-dom` 21.0.4 is the test-only dependency. There is no frontend build step.

## Code map

| Path | Responsibility |
| --- | --- |
| public/app.mjs | Workspace UI, device/native editor interactions |
| public/profiles.mjs | Internal profile validation, storage, import/export |
| public/widgets.mjs | Card rendering |
| public/connections.mjs | Connection forms |
| public/constants/copy.mjs | UI text |
| src/server/index.mjs | Local HTTP routes, static allowlist, request boundaries |
| src/server/config.mjs | Environment validation |
| src/server/connections.mjs | Private connection persistence and connector lifecycle |
| src/server/connectors.mjs | TrueNAS stream and Beszel polling |
| src/shared/metrics.mjs | Normalization, temperature selection, freshness |
| src/server/corebar.mjs | Directed UDP discovery |
| src/server/corebar-session.mjs | Pinned TLS transport, frames, pairing/authentication |
| src/server/corebar-manager.mjs | Private paired state and sanitized catalog reads |
| src/server/native-project.mjs | Native SQLite working copy and cleaned export |

## State and boundaries

Browser localStorage stores only internal profiles. The bridge keeps `.env`, saved connection settings, pairing credentials, and native working copies private. See [profile formats](../architecture/profile-formats.md) and [local operation](../operations/local-development.md).

TrueNAS streams into in-memory source state. Beszel is polled on metrics requests, with deduplication and a five-second minimum attempt interval. The HTTP API exposes normalized readings and public configuration only. All deployed browser assets are explicitly allowlisted.

The local server binds to 127.0.0.1, restricts Host/Origin and cross-site requests, disables caching, and sets a same-origin CSP. This is a local bridge, not a LAN-authenticated hosting service. A future device-facing endpoint requires a deliberate serving/authentication design.

Native SQLite and internal browser profiles are separate editing paths. No native deploy adapter exists yet. See [HTTP API](../architecture/http-api.md), [telemetry](../architecture/telemetry.md), and [device protocol](../architecture/corebar-protocol.md).
