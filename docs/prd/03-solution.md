# Solution

A local browser workspace talks to a Node bridge. The bridge owns telemetry credentials, native SQLite editing, and the authenticated CoreBAR connection. The browser owns a development profile layout and displays source status.

## Surfaces

- Workspace: development profile creation, editing, import/export, and card preview.
- Connections: TrueNAS key setup; Beszel sign-in and system selection.
- Native project editor: existing .umpf working copy, profile creation/default selection, rename/reorder, and cleaned export.
- Device panel: directed discovery, explicit physical pairing, and read-only native library browsing.
- LineOS home: intended destination for both cards; integration still under investigation.

The browser's standalone `/widget` views are useful development surfaces. They are not delivered native cards. The bridge currently binds to loopback, so CoreBAR cannot fetch these views.

## Approach still open

The actual HomeAssistant APP and the SenseCube data path must establish the supported way to supply and configure home-card data. No replacement launcher, invented arbitrary-WebView contract, or global PC CPU-topic workaround is adopted.
