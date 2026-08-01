/**
 * PostgREST select for request log detail (modal + full page).
 * Joins key rows — soft-deleted keys still resolve names via deleted_at.
 */
export const REQUEST_LOG_DETAIL_SELECT = `
    *,
    api_keys!api_key_id(
        id,
        name,
        provider,
        is_active,
        deleted_at,
        user_id,
        created_at,
        last_used_at,
        success_count,
        failure_count,
        total_tokens,
        prompt_tokens,
        completion_tokens
    ),
    proxy_api_keys!proxy_key_id(
        id,
        name,
        is_active,
        deleted_at,
        user_id,
        created_at,
        last_used_at,
        success_count,
        failure_count,
        total_tokens,
        prompt_tokens,
        completion_tokens
    )
`
    .replace(/\s+/g, ' ')
    .trim();

/** List / live-feed columns with key joins. */
export const REQUEST_LOG_LIST_SELECT =
    'id, request_id, api_format, is_stream, is_successful, performance_metrics, usage_metadata, retry_attempts, user_id, created_at, api_key_id, proxy_key_id, api_keys(id,name,deleted_at), proxy_api_keys(id,name,deleted_at)';
