# 9router Import Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect 9router database export JSON in existing API key import flows (CLI + Web) and import only Gemini upstream keys into gemini-proxy.

**Architecture:** Shared parser module in `@gemini-proxy/core` normalizes all import formats to `NormalizedImportKey[]`. CLI `ApiKeysManager.importFromFile` and Web create-page JSON tab call the same orchestrator. Export unchanged (native gproxy only).

**Tech Stack:** TypeScript, Vitest, Commander (CLI), Next.js/Refine (Web), Supabase.

## Global Constraints

- Import filter: `provider === "gemini"` AND `authType === "apikey"` only.
- Match upsert: primary `api_key_value` (trimmed), fallback `metadata.connection_id`.
- Sync `is_active` from 9router `isActive`; import inactive keys too.
- Skip masked keys (`***` / bullet masking); add warnings, do not fail whole import.
- No 9router export; no dedicated Web tab.
- Never commit real API keys in fixtures.

---

## File map

| File | Responsibility |
| --- | --- |
| `packages/core/src/import/types.ts` | Shared types |
| `packages/core/src/import/detect-import-format.ts` | Format detection |
| `packages/core/src/import/is-masked-api-key.ts` | Masked key heuristic |
| `packages/core/src/import/parse-9router-import.ts` | Extract gemini connections |
| `packages/core/src/import/parse-native-import.ts` | Existing gproxy export format |
| `packages/core/src/import/parse-legacy-array-import.ts` | Array of strings/objects |
| `packages/core/src/import/parse-api-key-import.ts` | Orchestrator |
| `packages/core/src/import/index.ts` | Barrel export |
| `packages/core/src/index.ts` | Re-export import module |
| `packages/core/test/fixtures/9router-export.fixture.json` | Sanitized sample |
| `packages/core/test/import/*.test.ts` | Unit tests |
| `packages/cli/package.json` | Add `@gemini-proxy/core` workspace dep |
| `packages/cli/src/lib/api-keys.ts` | Use core parser + upsert logic |
| `packages/cli/src/commands/api-keys.ts` | Print 9router stats summary |
| `apps/web/src/app/(protected)/api-keys/create/page.tsx` | Use core parser in JSON tab |

---

### Task 1: Core import types and format detection

**Files:**
- Create: `packages/core/src/import/types.ts`
- Create: `packages/core/src/import/detect-import-format.ts`
- Create: `packages/core/src/import/is-masked-api-key.ts`
- Create: `packages/core/src/import/index.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/import/detect-import-format.test.ts`

**Interfaces:**
- Produces:
  - `type ImportFormat = '9router' | 'native' | 'legacy-array' | 'unknown'`
  - `type NormalizedImportKey`, `ImportParseResult`, `NineRouterConnection`
  - `detectImportFormat(input: unknown): ImportFormat`
  - `isMaskedApiKey(value: string): boolean`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/core/test/import/detect-import-format.test.ts
import { describe, expect, it } from 'vitest';
import { detectImportFormat } from '../../src/import/detect-import-format';
import { isMaskedApiKey } from '../../src/import/is-masked-api-key';

describe('detectImportFormat', () => {
  it('detects 9router export', () => {
    expect(detectImportFormat({ providerConnections: [] })).toBe('9router');
  });
  it('detects native export', () => {
    expect(detectImportFormat({ api_keys: [] })).toBe('native');
  });
  it('detects legacy array', () => {
    expect(detectImportFormat([{ key: 'x' }])).toBe('legacy-array');
  });
  it('returns unknown for invalid input', () => {
    expect(detectImportFormat('bad')).toBe('unknown');
  });
});

