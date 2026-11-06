# Design status

No Figma file or approved token contract has been supplied. The existing browser UI is a prototype, not a verified transcription of an approved design.

## Product direction

Use one compact card per server. Keep CPU, RAM, and temperature visible together, following the existing combined humidity/temperature card's hierarchy. Give each card a clear server name and a visible connection/freshness state. Missing values must not resemble zero readings.

Credential entry belongs in connection setup, outside profile exports. Clear sensitive form values after use. Profile controls must support keyboard use and visible focus. Connection errors should be actionable without exposing upstream response bodies or credentials.

## Verification still needed

Capture the actual SenseCube reference and HomeAssistant configuration screens, then record their measured native card dimensions and supported controls. Check the browser at desktop and narrow widths and check both physical cards together on CoreBAR. The published display resolution is a vendor claim, not a substitute for this validation.

Exact current CSS values remain in `public/styles.css`; they are not an approved design-system contract.
