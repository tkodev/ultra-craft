# Observations

## The problem

The desktop application is a native Qt application with incomplete public developer documentation. Browser telemetry is working locally, but the method for adding two independently bound cards to LineOS home remains unproved.

## Hardest failure mode

Action 1108 replaces the complete profile list. Treating it as a one-profile update could remove the user's configuration. Direction: recover a full read/backup/restore path and payload schema before deployment.

## Key decisions

| Evidence or risk | Direction |
| --- | --- |
| Existing SenseCube cards show combined readings | Trace their binding and update path as the native reference |
| Downloadable HomeAssistant has configuration and Web UI | Inspect its actual APP package and entity/card integration |
| Zoom and OBS packs contain PC_CONTROL templates | Keep desktop Plugin packs separate from standalone APP packages |
| Fixed built-in renderers and a no-op plugin report listener were found | Do not infer that all extension paths are unsupported from those partial findings |
| Browsers cannot use arbitrary UDP/TLS sockets | Run a local Node bridge for discovery, device transport, and credentials |
| Native .umpf includes host authorization data | Edit private copies and remove known host tokens from exports |
| Beszel can return an old latest record repeatedly | Use record observation time rather than fetch time |
| Hardware compatibility is not covered by fixtures | Track live verification separately from automated tests |

## First proof still needed

Prove a single home card with a separately addressable external data source using the supported APP/card route. Then prove two independent sources before expanding deployment or claiming the widget goal complete.
