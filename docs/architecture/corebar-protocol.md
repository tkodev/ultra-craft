# CoreBAR protocol

Investigated against LineOS 1.0.9(9) and release CoreBridge 1.0.4.4. This is a recovered contract for these artifacts, not a version-independent SDK.

## Discovery: live verified

Send the exact UTF-8 text `discovery.ultrabar` to UDP port 5319 at the explicitly configured IPv4 address. The reply is JSON containing `serialNo`, `ver`, `ip`, `name`, and `tcpPort`. The observed announcement advertises TCP 7431. A separate static constant says 7438; it does not override the active announcement and verified transport.

The application sends directed requests only when requested. It validates reply shape and omits serial numbers from browser output. The discover response's `paired: false` is not an authoritative saved-session check; use `/api/device/status` for saved pairing state.

## Native session: live verified

Connect with TLS 1.3 to TCP 7431. Frames are UTF-8 JSON separated by newline; maximum frame size is 1 MiB. Requests have `{id, act, data}`. Responses correlate by `id`; the implemented success code is 200. Split frames and multiple frames per read are handled. Unsolicited unmatched messages are ignored by this client.

The bridge trusts the public certificate shipped with the release and checks its exact SHA-256 fingerprint:

```text
4A:A8:30:D5:FE:23:6A:41:E5:B8:50:2C:EC:D3:AA:5F:8D:A7:42:AC:75:7B:F6:E3:19:65:4F:31:D6:79:0B:93
```

`allowPartialTrustChain` is enabled; `rejectUnauthorized` remains true. The certificate is shared release identity, not unique device identity. Physical pairing and matching the saved serial to discovery remain part of authorization.

| Action | Data | Finding |
| --- | --- | --- |
| 20 | Heartbeat payload | Live code-200 acknowledgement observed |
| 100 | Token string | Saved-token authentication verified |
| 101 | `{id: clientId, name: clientName}` | Physical pairing verified |
| 1002 | Parent ID string or null | Live native catalog traversal verified |
| 1108 | Complete profile DTO array | Static code replaces entire profile list; never sent |
| 30600 | App request with type/appType/packageName | Static marketplace app management; not an arbitrary APK URL installer |
| 30740 | Configuration type | Static BASE_SET/GATEWAY_CONFIG/APP_LIST paths; complete profile backup not established |

Pairing action 101 first reports `data.state=0`, then approval reports `data.state=1` with a token. The physical prompt expires in ten seconds. The bridge persists the token locally with mode 0600 and never returns it to the browser. The user completed this flow. A token imported from an old export had previously been rejected.

The root catalog includes `sys.widget.apps` and `sys.widget.iot`. Browser responses retain only ID, name, type, and leaf status. This proves catalog reading, not deployment or custom rendering.

## Upload and replacement paths: static evidence only

`BatchProfileMessage` calls `ProfileManager.batchSave`, whose implementation calls `appData.setProfiles(list)`. Action 1108 therefore cannot be used as an assumed single-profile patch. A complete backup, preserved full payload, and recovery procedure are prerequisites for its use.

`http://%1:8080/upload?serialNo=%2` leads to a module .tgz update path. `/upload/zip` extracts application files, can clear its destination, and reloads profiles. Neither is implemented or invoked. Methods/authentication and payload details must be recovered before use.

A separate CoreBridge WebSocket handshake includes clientId/serverTime/needAuth/RSA public key and a different authentication acknowledgement convention. Do not mix it with the verified native TLS action protocol.

## Evidence

See [retained REA records](../research/evidence/), especially lineos-announcer*, lineos-port-constants, lineos-batch*, lineos-profile-save-lambda, lineos-upload-config, and lineos-uploadzip-impl. Native TLS and pairing class dumps were ordinary JADX output. Automated session tests cover framing, request IDs, denial, timeout, certificate pinning, and private persistence; live checks separately established pairing/auth/catalog success.
