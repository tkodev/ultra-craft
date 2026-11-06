> Historical investigation log. Contains superseded conclusions and intermediate test counts. Use [the current research index](../ultraworkspace.md) for the present state. Pairing is complete and keeping LineOS home is required.

# UltraWorkspace investigation

Investigated 2026-11-05 against release `v1.0.1.0`.

## Established evidence

The [upstream tree](https://github.com/Qinkunex/UltraWorkspace/tree/main) contains README, LICENSE, and documentation, but no desktop application source. The public SDK link on the [integrations page](https://hub.sanytron.com/support/ultrabarx/integrations) points to that same repository. An actual widget SDK contract has not been located.

The [release](https://github.com/Qinkunex/UltraWorkspace/releases/tag/v1.0.1.0) includes a Windows ZIP, macOS DMG, two Android APKs, and SenseCube firmware. The actual APK filenames differ from the names in its release notes. Use the asset API, not guessed URLs.

REA 6.7.0 successfully inventoried the Windows ZIP. Full evidence is in `evidence/archive-evidence.json`. Its SHA-256 is `e2e36f727733daf3de5e93d100c440cc1e994109750fe7937d2be9fd8636bedb`. The package contains `UltraWorkSpace.exe`, Qt6Widgets, Qt6Network, Qt6SerialPort, SQLite, and libusb. There is no ASAR or JavaScript application tree to port.

The [upstream README](https://github.com/Qinkunex/UltraWorkspace/blob/main/README.md) describes profile editing, `.umpf` export, hardware input bindings, and deployment. It describes a 1424 × 280 CoreBAR screen and USB/Wi-Fi communication. These are documentation claims, not hardware validation.

Release notes mention WebUI access for installed applications. This establishes a possible route for a hosted widget; it does not prove arbitrary external pages can be embedded as native cards.

## Static leads, not protocol contracts

An ordinary `strings` scan of the EXE found these literal templates:

```text
http://%1:8080/upload?serialNo=%2
http://%1:8080/upload/zip
http://%1:%2?sessionToken=%3
.umpf
deployData
deploymentData
deployConfig
ON_PRE_DEPLOY
```

No requests were sent to these endpoints. Their methods, bodies, authentication, and authorization are unknown. A URL string alone does not prove a reachable service or safe deploy operation.

## REA limits

REA MCP tools are absent in this session. `doctor --client codex --json` reports missing Codex registration. CLI artifact analysis works without registration.

Native analysis failed because macOS denied Apple Events to Hopper. The exact result is preserved in `evidence/native-evidence.json`. Grant Automation access to the application launching REA under System Settings → Privacy & Security → Automation to use Hopper. Ghidra and the caller-supplied JADX MCP provider are not configured. No tools or client configuration were changed.

## Telemetry contracts

[Beszel source](https://github.com/henrygd/beszel/blob/826b52b655f4c7651f97d01b778f656dd7c1503a/internal/entities/system/system.go) defines CPU as `cpu`, memory percent as `mp`, and sensor temperatures as the `t` map. Newer payloads use `mem` byte tuples; older GB fields are deprecated. Pin a supported server version and verify authenticated record retrieval before implementing a connector. Select a sensor explicitly; the hottest disk sensor is not necessarily CPU temperature.

[TrueNAS reporting.realtime documentation](https://api.truenas.com/v25.04.1/api_events_reporting.realtime.html) describes aggregate and per-core CPU readings, nullable Celsius temperature, and memory metrics. A search index returned this schema, but fetching that exact version URL returned 404. Reconfirm against the user's installed TrueNAS version before implementation. Do not treat this as a verified wire contract.

## Next probes

1. Inspect CoreBridge APK manifest and DEX strings with retained hashes. Locate discovery, pairing, session authentication, profile upload, and plugin declarations.
2. Recover EXE callers for the upload templates once Hopper access works, or use another already available compatible engine.
3. Inspect an exported `.umpf` from a disposable profile. Determine container, schema, IDs, and widget properties.
4. Observe one authorized pairing and one disposable-profile deployment. Redact tokens from retained traffic and fixtures.
5. Prove a read-only device handshake before exposing deployment in the web UI.

## CoreBridge follow-up

Downloaded `bridge.1.0.4.4.apk`; SHA-256: `a6394bcad5938275fdcaf0774f68f87ee83c6a19ee831e704321f784704a77f2`. REA APK inspection requires the unconfigured JADX provider; the exact failure is in `evidence/bridge-evidence.json`.

A separate ordinary DEX byte-string scan found `com/ultrabar/hub/common/websocket/CoreWebSocket`, a Home Assistant WebSocket class, and `/api/websocket`. These are search leads only; library strings do not establish active device endpoints. The scan is retained in `evidence/bridge-string-leads.txt`.

## Verified telemetry references and implementation

The current [TrueNAS 25.10 reporting schema](https://api.truenas.com/v25.10/api_events_reporting.realtime.html) was fetched successfully. It confirms `cpu.cpu.usage`, nullable `cpu.*.temp`, and `memory.physical_memory_total` / `physical_memory_available`. The [JSON-RPC protocol](https://api.truenas.com/v25.10/jsonrpc.html) specifies `collection_update` notifications with the event under `params`; [core.subscribe](https://api.truenas.com/v25.10/api_methods_core.subscribe.html) takes the collection name and returns a subscription ID. The [official API client](https://github.com/truenas/api_client) uses `/api/current` for JSON-RPC. Implemented with TLS required; legacy `/websocket` and TrueNAS 26 SCRAM are outside current connector coverage.

The [Beszel record writer](https://github.com/henrygd/beszel/blob/826b52b655f4c7651f97d01b778f656dd7c1503a/internal/hub/systems/system.go) stores `system_stats` with `system`, `stats`, and `type="1m"`. Its frontend uses PocketBase user authentication. The connector requests the latest accessible one-minute record for a configured system and preserves its UTC `created` timestamp. Polling does not make old data fresh.

The local prototype uses an internal `.ultracraft.json` profile format while native export is unknown. It never sends a guessed native deploy payload. Widget browser views and server connectors are implemented; actual service and CoreBAR verification remain outstanding.

## Working analysis paths

The headless JADX provider now works with an existing Java 21 runtime and its separately downloaded 0.7.1 provider JAR. The release checksum was verified as `6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75`. No global Java installation or client configuration changes were needed. Successful package and method Evidence supersedes the earlier missing-provider failure.

Hopper analysis works when launched through the Terminal app that has Automation permission. The direct T3 process still receives an Apple Events denial. Preserve this distinction when retrying. Do not open foreground Terminal or Hopper windows: the user has asked that analysis stay in the background. Prefer the working headless Android path; existing native Evidence is available without further GUI launches.

## Native profile transfer findings

`BatchProfileMessage.onMessage` parses an array of `ProfileManager.ProfileDTO` and calls `ProfileManager.batchSave`. `ProfileManager.lambda$batchSave$0` calls `appData.setProfiles(list)`. **Batch deployment replaces the stored profile list.** A web deploy must preserve the complete existing list and provide a recoverable backup before using this operation. No native deployment has been attempted.

`ProfileManager.toProfile` rejects empty profile IDs and requires a widget list. Widgets are converted through `WidgetCoverRegistry.cover`. DTO fields include `isDefault`, `showName`, `widget`, and `module`; ID/name fields are inherited and remain under investigation.

The upload templates have different purposes. `UploadServiceIns.uploadConfig` resolves a module by serial number and stores a `.tgz` for a module update. It is **not** the profile deployment API. `UploadServiceIns.uploadZip` extracts a ZIP into application external files and optionally clears the destination first; it then reloads profile data. Do not call either endpoint with guessed payloads.

CoreBridge's separate WebSocket handshake sends `clientId`, `serverTime`, `needAuth`, and an RSA public key. Authentication uses an acknowledgement with code zero on success and records `clientType`/`bizId`. These methods do not yet establish that the WebSocket is UltraWorkspace's profile transport.

## Directed discovery, recovered and verified

`CommunicationInitializationTask.startSsdpServer` configures `discovery.ultrabar` as the discovery request. `DeviceAnnouncerHandler.channelRead0` compares the received UTF-8 text exactly and replies to the sender. `Announcer.getBroadcast` builds the JSON announcement with `serialNo`, `ver`, `ip`, `name`, and `tcpPort`.

The UDP discovery port is 5319. REA's class summary does not expose encoded static field values, so a separate ordinary Python DEX parser read it from `classes3.dex` at offset `0x6eaec2`. The exact artifact hash and the other port constants are preserved in `evidence/lineos-port-constants.json`; this record is explicitly not REA Evidence. The constant TCP port (7438) differs from the hard-coded announcement (7431). Neither should be assumed to be the pairing endpoint without tracing the active transport.

A directed request to the user-provided device returned an announcement with LineOS `1.0.9(9)`. The local web API was then verified against that same live device: POST `/api/device/discover` returned HTTP 200, version `1.0.9(9)`, advertised port 7431, and `paired: false`. The serial number stays out of the API response and tracked documentation. Host addresses and raw responses remain in ignored local artifacts.

The editor now offers **Find CoreBAR**. It sends one directed UDP request only when clicked, to `COREBAR_HOST` configured on the server. It never broadcasts, pairs, or deploys. Eighteen automated tests pass, including directed discovery, timeout cleanup, and API origin/metadata boundaries. Browser layout and native deployment are still unverified.

## Pairing and native export format

Headless class recovery through the same checksum-verified JADX JAR exposed CoreBridge's native TCP pipeline: TLS 1.3 on port 7431, UTF-8 newline-delimited JSON, and a 1 MiB frame limit. This direct JADX class dump is ordinary decompiler output, separate from the retained REA method Evidence.

`TokenAuthHandler` handles action 100 for an existing token and action 101 for a pairing request with `data.id` / `data.name`. Pairing first acknowledges `data.state=0`; approval on the physical device yields `data.state=1` and a token. The native dialog expires after ten seconds. Tokens are not sent to the browser. An old token from the user's export was rejected; no new physical prompt was triggered by the agent.

The app verifies TLS against the public certificate bundled in CoreBridge and its exact SHA-256 fingerprint `4A:A8:30:D5:FE:23:6A:41:E5:B8:50:2C:EC:D3:AA:5F:8D:A7:42:AC:75:7B:F6:E3:19:65:4F:31:D6:79:0B:93`. Node's `allowPartialTrustChain` accepts the bundled certificate as the local trust anchor while `rejectUnauthorized` stays true. A live TLS 1.3 handshake was verified. Certificate identity comes from the shipped release, not a unique per-device certificate; physical token approval remains required.

A real user-owned `.umpf` export is a SQLite database. Its `json_store` holds `mate`, `profile`, `host`, `module`, and `profileCbWidget` records. Native profile widget rows reference the profile row ID as `k1`; `sort_id` controls ordering. `columns` and `data` contain JSON. `file_store` contains attachments and `property_store` holds editor properties. The schema has three timestamp update triggers, now recognized explicitly by the reader.

The native project reader returns only profile/widget metadata to the browser. Edits use a private database copy. Native export preserves unknown configuration and clears known host tokens, then runs VACUUM to remove old credential bytes. Tests verify original preservation, module binding preservation, and token removal. A live local-file check confirmed one profile, three widgets, two modules, a valid SQLite export, no remaining known host token bytes, and an unchanged original. Official-app reopening and device deployment are still pending.

## Native widget rendering constraints

The released LineOS home layout uses fixed `WidgetType` renderers. Its CPU holder subscribes to the global CPU MetricsBus topic rather than a widget-specific host. An ordinary DEX string scan found AppWidgetManager/RemoteViews references attributable to bundled Picasso helpers, but no AppWidgetHost reference; this scan alone is not proof of host support. The recovered native widget enum has no arbitrary WebView card type. Two independent CPU/RAM/temperature cards therefore need a supported extension path or a separate renderer; merely replying to the global desktop CPU topic would not meet the multi-source requirement.

A user preference question is pending about always-visible home cards versus native tiles opening telemetry screens. No app or replacement renderer has been installed on the device.

## Connection setup and native editing

The editor now supports TrueNAS API-key configuration and Beszel email/password sign-in with system selection. The bridge exchanges the Beszel password through its PocketBase user authentication endpoint and persists only the session token. Saved settings have owner-only file permissions and are excluded from Git and profile exports. Settings responses never return credentials, and updates restart only the affected connector. Token refresh remains unimplemented; an expired session requires signing in again.

Native widget names and `sort_id` ordering can be changed in the private `.umpf` working copy. Reordering requires the exact existing widget ID set, preventing accidental loss or cross-profile moves. Tests cover preserved parameters and module bindings. Twenty-nine tests pass; actual telemetry credentials and physical pairing are still missing.

## Plugin feature inventory and native profile management

The recovered plugin `Features` enum contains `CALL`, `OPEN_ACTIVITY`, `REPORT_DATA`, and `EVENT`. `RegisterPayload` provides package/name/configuration metadata; `DescribeResultPayload` describes action parameters and options. These observations do not establish a custom home-card renderer. The public repository list and the vendor's SDK links did not reveal a separate widget-rendering SDK. The widget rendering preference question remains pending; no activity-only substitute has been installed or called complete.

Native SQLite profile creation and default selection are now implemented. New empty profiles use the observed `profile` row structure; selecting a default updates both the `preferred` JSON field and its `k1` index in one transaction. Existing widgets, module bindings, and unknown fields remain intact. Thirty tests pass. Official desktop reopening and physical deployment remain unverified.

## Verified paired session and always-visible requirement

The user completed physical pairing and requires both telemetry widgets to remain visible in the home layout. Opening separate telemetry activities does not meet that requirement.

The saved token authenticated on the matching live CoreBAR over pinned TLS. Action 20 returned code 200, and action 1002 returned the native root catalog (`sys.widget.apps`, `sys.widget.iot`) and their children. A manager-level live read also succeeded. Catalog responses to the browser contain only IDs, names, types, and leaf flags, with private parameters omitted.

The web app now supports authenticated native-library browsing. Thirty-one tests pass. The released plugin listener's `onReport` implementation is inherited as a no-op; plugin feature declarations do not establish a custom home renderer. The remaining architecture question is whether a compatible UltraCraft home is acceptable while retaining LineOS as a fallback. No launcher replacement, firmware modification, or native deployment has been performed.
