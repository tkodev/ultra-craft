# Vendor sources

Reviewed 2026-11-05. Public pages help identify the intended product experience; they do not replace artifact or runtime verification.

| Source | Useful for | Limit |
| --- | --- | --- |
| [Product](https://hub.sanytron.com/interfaces/ultrabarx) | CoreBAR/module concept and intended desk experience | Marketing claims, not an API contract |
| [Support hub](https://hub.sanytron.com/support/ultrabarx) | Navigation to LineOS, modules, setup, downloads | Index, not implementation detail |
| [Getting started](https://hub.sanytron.com/support/ultrabarx/getting-started) | Device/network setup and desktop workflow | No custom-card schema |
| [UltraWorkspace overview](https://hub.sanytron.com/support/ultrabarx/ultraworkspace) | Desktop configuration scope | Needs comparison with installed release |
| [Workspace guide](https://hub.sanytron.com/support/ultrabarx/ultraworkspace/guide) | APP/Plugin and editor flow reference | Latest fetch failed; prior session review is not a fresh successful fetch |
| [Integrations](https://hub.sanytron.com/support/ultrabarx/integrations) | HA/PC/smart-home categories and SDK link | The SDK link did not reveal a usable rendering contract |
| [HomeAssistant](https://hub.sanytron.com/support/ultrabarx/integrations/homeassistant) | URL/token setup and entity-card workflow to investigate | Documentation claim; actual APP must be traced |
| [Release notes](https://hub.sanytron.com/support/ultrabarx/release-notes) | Release bundle versions | Independent app/firmware version lines |
| [GitHub release](https://github.com/Qinkunex/UltraWorkspace/releases/tag/v1.0.1.0) | Shipped desktop/APKs, changes, checksum link | Release-note names differ from actual APK asset names |

The product presents CoreBAR with modular controls. The upstream README describes a 1424 × 280 screen. Neither is physical card-layout validation. [Product page](https://hub.sanytron.com/interfaces/ultrabarx), [upstream README](https://github.com/Qinkunex/UltraWorkspace/blob/main/README.md).

The October 21 bundle identifies UltraWorkspace 1.0.1.0, LineOS 1.0.9, and CoreBridge 1.0.4. Its changelog includes SenseCube widgets, a marketplace, and application WebUI administration. Those features justify investigating actual packages; they do not prove generic external web cards. [Release notes](https://hub.sanytron.com/support/ultrabarx/release-notes), [release](https://github.com/Qinkunex/UltraWorkspace/releases/tag/v1.0.1.0).

The HA guide describes configuring a server URL and long-lived token, then adding discovered entities as CoreBAR cards. This is the most relevant published integration workflow for the user's requested widgets. Its UI details and security statements remain unverified until compared with the installed APP. [HA integration guide](https://hub.sanytron.com/support/ultrabarx/integrations/homeassistant).
