# Legacy migration path (retired)

Schema changes are managed with the official Supabase CLI at the repo root:

- Migrations: [`supabase/migrations/`](../../../supabase/migrations/)
- Apply to your cloud project: `pnpm db:apply` (from repo root)
- SQL Editor fallback: [`../schema.sql`](../schema.sql)

Do not add new files here. Use `npx supabase migration new <name>` from the repo root.
