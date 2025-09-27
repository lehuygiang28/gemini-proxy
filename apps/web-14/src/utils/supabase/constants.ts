if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

if (!process.env.NEXT_PUBLIC_ANON_SUPABASE_KEY) {
    throw new Error('NEXT_PUBLIC_ANON_SUPABASE_KEY is not set');
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_ANON_SUPABASE_KEY;
