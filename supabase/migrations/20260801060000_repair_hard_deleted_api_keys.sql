-- Repair after hard-deleted api_keys (ON DELETE SET NULL already nulled FKs).
-- Ensure no dangling references remain; soft-delete columns stay intact.

-- Clear any orphan FKs that somehow survived (should be 0 with SET NULL)
UPDATE request_logs rl
SET api_key_id = NULL
WHERE api_key_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM api_keys ak WHERE ak.id = rl.api_key_id);

UPDATE request_logs rl
SET proxy_key_id = NULL
WHERE proxy_key_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM proxy_api_keys pk WHERE pk.id = rl.proxy_key_id);
