# Ultra Craft documentation

Current as of 2026-11-05, local prototype version 0.1.0. The full product is unfinished.

## Start here

- [Requirements](prd/01-brief.md): user intent and acceptance criteria.
- [Findings and risks](prd/02-observations.md): what must be proved first.
- [Solution](prd/03-solution.md) and [design status](prd/04-design.md).
- [Architecture](prd/05-architecture.md): implemented layers and storage.
- [Delivery plan](prd/06-plan.md): completed work and remaining work.
- [Local operation](operations/local-development.md): setup, credentials, testing, recovery.

## Technical references

- [CoreBAR protocol](architecture/corebar-protocol.md): discovery, TLS, pairing, actions.
- [Profile formats](architecture/profile-formats.md): browser JSON and native SQLite.
- [Telemetry](architecture/telemetry.md): source fields, calculations, freshness.
- [Local HTTP API](architecture/http-api.md): current routes and boundaries.
- [Research index](research/ultraworkspace.md): evidence, tools, limitations.
- [Marketplace](research/marketplace.md): APP versus Plugin, pack inventory, URL capture.
- [Vendor sources](research/vendor-sources.md): usefulness and limits of supplied links.
- [Retained downloads](../vendor/sanytron/README.md): binaries, pack configs, checksums.

Requirements belong in the brief; milestone status belongs in the plan; recovered contracts belong in their technical references. Historical notes retain the investigation sequence but do not override these pages. Source code owns exact request validation and runtime behavior.

No secrets, device serial numbers, or native project exports belong in tracked documentation. The private files under `artifacts/` are deliberately excluded.
