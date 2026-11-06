# Local HTTP API

Implemented in `src/server/index.mjs`. All endpoints are local to the bridge. The server rejects non-loopback Host values and cross-site Fetch Metadata. Connection/native mutation routes and pairing/discovery check a supplied Origin against the local host. No general remote authentication or CORS access is implemented.

| Method | Path | Purpose / input |
| --- | --- | --- |
| GET | /api/metrics | Normalized `{sources}`; may trigger Beszel poll |
| GET | /api/connections | Public settings and hasCredential flags |
| POST | /api/connections/truenas | url/name/sensor/key update |
| POST | /api/connections/beszel | url/name/sensor/systemId/token update |
| POST | /api/connections/beszel/login | url/name/identity/password; saves returned token |
| GET | /api/connections/beszel/systems | Accessible `{systems: [{id,name}]}` |
| GET | /api/device/status | Public saved-pairing state |
| POST | /api/device/discover | Directed request to server-configured COREBAR_HOST |
| POST | /api/device/pair | Physical-confirmation flow; public result only |
| GET | /api/device/catalog?parent=... | Authenticated sanitized `{items}`; omit parent for root |
| GET | /api/native-project | Native working-copy summary or configured:false |
| POST | /api/native-project/create | `{name}` |
| POST | /api/native-project/default | `{id}` |
| POST | /api/native-project/rename | `{id,name}` |
| POST | /api/native-project/widget-name | `{id,name}` |
| POST | /api/native-project/reorder | `{profileId,ids}` |
| GET | /api/native-project/export | Download cleaned Ultra-Craft.umpf |

Connection request bodies are capped at 32,000 bytes; native edit bodies at 10,000. Errors return sanitized JSON. Exact validation and response shape remain in the owning modules and their tests. Do not place secrets in URL query strings.

`/` serves the editor; `/widget?source=truenas` and `/widget?source=beszel&sensor=<key>` serve browser development views. These are not device install endpoints. Static files are explicitly allowlisted; artifacts, environment files, source, and vendor binaries are not served.

There is no device deployment, firmware update, app-install, or LAN hosting route.
