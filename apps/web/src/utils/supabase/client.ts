import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@gemini-proxy/database';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './constants';

export const supabaseBrowserClient = createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        db: {
            schema: 'public',
        },
    },
);
