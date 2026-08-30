# 9router import support for Gemini API keys

**Date:** 2026-08-30  
**Approach:** A — Auto-detect 9router format in existing import flows; shared parser in `@gemini-proxy/core`.  
**Scope:** One-way migration (import from 9router only). Export stays native gproxy format.

## Goal

Allow users to paste or upload a 9router full database export JSON and import **only** Gemini/Google upstream API keys into gemini-proxy — via CLI and Web — without a dedicated UI tab or new commands.

## Background

9router exports the entire local DB as JSON (`GET /api/settings/database`). Relevant shape:

```json
{
  "settings": { ... },
  "providerConnections": [ ... ],
  "providerNodes": [ ... ],
  "proxyPools": [ ... ],
  "apiKeys": [ ... ],
  "combos": [ ... ]
}
```

**Critical distinction:**

| 9router field | Contents | Import? |
| --- | --- | --- |
| `providerConnections` where `provider === "gemini"` | Upstream Gemini API keys (`apiKey`) | **Yes** |
| `apiKeys` | 9router client auth keys (`sk-...`) | **No** |
| Other providers (`nvidia`, `openai-compatible-*`, …) | Non-Gemini upstream | **No** |
| `proxyPools`, `settings`, `combos`, … | Infra / routing config | **No** |

gemini-proxy stores keys as `api_keys` rows with `provider: "googleaistudio"`.

## Decisions locked

1. **Surface:** CLI + Web; shared parser in `packages/core`. No dedicated 9router tab — auto-detect in existing JSON import.
2. **Export:** Always native gproxy format (`{ version, exported_at, api_keys }`). No 9router export.
3. **Inactive keys:** Import all Gemini connections; sync `is_active` from 9router `isActive`.
4. **Duplicate matching:** Primary match on `api_key_value` (trimmed); fallback on `metadata.connection_id` (9router connection `id`).
5. **Upsert on re-import:** Update `name`, `is_active`, `metadata` when matched; create when not matched.
6. **Provider filter:** `provider === "gemini"` AND `authType === "apikey"` AND non-empty trimmed `apiKey`.
7. **Skip OAuth:** `gemini-cli` and other OAuth connections are out of scope for v1.
8. **Masked keys:** Skip connections whose `apiKey` looks masked (contains `***` or is mostly bullets); add warning to import summary.

## Architecture

```
packages/core/src/import/
├── types.ts
├── detect-import-format.ts
├── parse-native-import.ts
├── parse-9router-import.ts
└── parse-api-key-import.ts          # orchestrator: detect → parse → NormalizedImportKey[]
```

Export from `@gemini-proxy/core` via `src/import/index.ts` re-exported in package entry.

### Normalized output

All formats converge to:

```typescript
type NormalizedImportKey = {
  name: string;
  api_key_value: string;
  provider: 'googleaistudio';
  is_active: boolean;
  metadata: {
    source: '9router' | 'native' | 'legacy';
    connection_id?: string;       // 9router providerConnections[].id
    priority?: number;
    test_status?: string;
    imported_at: string;          // ISO timestamp at parse time
  };
};

type ImportParseResult = {
  format: '9router' | 'native' | 'legacy-array' | 'unknown';
  keys: NormalizedImportKey[];
  stats: {
    total_connections?: number;   // 9router only
    gemini_connections?: number;
    skipped_non_gemini?: number;
    skipped_masked?: number;
    skipped_invalid?: number;
  };
  warnings: string[];
};
```

## Format detection

| Condition | Format |
| --- | --- |
| Object with `Array.isArray(providerConnections)` | `9router` |
| Object with `Array.isArray(api_keys)` | `native` |
| Top-level JSON array | `legacy-array` |
| Else | `unknown` → throw descriptive error |

Detection runs before provider-specific parsing.

## 9router extraction rules

**Filter:**

```typescript
connection.provider === 'gemini'
  && connection.authType === 'apikey'
  && typeof connection.apiKey === 'string'
  && connection.apiKey.trim().length >= 10
  && !isMaskedApiKey(connection.apiKey)
```

