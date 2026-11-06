# Sanytron research inputs

Retained on 2026-11-05 from the official v1.0.1.0 release and the native UltraWorkSpace marketplace. These are third-party research inputs, not Ultra Craft builds. Original archives/APKs are preserved byte-for-byte; they have not been patched or installed by this documentation pass. Upstream ownership and licensing remain with their respective authors.

[manifest.json](manifest.json) records exact byte sizes, SHA-256 hashes, and source provenance. Individual release assets are named as downloaded, including the APK names that differ from release-note prose.

| Path | Purpose |
| --- | --- |
| v1.0.1.0/UltraWorkSpace-V1.0.1.0-Windows.zip | Native desktop artifact; Qt libraries and EXE |
| v1.0.1.0/bridge.1.0.4.4.apk | CoreBridge transport/service analysis |
| v1.0.1.0/LineOS.V1.0.9.9.apk | Home renderers, discovery, profile/deploy analysis |
| plugin-packs/zoom-v1.0.0.zip | Downloaded PC-control template pack |
| plugin-packs/obs-v1.0.0.zip | Downloaded PC-control template pack |
| plugin-packs/*.config.json | Exact config.json extracted from each ZIP for review |

Release source: https://github.com/Qinkunex/UltraWorkspace/releases/tag/v1.0.1.0. Pack provenance and remaining collection work are in [marketplace research](../../docs/research/marketplace.md).

The macOS DMG, module firmware, remaining seven observed desktop packs, and standalone marketplace APP APKs are not included. The analysis JAR is a tooling dependency, documented separately. No screenshot files were available in the retained artifact directory; none were invented or captured by raising the user's apps during this pass.

The binaries total roughly 106 MiB. They are present as normal working-tree files; no Git LFS configuration was added. The application does not serve vendor/ over HTTP. Do not add private .umpf projects, host tokens, or session captures here.
