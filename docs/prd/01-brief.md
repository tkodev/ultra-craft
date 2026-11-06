# Brief

Create an independent web version of UltraWorkspace and two UltraBARX telemetry widgets: TrueNAS and Beszel. The motivation is better software delivery and a better interface for configuring and using the hardware.

## Required outcome

Each service has its own compact card showing CPU percentage, RAM percentage, and temperature in Celsius. Both cards remain visible directly in the existing LineOS home layout. The combined SenseCube humidity/temperature card is the presentation reference. The user's working decibel and presence widgets demonstrate the existing home-card experience to preserve.

The web workspace should configure the cards, manage native profiles, and ultimately deploy compatible configuration to CoreBAR. Existing hardware/module bindings must survive editing and deployment.

## Acceptance criteria

1. Both cards show independent, real readings on LineOS home simultaneously.
2. Credentials can be configured privately, following the downloadable HomeAssistant app's configuration flow as a research reference.
3. Missing readings are unavailable, stale readings are identified, and reconnection cannot make old samples look fresh.
4. Profiles round-trip through the official desktop application with unknown fields and module bindings intact.
5. Deployment has a reviewable change preview, preserves existing profiles, and has a proven recovery path.
6. The web UI supports keyboard operation and clear connection/error states.

## Settled constraints

Keep LineOS as the home screen. A replacement launcher or a tile that only opens a separate telemetry activity does not satisfy this request. An earlier provisional acceptance of an UltraCraft home was withdrawn.

Keep investigation in the background where possible. Do not repeatedly raise Terminal or Hopper while the user works. Do not ask again for permission already given in the conversation.

## Additional authorized research

Inspect UltraWorkspace, capture its requested URLs, and download every offered pack for comparison. HomeAssistant may be uninstalled/reinstalled if necessary to capture its download/configuration behavior. Useful downloaded release files, packs, scripts, and screenshots may be retained in the repository. These permissions do not establish that every marketplace app should be installed on the device.