**Transform:**

| 9router | gemini-proxy |
| --- | --- |
| `name` | `name` (fallback: `gemini-import-{index}`) |
| `apiKey.trim()` | `api_key_value` |
| `isActive ?? true` | `is_active` |
| `id` | `metadata.connection_id` |
| `priority`, `testStatus` | `metadata.priority`, `metadata.test_status` |
| — | `metadata.source = '9router'` |
| — | `provider = 'googleaistudio'` |

**Do not import:** trailing-space keys are trimmed; proxy pool bindings (`providerSpecificData.proxyPoolId`) are stored in metadata only if useful for debugging — not applied to gproxy routing.

Example file (14 gemini / 4 non-gemini connections): expect **14** normalized keys, **4** skipped non-gemini.

## Merge / upsert (CLI)

Extend `ApiKeysManager.importFromFile()`:

1. Parse file via core `parseApiKeyImport(jsonString)`.
2. Load existing keys from DB.
3. For each normalized key:
   - Find existing: `api_key_value` match OR `metadata->connection_id` match.
   - **Matched:** update `name`, `is_active`, merge `metadata`; count as `updated`.
   - **Not matched:** insert; count as `created`.
4. Existing CLI flags:
   - `--dry-run`: preview counts only.
   - `--skip-duplicates`: skip when **name** collides and no value/id match (legacy).
   - `--overwrite`: when name collides without value match, update instead of skip.

Default for 9router-detected imports: upsert by value / connection id (not silent skip).

## Web integration

In `apps/web/src/app/(protected)/api-keys/create/page.tsx` JSON tab:

1. Replace inline JSON parsing with core `parseApiKeyImport()`.
2. Map `NormalizedImportKey[]` → existing `ParsedApiKey` review state.
3. Show non-blocking info when `format === '9router'`: connection count + skipped summary.
4. No new tab, route, or menu item.

## CLI integration

No new commands. Extend `gproxy api-keys import <file>`:

```
Detected format: 9router
  • Gemini connections found: 14
  • Skipped (non-gemini): 4
  • Skipped (masked/invalid): 0
  • Created: 10 | Updated: 4 | Skipped: 0
```

## Error handling

| Case | Behavior |
| --- | --- |
| Invalid JSON | Throw / show parse error |
| `unknown` format | Error: unsupported import format |
| 9router with 0 gemini keys | Warning; import completes with 0 keys |
| Masked `apiKey` | Skip row; append warning |
| Empty file / empty array | Error: no keys found |

## Security

- Never commit real export files with secrets. Tests use sanitized fixtures only.
- Do not log full `api_key_value` in import summary (mask in CLI output if displayed).
- Ignore `proxyPools` credentials entirely.

## Testing

Vitest in `packages/core/test/import/`:

- `detect-import-format.test.ts`
- `parse-9router-import.test.ts` using `test/fixtures/9router-export.fixture.json` (redacted secrets)
- Cases: 14 gemini extracted, non-gemini skipped, whitespace trim, masked key skip, `is_active` false preserved, empty gemini list warning

CLI integration can reuse fixture via manual `import --dry-run` smoke test.

## Out of scope (v1)

- Export to 9router format
- Import `gemini-cli` OAuth tokens
- Import `antigravity` or other Google-adjacent providers
- Import 9router `apiKeys` (client keys)
- Proxy pool / combo / routing config migration
- Periodic bidirectional sync job

## Files to touch (implementation reference)

| Area | Files |
| --- | --- |
| Core parser | `packages/core/src/import/*`, export from `packages/core/src/index.ts` |
| Core tests | `packages/core/test/import/*`, `packages/core/test/fixtures/9router-export.fixture.json` |
| CLI | `packages/cli/package.json` (add `@gemini-proxy/core`), `packages/cli/src/lib/api-keys.ts`, `packages/cli/src/commands/api-keys.ts` |
| Web | `apps/web/src/app/(protected)/api-keys/create/page.tsx`, locale strings if needed |
