# Telemetry contract

The bridge maintains separate TrueNAS and Beszel source state. Snapshots contain id/name/kind, status/error, observedAt/staleAfterMs, cpu/ram/temperature, and a map of available sensor keys. Invalid or missing readings are null, never coerced to zero.

## TrueNAS

Implemented for SCALE 25.10 JSON-RPC over WSS, normally `/api/current`. Authenticate with `auth.login_with_api_key`, then `core.subscribe` to `reporting.realtime:{"interval":2}`. Accept `collection_update` notifications for that collection or reporting.realtime. Legacy `/websocket` and TrueNAS 26 SCRAM are unimplemented. The user's installed version and authenticated telemetry have not been verified.

- CPU: `fields.cpu.cpu.usage`, validated in 0–100.
- RAM: `100 * (1 - physical_memory_available / physical_memory_total)` using fields.memory. Do not subtract ARC separately.
- Temperature: finite `fields.cpu.<core>.temp` values; configured exact core or hottest available value.
- Observation time: receipt of the realtime event; no upstream event timestamp is currently extracted.
- Reconnect delay: five seconds; initial connection/first-reading timeout: twelve seconds.

References: [25.10 realtime schema](https://api.truenas.com/v25.10/api_events_reporting.realtime.html), [JSON-RPC](https://api.truenas.com/v25.10/jsonrpc.html), [subscribe](https://api.truenas.com/v25.10/api_methods_core.subscribe.html), [official client](https://github.com/truenas/api_client).

## Beszel

Uses PocketBase user authentication. The local connection form posts identity/password to `/api/collections/users/auth-with-password`; only the resulting token is saved. System selection lists accessible `/api/collections/systems/records` entries. No token refresh is implemented; sign in again on expiry.

Request `/api/collections/system_stats/records` with filter `system="<id>" && type="1m"`, sort `-created`, perPage 1, fields created/stats. Authorization carries the user's token. Concurrent requests share a pending poll; attempts are at least five seconds apart, triggered by metrics reads, with a ten-second timeout.

- CPU: stats.cpu; RAM: stats.mp, each validated in 0–100.
- Temperatures: finite values in stats.t. An exact sensor is required. Do not assume a disk sensor is CPU temperature.
- Observation time: record created, requiring UTC or an explicit offset. Successful refetch of an old record does not refresh it.

References pinned to source revision 826b52b655f4c7651f97d01b778f656dd7c1503a: [system schema](https://github.com/henrygd/beszel/blob/826b52b655f4c7651f97d01b778f656dd7c1503a/internal/entities/system/system.go), [record writer](https://github.com/henrygd/beszel/blob/826b52b655f4c7651f97d01b778f656dd7c1503a/internal/hub/systems/system.go).

## Freshness and errors

Status precedence is unconfigured, error, waiting, stale, live. A sample is stale when older than 15 seconds for TrueNAS or three minutes for Beszel, or more than five seconds in the future. A source error retains previous readings and observation time. Browser cards display state and age so retained data is not presented as current.

Upstream error bodies, authentication material, and request URLs are not forwarded to the browser. HTTPS is preferred for Beszel; configuration currently permits HTTP. TrueNAS requires WSS. Private CA trust uses NODE_EXTRA_CA_CERTS; certificate verification remains enabled.
