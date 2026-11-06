# Local operation

## Start and verify

Use the implementation worktree, currently `~/repos/tkodev/ultra-craft-workspace`, branch feat/workspace-widgets. It is separate from the original project checkout.

```sh
npm install
cp .env.example .env
npm start
```

Requires Node.js 24+. Open http://127.0.0.1:3140. SQLite may emit Node's experimental warning. An old background command completion message is not proof the server is still running; check the endpoint before starting another copy. Keep the current server running while editing docs. Port conflicts usually indicate another server instance.

```sh
npm run check
npm test
git diff --check
```

On 2026-11-05, all 31 tests and the syntax check passed. Tests cover source protocols with fixtures, normalized metrics, age/missing states, DOM interactions, local HTTP boundaries, discovery, pairing/session behavior, private persistence, and native SQLite preservation. They do not prove visual layout, actual service access, official .umpf reopening, deployment, or native card rendering.

## Configure

| Variable | Meaning |
| --- | --- |
| PORT | Local HTTP port, default 3140 |
| COREBAR_HOST | Explicit IPv4 target; restart after changing |
| NATIVE_PROJECT_FILE | Existing .umpf source path; restart after changing |
| TRUENAS_URL / TRUENAS_API_KEY | WSS JSON-RPC endpoint and reporting credential |
| TRUENAS_NAME / TRUENAS_SENSOR | Display name and optional exact CPU core |
| BESZEL_URL / BESZEL_TOKEN / BESZEL_SYSTEM_ID | PocketBase base URL, user token, system |
| BESZEL_NAME / BESZEL_SENSOR | Display name and exact temperature key |
| NODE_EXTRA_CA_CERTS | Private CA PEM path, set before Node starts |

Manage connections in the app to update source settings without restart. Saved settings override environment values after restart. Beszel sign-in lists systems; select a system and an exact sensor after readings arrive. Expired Beszel tokens require another sign-in. Clearing or changing credentials should happen through the local form, not a chat message.

## Private state and recovery

| Location | Contents / handling |
| --- | --- |
| .env | Optional initial credentials/config; ignored |
| artifacts/connections.json | Saved source credentials/settings; atomic mode-0600 writes |
| artifacts/corebar-auth.json | Host/serial/client identity/token; mode 0600 |
| artifacts/native-editor-*.umpf | Editable native working copies; may contain private data |
| artifacts/native-profile.umpf | Private source export retained for investigation |
| artifacts/*catalog*.json and discovery traces | Raw device metadata; private |
| Browser localStorage | Internal profiles; browser/site-specific |

Do not delete pairing state merely to troubleshoot telemetry. Back up private files securely before any reset. To reset native web edits, stop the bridge, retain a backup of the corresponding working copy, and remove only that copy before restart; it will be recreated from NATIVE_PROJECT_FILE. Browser profile exports do not back up native files, pairing, or source credentials.

Native cleaned export removes known host tokens, but unknown app configuration can still be sensitive. Do not add complete project exports or raw session captures to Git. Release APKs and vendor pack ZIPs in vendor/ are public research inputs and contain no user project database.

## Local integration observations

The supplied CoreBAR was 192.168.1.173 and reported LineOS 1.0.9(9). Pairing and saved authentication succeeded. Recheck addresses if the LAN changes.

Authorized read-only inspection of ~/ops identified Beszel deployment image henrygd/beszel:0.21.1 at https://stats.htko.ca; health succeeded, authenticated records remain unverified. TrueNAS candidates were regulus (.122) and sirius (.123) on the same LAN; HTTP/HTTPS probes refused connections at that time. Installed TrueNAS versions remain unknown. No authenticated service readings were obtained and no source credential was saved at the last check.

The ~/ops instructions restrict SSH/docker/deployment against real machines without explicit go-ahead. Research has not required those operations. These historical connection observations are not a request to change infrastructure.
