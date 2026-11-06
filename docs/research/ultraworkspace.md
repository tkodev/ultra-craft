# UltraWorkspace research

Current synthesis as of 2026-11-05. Use this page over the [historical log](history/2026-11-05-investigation-log.md), which retains intermediate failures and superseded conclusions.

## Evidence levels

- **Live verified:** directed discovery, TLS handshake, physical pairing, saved-token authentication, heartbeat acknowledgement, native catalog reads, and Zoom/OBS pack downloads.
- **Static artifact evidence:** profile replacement semantics, fixed built-in card renderers, sensor bindings, plugin declarations, and upload handlers.
- **Fixture verified:** local source connectors, state handling, native editing/export, and browser DOM interactions.
- **Vendor claim:** capabilities described on product/support pages but not exercised here.
- **Open:** third-party APP home-card contract, complete profile read/restore, physical card deployment, official file reopening, and real authenticated telemetry.

## Artifact findings

The Windows release contains a native Qt application with QtWidgets/QtNetwork/QtSerialPort, SQLite, and libusb. There is no Electron ASAR or JavaScript app to port. The public GitHub tree reviewed contains documentation and release artifacts, not desktop source. The vendor's SDK link points there; a usable custom-card SDK contract has not been found.

The .umpf format is SQLite. Its schema and preservation requirements are recorded in [profile formats](../architecture/profile-formats.md). Discovery/session/upload findings are in [CoreBAR protocol](../architecture/corebar-protocol.md). Hashes and provenance are in the [vendor manifest](../../vendor/sanytron/manifest.json).

## Home-card findings and limits

SenseCubeHolder subscribes through DataBus to SenseCubeParameter.uid and handles SENSE_CUBE_REPORT. The combined card reads humidity property 5 and temperature property 1 as floats. The sound card uses property 12 and displays decibels. This gives a concrete per-device binding reference.

The built-in CPU holder subscribes to a global CPU MetricsBus topic. Reusing that topic alone would not provide two independently bound server cards. WidgetCoverRegistry converts known widget types. The recovered enum does not establish an arbitrary WebView card. AppWidgetManager/RemoteViews strings attributable to bundled helpers do not prove Android AppWidget host support.

The recovered plugin Features enum declares CALL, OPEN_ACTIVITY, REPORT_DATA, and EVENT. The inspected PluginServerManager inherits a no-op report listener. This is evidence about that implementation only. It does not prove that the downloadable HomeAssistant APP or every integration path lacks home-card support.

The user reports working native decibel and presence cards and wants the same home experience. Investigation must follow actual APP packages and SenseCube binding before concluding that LineOS cannot support the requested cards. The replacement-home proposal was withdrawn and is out of scope.

## Tools that worked

REA 6.7.0 CLI produced archive, APK, class, method, and Frida evidence. REA MCP was not registered in this session. Headless Android inspection works with the existing IntelliJ Java 21 runtime and the separately checksum-verified JADX provider JAR 0.7.1. Initial missing-provider failures are historical, not current blockers.

Hopper worked when launched through Terminal with Automation permission; direct T3 Apple Events calls were denied. Avoid foreground Terminal/Hopper launches because the user asked to work without interruptions. Ordinary direct JADX dumps supplement REA records and must not be labelled REA Evidence.

Frida successfully attached to the running native macOS UltraWorkSpace app. Passive QtNetwork/QUrl and OpenSSL hooks captured a real plugin CDN request. See [marketplace tracing](marketplace.md) and retained [tools](tools/README.md). No system proxy or trust settings were changed.

## Retention

`evidence/` retains original REA records and explicitly labelled ordinary extraction results. Some earlier records intentionally show failures. Local absolute paths in tool metadata describe the original analysis machine. Private discovery/catalog/session captures stay in ignored artifacts/. Selected card/converter/plugin classes are retained under evidence/decompiled with a source/hash manifest; these are ordinary JADX output, not REA Evidence. A minimized store-observation.json records the captured public URL. Temporary full decompilations remain under /tmp/ultra-craft-research and can disappear; reproducible helper scripts and source binaries are now retained in the repo.

See [vendor sources](vendor-sources.md) for supplied links and [the delivery plan](../prd/06-plan.md) for next work.
