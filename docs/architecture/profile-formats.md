# Profile formats

## Browser development profiles

`public/profiles.mjs` owns the internal `.ultracraft.json` format. It is not a native .umpf file or a deploy payload.

```json
{
  "format": "ultra-craft",
  "version": 1,
  "name": "Servers",
  "widgets": [
    {"id": "nas", "kind": "truenas", "sourceId": "truenas", "name": "TrueNAS", "sensor": ""},
    {"id": "stats", "kind": "beszel", "sourceId": "beszel", "name": "Beszel", "sensor": "cpu-sensor"}
  ]
}
```

Profiles have up to eight widgets. Names are nonempty and at most 100 characters. IDs contain letters, numbers, underscore, or hyphen, with length 1–80; widget IDs are unique within a profile. `kind` and `sourceId` each accept truenas/beszel. Sensor keys are at most 200 characters. Validation returns only explicit allowed fields, excluding imported credentials and unknown metadata.

Browser storage key: `ultra-craft.profiles.v1`. Stored profiles additionally have an internal profile ID. Export omits that profile ID. Loading validates 1–50 profiles and unique profile IDs. The editor supports creation, rename, duplicate, deletion, import/export, widget settings, and left/right ordering.

## Native .umpf: observed SQLite schema

| Table | Contents |
| --- | --- |
| json_store | Typed records; k1–k4 indexes; JSON text in columns/data; sort_id ordering |
| file_store | Binary attachments, associated through owner_id/file_name |
| property_store | Desktop editor properties |

Observed record types include mate, host, module, profile, profileCbWidget, and plugin. Host JSON may contain a token. Native widget rows reference a profile's database row ID through k1. Profile module associations include keys such as `profile_2`; these are not interchangeable with browser UUIDs or hardware UIDs.

Preserve `deploymentData.id`, widget `columns.uid`, and hardware `param.uid` according to their actual roles. Do not regenerate them as part of cosmetic edits. Three observed timestamp triggers are recognized by exact definitions; an arbitrary database trigger is not accepted as trusted native schema.

Desktop Plugin records contain metadata/configuration in json_store and attachments named `icon` and `pack` in file_store. The pack attachment is a ZIP, distinct from standalone Android APP packages.

## Implemented native editing

`NATIVE_PROJECT_FILE` identifies an existing source. The server creates a private working copy named `artifacts/native-editor-<path-hash>.umpf`. Edits operate on that copy: create an empty profile, change default, rename profile/widget, and reorder widgets within one profile. Reordering requires the exact existing ID set. Default selection updates the observed preferred field and index transactionally.

Export preserves unknown records, parameters, attachment data, and module bindings. It clears known host token fields and runs VACUUM so old token bytes are removed. This is targeted token cleanup, not a guarantee that arbitrary third-party plugin data contains no secrets. Inspect any export before sharing it externally.

Tests use fixture databases and cover original preservation, unknown data, bindings, reorder rejection, new/default profiles, and known-token removal. A local original export was also checked before/after web editing. Official desktop reopening and physical deployment remain unverified. Native app actions may independently modify the user's original project, as the authorized Zoom/OBS downloads did.
