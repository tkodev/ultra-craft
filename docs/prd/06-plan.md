# Initial delivery plan

Current for local prototype 0.1.0 on 2026-11-05. Not shipped. The full goal remains incomplete.

| Milestone | Dependency | Completion evidence | Status |
| --- | --- | --- | --- |
| Protocol research | Release artifacts | Discovery, TLS, pairing, catalog, native schema, deploy semantics | Partly verified; complete read/restore and card contract pending |
| Metrics foundation | Source contracts | CPU/RAM/temp normalization and disconnect/freshness behavior | Implemented; fixtures pass; real services pending |
| Widget proving surface | Metrics and native card contract | Two real source cards remain visible together on LineOS home | Browser prototypes only |
| Web workspace | Native schema | Profile editing and official-app-compatible round trip | Internal editor and partial native editor implemented; official reopening pending |
| Device deployment | Full backup/restore and native cards | Preview, preserved configuration, acknowledged deploy and recovery | Not implemented |
| Final verification | All above | Keyboard/browser review and live device/service checks | Pending |

## Completed and checked

Directed discovery, physical pairing, saved-token authentication, heartbeat, and read-only native catalog retrieval succeeded on the user's CoreBAR. Native file edits preserve original bytes in tests, retain unknown configuration/module bindings, and strip known host tokens from exported copies. All 31 automated tests and the current syntax check pass.

Both downloaded desktop packs, Zoom and OBS, have been retained with checksums. The remaining seven observed Plugin packs and the standalone APP packages have not been collected. See [marketplace inventory](../research/marketplace.md).

## Next work in order

1. Finish collecting packs and retain sanitized metadata with hashes.
2. Recover HomeAssistant APP download and configuration/card integration. Compare with SenseCube data binding.
3. Prove one externally updated native home card, then two independent sources.
4. Verify TrueNAS installed version and authenticated readings; verify Beszel readings and selected temperature sensor.
5. Reopen a cleaned native export in official UltraWorkspace and confirm binding preservation.
6. Recover full profile read/backup/restore and exact deployment payload; build a preview before testing a disposable profile.
7. Verify both cards live, reconnect/staleness handling, and browser usability.

Do not substitute an activity tile or replacement launcher for the required home cards. Do not mark hardware delivery complete based on browser or fixture tests. No firmware update, launcher change, device app installation, or profile deployment has been performed by this implementation.
