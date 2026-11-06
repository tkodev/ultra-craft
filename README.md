# Ultra Craft

An independent web workspace and homelab widgets for UltraBARX. The target is two always-visible telemetry cards in the existing LineOS home. Native card integration remains unfinished.

Implemented: browser profile editing and TrueNAS/Beszel telemetry views. Device discovery and a pairing flow are implemented; pairing has been verified on the live CoreBAR; native widget packaging and deployment are still unfinished. This is not yet a replacement for the full UltraWorkspace application.

## Run locally

Requires Node.js 24 or later.

```sh
npm install
cp .env.example .env
npm start
```

Open `http://127.0.0.1:3140`. Without credentials, the workspace works and widgets show **Not configured**. Use **Manage connections** in the app to configure TrueNAS or sign in to Beszel and choose a system. Changes take effect without restarting. `.env` remains available for initial configuration. Saved settings in the private `artifacts/connections.json` file override `.env` after restart.

Set `COREBAR_HOST` to the device’s IPv4 address, then click **Find CoreBAR** in the editor. Directed discovery has been verified on a live LineOS `1.0.9(9)` device. Discovery does not pair or modify profiles. **Pair CoreBAR** starts a ten-second device confirmation prompt. The issued token is stored locally with owner-only permissions, outside Git and the browser. Live pairing, saved-token authentication, and heartbeat acknowledgement have been verified. **Read native library** browses the paired device’s app and IoT widget categories without deploying anything.

- **TrueNAS SCALE 25.10:** set `TRUENAS_URL` to its secure JSON-RPC endpoint, normally `wss://your-nas/api/current`, and set `TRUENAS_API_KEY`. The connector uses `auth.login_with_api_key` and subscribes to `reporting.realtime`. Older legacy WebSocket APIs and TrueNAS 26 SCRAM authentication are not implemented. Use a service account with the required reporting access.
- **Beszel:** set `BESZEL_URL`, `BESZEL_TOKEN`, and `BESZEL_SYSTEM_ID`. Use an existing PocketBase user token with read access to that system. The app also supports email/password sign-in. Expired tokens require signing in again; automatic token refresh is not implemented. Prefer HTTPS when sending credentials.
- **Temperature:** TrueNAS defaults to its hottest available CPU core. Beszel requires an exact sensor key, set through `BESZEL_SENSOR` or the widget settings after telemetry arrives. No sensor produces **Unavailable**, not zero.
- **TLS:** for a private CA, set `NODE_EXTRA_CA_CERTS` to the exported CA certificate path before starting Node. Certificate verification stays enabled.

Credentials remain in the local bridge and its owner-only local settings file. Beszel passwords are used once for sign-in; only the returned session token is saved. Profiles in browser storage and exported `.ultracraft.json` files contain only widget settings. The browser profile export uses our own format, separate from the native project editor described below.

## Workspace

Create, rename, duplicate, delete, import, and export profiles. Add up to eight widgets per profile. Select a widget to change its name, telemetry source, and temperature sensor, or move it left/right. Profiles save to this browser.

Standalone views:

- `http://127.0.0.1:3140/widget?source=truenas`
- `http://127.0.0.1:3140/widget?source=beszel&sensor=your-sensor-key`

These are browser views for development. The server binds to loopback and rejects remote hosts. They cannot yet be loaded from a physical CoreBAR. LAN serving/authentication and native integration must be completed before device use.

CPU and RAM show percentages. TrueNAS RAM is `(physical total - physical available) / physical total`, so it follows availability rather than subtracting ARC twice. Temperature is Celsius. Widgets retain the last reading on errors and label connection state and observation age. TrueNAS readings become stale after 15 seconds; Beszel records after 3 minutes. Beszel polling never replaces record time with fetch time.

## Native .umpf projects

Set `NATIVE_PROJECT_FILE` to an existing UltraWorkspace export. The app opens a private working copy, lists native profiles and widgets, and supports new native profiles, default-profile selection, profile and widget renaming, and widget reordering. **Export .umpf** preserves unknown records, widget settings, module bindings, and timestamp triggers. Known host authorization tokens are cleared from the downloadable copy and the database is compacted to remove their old bytes.

This path was verified against an actual export containing one profile, three widgets, and two modules. Web edits left the original file unchanged during verification. Later authorized desktop pack downloads modified the open native project through the official app. Reopening the result in the official desktop app and deploying it to CoreBAR are not yet verified. Native widget parameter editing, adding/removing native widgets, and direct deployment are still pending.

## Validate

```sh
npm run check
npm test
```

Tests cover protocol messages with a fake WebSocket, Beszel requests against a local HTTP fixture, freshness and missing readings, profile validation, local server boundaries, and DOM editor interactions. They do not verify physical hardware, real service credentials, browser layout, or native file compatibility.

- [Documentation index](docs/README.md)
- [Requirements and acceptance criteria](docs/prd/01-brief.md)
- [Research and REA evidence](docs/research/ultraworkspace.md)
- [Delivery plan and remaining work](docs/prd/06-plan.md)
- [Retained vendor downloads and checksums](vendor/sanytron/README.md)

Development branch: `feat/workspace-widgets`.
