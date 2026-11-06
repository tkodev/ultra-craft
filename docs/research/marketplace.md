# Marketplace and network observations

Observed in native UltraWorkSpace v1.0.1.0 on 2026-11-05. The store separates Installed/Cloud and APP/Plugin. Do not use Plugin as a synonym for every installable integration.

## Plugin packs

| Cloud pack | State | Observed action types |
| --- | --- | --- |
| ZOOM Hotkey Plugin v1.0.0 | Downloaded; retained in vendor/ | PC_CONTROL |
| OBS Hotkey Plugin v1.0.0 | Downloaded; retained in vendor/ | PC_CONTROL |
| AI Website | Listed; not downloaded | Unknown |
| Photoshop | Listed; not downloaded | Unknown |
| Windows | Listed; not downloaded | Unknown |
| Emoji | Listed; not downloaded | Unknown |
| Excel | Listed; not downloaded | Unknown |
| Word | Listed; not downloaded | Unknown |
| Website | Listed; not downloaded | Unknown |

The desktop Install action for the first two downloaded ZIPs and registered their templates in the open project. It did not install an Android APK. Both packs have config.json and PNG icons. Configuration has identifier/name/versionCode/versionName/author/button; buttons have id/icon/type/name/spanSize/param. Zoom buttons use `type: PC_CONTROL` and params such as output/keys. These two examples support the user's distinction between desktop action packs and standalone APPs; the remaining packs are not yet inspected.

The actual downloaded bytes were recovered read-only from native json_store plugin rows and file_store pack attachments. Only the public pack blobs/configs were retained, not the enclosing user project. Compare [original configs](../../vendor/sanytron/plugin-packs/) before inferring key meanings.

## APP inventory

Installed list observed: Calculator 1.0.2, Alarmclock 1.0.2, SpaceDodger 1.13, AuroraSniper 1.3, WhiteNoise 1.0.5, StellarRing 1.0.1, and HomeAssistant 1.0.4. HomeAssistant exposes a Web UI button.

Cloud list observed: Sonos 1.0.1, HomeAssistant 1.0.4, WhiteNoise 1.0.5, Calculator 1.0.2, Alarmclock 1.0.2, UltraBar Files 1.2 (code 2), UltraNotes 1.4.14 (code 19), UltraRadio 1.7.1 (code 33), UltraAgent 1.0 (code 18), and MAMate 1.0.2 (code 3). These APP APKs have not been collected. Installed status predates our collection work; no device APP install/uninstall has been performed by us.

HomeAssistant is the priority: recover package URL, configuration schema, API-token handling, entity registration, and data delivery into home cards. A Web UI button proves an administration surface, not arbitrary page embedding in LineOS home.

## URL capture

Static marketplace lead: `https://gatewayssl.dev.aiks360.com/api/v1/base-service/pub/plugin/page`. A naive GET returned an error; method/body/authentication must be recovered rather than guessed.

Live passive capture observed a POST operation, the gateway origin, and this Zoom ZIP GET:

```text
https://sslcdn.lifex360.com/plugin/2026/08/8mcrt364xc84gxwdqxmj.zip
```

The captured POST operation and gateway URL are not sufficient to reconstruct a complete POST path or request body. HTTP/2 also limits a hook that recognizes only HTTP/1 request lines. The stored Zoom bytes came from the resulting native project attachment.

The trace hooks QNetworkAccessManager.createRequest, QUrl.toEncoded, and libssl.3.dylib SSL_write/SSL_write_ex. It emits method/URL metadata only, redacts non-paging query values and obvious secret paths, and does not dump headers or bodies. This redaction is best effort; review traces before adding them to Git. The ARM64 Qt QByteArray/x8 layout is version/architecture-specific.

REA instrumentation duration is capped at 60,000 ms. The 90,000 ms attempt failed validation. Resolve the current PID and exports before any new attachment; do not reuse historical PID 34439. A completed bounded capture detaches. No proxy interception certificate was installed.
