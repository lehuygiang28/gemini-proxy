export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export {
    v1GET as GET,
    v1POST as POST,
    v1PUT as PUT,
    v1DELETE as DELETE,
    v1PATCH as PATCH,
    v1OPTIONS as OPTIONS,
    v1HEAD as HEAD,
} from '@gemini-proxy/vercel';