describe('isMaskedApiKey', () => {
  it('detects asterisk masking', () => {
    expect(isMaskedApiKey('AIzaSy****abcd')).toBe(true);
  });
  it('allows real keys', () => {
    expect(isMaskedApiKey('AIzaSyTESTKEY000000000000000000000')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @gemini-proxy/core test`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement types and detection**

```typescript
// packages/core/src/import/types.ts
export type ImportFormat = '9router' | 'native' | 'legacy-array' | 'unknown';

export type NormalizedImportKey = {
  name: string;
  api_key_value: string;
  provider: 'googleaistudio';
  is_active: boolean;
  metadata: {
    source: '9router' | 'native' | 'legacy';
    connection_id?: string;
    priority?: number;
    test_status?: string;
    imported_at: string;
  };
};

export type ImportParseResult = {
  format: ImportFormat;
  keys: NormalizedImportKey[];
  stats: {
    total_connections?: number;
    gemini_connections?: number;
    imported_keys?: number;
    skipped_unsupported?: number;
    skipped_masked?: number;
    skipped_invalid?: number;
  };
  warnings: string[];
};

export type NineRouterConnection = {
  id?: string;
  provider?: string;
  authType?: string;
  name?: string | null;
  apiKey?: string;
  isActive?: boolean;
  priority?: number;
  testStatus?: string;
};
```

```typescript
// packages/core/src/import/detect-import-format.ts
import type { ImportFormat } from './types';

export function detectImportFormat(input: unknown): ImportFormat {
  if (Array.isArray(input)) return 'legacy-array';
  if (!input || typeof input !== 'object') return 'unknown';
  const record = input as Record<string, unknown>;
  if (Array.isArray(record.providerConnections)) return '9router';
  if (Array.isArray(record.api_keys)) return 'native';
  return 'unknown';
}
```

```typescript
// packages/core/src/import/is-masked-api-key.ts
export function isMaskedApiKey(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.includes('***')) return true;
  if (/^[\s*•·]+$/.test(trimmed)) return true;
  const visible = trimmed.replace(/[*•·\s]/g, '');
  return visible.length < 10;
}
```

```typescript
// packages/core/src/import/index.ts
export * from './types';
export * from './detect-import-format';
export * from './is-masked-api-key';
```

Add `export * from './import';` to `packages/core/src/index.ts`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @gemini-proxy/core test`
Expected: PASS for detect tests

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/import packages/core/test/import packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): add import format detection for 9router

- Shared ImportFormat and NormalizedImportKey types
- detectImportFormat and isMaskedApiKey helpers
EOF
)"
```

---

### Task 2: 9router parser + sanitized fixture

**Files:**
- Create: `packages/core/src/import/parse-9router-import.ts`
- Create: `packages/core/test/fixtures/9router-export.fixture.json`
- Test: `packages/core/test/import/parse-9router-import.test.ts`

**Interfaces:**
- Consumes: `NineRouterConnection`, `isMaskedApiKey`, `NormalizedImportKey`
- Produces: `parseNineRouterImport(input: unknown, importedAt?: string): ImportParseResult`

- [ ] **Step 1: Add sanitized fixture**

Create `packages/core/test/fixtures/9router-export.fixture.json` with structure from real export but fake keys:
- 3 `provider: "gemini"` connections (1 inactive, 1 with trailing spaces, 1 masked)
- 2 non-gemini connections (`nvidia`, `openai-compatible-*`)
- Empty `apiKeys` array (must not be imported)

- [ ] **Step 2: Write failing tests**

```typescript
// packages/core/test/import/parse-9router-import.test.ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNineRouterImport } from '../../src/import/parse-9router-import';

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../fixtures/9router-export.fixture.json'), 'utf-8'),
);

describe('parseNineRouterImport', () => {
  it('extracts only gemini apikey connections', () => {
    const result = parseNineRouterImport(fixture, '2026-08-30T00:00:00.000Z');
    expect(result.format).toBe('9router');
    expect(result.keys).toHaveLength(2);
    expect(result.stats.gemini_connections).toBe(3);
    expect(result.stats.imported_keys).toBe(2);
    expect(result.stats.skipped_unsupported).toBe(2);
    expect(result.stats.skipped_masked).toBe(1);
  });

  it('trims api key whitespace', () => {
    const result = parseNineRouterImport(fixture);
    const spaced = result.keys.find((k) => k.name === 'spaced-key');
    expect(spaced?.api_key_value).toBe('AIzaSyTESTKEY000000000000000000000');
  });

  it('preserves is_active false', () => {
    const result = parseNineRouterImport(fixture);
    const inactive = result.keys.find((k) => k.name === 'inactive-key');
    expect(inactive?.is_active).toBe(false);
  });

  it('stores connection_id in metadata', () => {
    const result = parseNineRouterImport(fixture);
    expect(result.keys[0]?.metadata.connection_id).toBeDefined();
    expect(result.keys[0]?.metadata.source).toBe('9router');
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

- [ ] **Step 4: Implement parser**

```typescript
// packages/core/src/import/parse-9router-import.ts
import { isMaskedApiKey } from './is-masked-api-key';
import type { ImportParseResult, NineRouterConnection, NormalizedImportKey } from './types';

const GEMINI_PROVIDER = 'gemini';
const MIN_KEY_LENGTH = 10;

export function parseNineRouterImport(
  input: unknown,
  importedAt: string = new Date().toISOString(),
): ImportParseResult {
  const record = input as { providerConnections?: NineRouterConnection[] };
  const connections = record.providerConnections ?? [];
  const warnings: string[] = [];
  const keys: NormalizedImportKey[] = [];
  let geminiConnections = 0;
  let skippedUnsupported = 0;
  let skippedMasked = 0;
  let skippedInvalid = 0;

  connections.forEach((connection, index) => {
    if (connection.provider !== GEMINI_PROVIDER || connection.authType !== 'apikey') {
      skippedUnsupported += 1;
      return;
    }
    geminiConnections += 1;
    const rawKey = typeof connection.apiKey === 'string' ? connection.apiKey : '';
    const apiKeyValue = rawKey.trim();
    if (apiKeyValue.length < MIN_KEY_LENGTH) {
      skippedInvalid += 1;
      warnings.push(`Skipped gemini connection ${connection.id ?? index}: missing apiKey`);
      return;
    }
    if (isMaskedApiKey(apiKeyValue)) {
      skippedMasked += 1;
      warnings.push(`Skipped gemini connection ${connection.id ?? index}: masked apiKey`);
      return;
    }
    keys.push({
      name: connection.name?.trim() || `gemini-import-${index + 1}`,
      api_key_value: apiKeyValue,
      provider: 'googleaistudio',
      is_active: connection.isActive !== false,
      metadata: {
        source: '9router',
        connection_id: connection.id,
        priority: connection.priority,
        test_status: connection.testStatus,
        imported_at: importedAt,
      },
    });
  });

  if (connections.some((c) => c.provider === GEMINI_PROVIDER) && keys.length === 0) {
    warnings.push('No importable Gemini API keys found in 9router export');
  }

  return {
    format: '9router',
    keys,
    stats: {
      total_connections: connections.length,
      gemini_connections: geminiConnections,
      imported_keys: keys.length,
      skipped_unsupported: skippedUnsupported,
      skipped_masked: skippedMasked,
      skipped_invalid: skippedInvalid,
    },
    warnings,
  };
}
```

Export from `packages/core/src/import/index.ts`.

- [ ] **Step 5: Run tests — expect PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/import/parse-9router-import.ts packages/core/test/
git commit -m "$(cat <<'EOF'
feat(core): parse gemini keys from 9router export

- Filter providerConnections for gemini/apikey only
- Trim keys, skip masked, preserve is_active and connection_id
EOF
)"
```

---

### Task 3: Native + legacy parsers and orchestrator

**Files:**
- Create: `packages/core/src/import/parse-native-import.ts`
- Create: `packages/core/src/import/parse-legacy-array-import.ts`
- Create: `packages/core/src/import/parse-api-key-import.ts`
- Test: `packages/core/test/import/parse-api-key-import.test.ts`

**Interfaces:**
- Produces: `parseApiKeyImport(raw: string): ImportParseResult`

- [ ] **Step 1: Write failing orchestrator tests**

Cover: native `{ api_keys: [...] }`, legacy `[{ key: '...' }]`, invalid JSON throws, unknown object throws.

- [ ] **Step 2: Implement native + legacy parsers**

Native maps existing CLI export shape (`name`, `api_key_value`, `provider`, `is_active`, `metadata`).

Legacy array accepts string entries or objects with `key` / `apiKey` / `api_key_value` (same as Web today).

- [ ] **Step 3: Implement orchestrator**

```typescript
// packages/core/src/import/parse-api-key-import.ts
import { detectImportFormat } from './detect-import-format';
import { parseLegacyArrayImport } from './parse-legacy-array-import';
import { parseNativeImport } from './parse-native-import';
import { parseNineRouterImport } from './parse-9router-import';
import type { ImportParseResult } from './types';

export function parseApiKeyImport(raw: string): ImportParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON import file');
  }
  const format = detectImportFormat(parsed);
  switch (format) {
    case '9router':
      return parseNineRouterImport(parsed);
    case 'native':
      return parseNativeImport(parsed);
    case 'legacy-array':
      return parseLegacyArrayImport(parsed);
    default:
      throw new Error('Unsupported import file format');
  }
}
```

- [ ] **Step 4: Run all core import tests**

Run: `pnpm --filter @gemini-proxy/core test`

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(core): add parseApiKeyImport orchestrator

- Route 9router, native, and legacy-array formats through one entry
EOF
)"
```

---

### Task 4: CLI integration

**Files:**
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/lib/api-keys.ts`
- Modify: `packages/cli/src/commands/api-keys.ts`

**Interfaces:**
- Consumes: `parseApiKeyImport` from `@gemini-proxy/core`

- [ ] **Step 1: Add workspace dependency**

```json
"@gemini-proxy/core": "workspace:*"
```

Run: `pnpm install` at repo root.

- [ ] **Step 2: Refactor `importFromFile`**

Replace inline JSON parse with `parseApiKeyImport(fileContent)`.

Upsert logic:
```typescript
function findExistingKey(existing: ApiKey[], incoming: NormalizedImportKey): ApiKey | undefined {
  return existing.find(
    (k) =>
      k.api_key_value === incoming.api_key_value
      || (incoming.metadata.connection_id
        && k.metadata?.connection_id === incoming.metadata.connection_id),
  );
}
```

On match: update `name`, `is_active`, merge `metadata`.
On no match: create with `user_id`.

Return extended result: `{ ..., format, stats, warnings }`.

- [ ] **Step 3: Update import command output**

Print format + 9router stats when applicable; print warnings list.

- [ ] **Step 4: Manual smoke test**

```bash
pnpm --filter @lehuygiang28/gemini-proxy-cli build
gproxy api-keys import packages/core/test/fixtures/9router-export.fixture.json --dry-run
```

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(cli): import gemini keys from 9router export

- Use shared parseApiKeyImport from core
- Upsert by api_key_value or metadata.connection_id
- Print 9router import stats and warnings
EOF
)"
```

---

### Task 5: Web integration

**Files:**
- Modify: `apps/web/package.json` (add `"@gemini-proxy/core": "workspace:*"` if bundler requires)
- Modify: `apps/web/src/app/(protected)/api-keys/create/page.tsx`
- Modify: `apps/web/public/locales/en/common.json`
- Modify: `apps/web/public/locales/vi/common.json`

- [ ] **Step 1: Replace JSON tab parsing**

In `parseKeysFromInput`, when `activeTab === 'json'`:
```typescript
import { parseApiKeyImport } from '@gemini-proxy/core';

const result = parseApiKeyImport(values.json_keys);
// map result.keys → ParsedApiKey[]
// store result.format / result.stats for info Alert in review step
```

- [ ] **Step 2: Show 9router summary in review step**

If `format === '9router'`, render `Alert` type="info" with gemini count + skipped counts (i18n keys).

- [ ] **Step 3: Run web tests / lint**

Run: `pnpm --filter web test` and `pnpm --filter web lint`

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web): auto-detect 9router format in API key JSON import

- Reuse core parseApiKeyImport in create page
- Show import summary when 9router export detected
EOF
)"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run full core test suite**

`pnpm --filter @gemini-proxy/core test`

- [ ] **Step 2: Build CLI**

`pnpm --filter @lehuygiang28/gemini-proxy-cli build`

- [ ] **Step 3: Dry-run import against fixture**

Confirm created/updated counts and warnings.

- [ ] **Step 4: Commit any locale parity fixes if needed**

---

## Plan self-review (spec coverage)

| Spec requirement | Task |
| --- | --- |
| Shared parser in core | Tasks 1–3 |
| Auto-detect, no new tab | Tasks 3, 5 |
| Filter gemini/apikey only | Task 2 |
| Skip masked keys | Tasks 1–2 |
| Sync is_active | Task 2 |
| Upsert by value + connection_id | Task 4 |
| Native export unchanged | No export task (by design) |
| CLI + Web | Tasks 4–5 |
| Sanitized fixture + tests | Tasks 2–3 |
| Security: no real secrets in repo | Task 2 fixture |

No placeholders remain.
