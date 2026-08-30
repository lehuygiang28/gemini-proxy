## fix(import): preserve valid API key imports

**Commit:** `b2ad7f3`

### Changes

- Native and legacy imports with no usable keys now fail clearly; 9router exports instead return a warning when no Gemini key is importable.
- Masked API keys now detect proportional bullet masking (`•`, `·`), and legacy imports accept `value` as a key field.
- The web creation flow retains imported `is_active` and `metadata`; CLI upsert helpers now have executable unit coverage.

### Verification

```bash
pnpm --filter @gemini-proxy/core test
pnpm --filter @lehuygiang28/gemini-proxy-cli test
pnpm --filter @lehuygiang28/gemini-proxy-cli build
pnpm --filter web test
pnpm --filter web lint
```

All commands passed. Web lint continues to report one pre-existing warning in `proxy-quick-start.tsx`.
