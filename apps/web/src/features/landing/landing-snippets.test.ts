import { describe, expect, it } from 'vitest';
import {
    getLandingSnippet,
    landingV1BaseUrl,
    listLandingLanguages,
    originFromRequestHeaders,
    resolveLandingLanguage,
} from './landing-snippets';

const CLIENTS = ['google', 'openai', 'vercel'] as const;
const ORIGIN = 'https://proxy.example.com';
const BASE = 'https://proxy.example.com/v1';

describe('landingV1BaseUrl', () => {
    it('appends /v1 and strips a trailing slash on origin', () => {
        expect(landingV1BaseUrl('https://proxy.example.com/')).toBe(BASE);
        expect(landingV1BaseUrl('http://127.0.0.1:4040')).toBe('http://127.0.0.1:4040/v1');
    });
});

describe('originFromRequestHeaders', () => {
    it('prefers forwarded host and proto', () => {
        const headers = new Map([
            ['host', 'localhost:4040'],
            ['x-forwarded-host', 'gemini-proxy.example'],
            ['x-forwarded-proto', 'https'],
        ]);
        expect(originFromRequestHeaders({ get: (name) => headers.get(name) ?? null })).toBe(
            'https://gemini-proxy.example',
        );
    });

    it('uses http for localhost when proto is missing', () => {
        const headers = new Map([['host', '127.0.0.1:4040']]);
        expect(originFromRequestHeaders({ get: (name) => headers.get(name) ?? null })).toBe(
            'http://127.0.0.1:4040',
        );
    });
});

describe('listLandingLanguages', () => {
    it('offers TypeScript, Python, and curl for Google and OpenAI', () => {
        expect(listLandingLanguages('google')).toEqual(['typescript', 'python', 'curl']);
        expect(listLandingLanguages('openai')).toEqual(['typescript', 'python', 'curl']);
    });

    it('offers only TypeScript for Vercel AI SDK', () => {
        expect(listLandingLanguages('vercel')).toEqual(['typescript']);
    });
});

describe('resolveLandingLanguage', () => {
    it('keeps Python when switching from Google to OpenAI', () => {
        expect(resolveLandingLanguage({ client: 'openai', language: 'python' })).toBe('python');
    });

    it('falls back to TypeScript when Vercel does not support Python', () => {
        expect(resolveLandingLanguage({ client: 'vercel', language: 'python' })).toBe('typescript');
    });
});

describe('getLandingSnippet', () => {
    it('returns null for Vercel plus Python', () => {
        expect(
            getLandingSnippet({ client: 'vercel', language: 'python', origin: ORIGIN }),
        ).toBeNull();
    });

    it('shows a TypeScript import and the request origin /v1 base URL', () => {
        const actual = getLandingSnippet({
            client: 'google',
            language: 'typescript',
            origin: ORIGIN,
        });
        expect(actual).not.toBeNull();
        expect(actual?.prismLanguage).toBe('typescript');
        expect(actual?.code).toContain("import { GoogleGenAI } from '@google/genai'");
        expect(actual?.code).toContain(`baseUrl: '${BASE}'`);
        expect(actual?.code).toContain('gemini-3.7-flash');
        expect(actual?.code).not.toContain('your-proxy-endpoint');
    });

    it('uses catalog model ids from 3.7, 3.6, 3.5, and gemma-4 across snippets', () => {
        const codes = CLIENTS.flatMap((client) =>
            listLandingLanguages(client).map(
                (language) => getLandingSnippet({ client, language, origin: ORIGIN })?.code ?? '',
            ),
        );
        const joined = codes.join('\n');
        expect(joined).toContain('gemini-3.7-flash');
        expect(joined).toContain('gemini-3.6-flash');
        expect(joined).toContain('gemini-3.5-flash');
        expect(joined).toContain('gemma-4-31b-it');
        expect(joined).not.toMatch(/gemini-2\./);
    });

    it('uses the live origin /v1 path and never advertises legacy /api/gproxy', () => {
        for (const client of CLIENTS) {
            for (const language of listLandingLanguages(client)) {
                const actual = getLandingSnippet({ client, language, origin: ORIGIN });
                expect(actual?.code).toContain(BASE);
                expect(actual?.code).not.toContain('/api/gproxy');
                expect(actual?.code).not.toContain('your-proxy-endpoint');
            }
        }
        expect.assertions(21);
    });

    it('keeps full import statements in SDK snippets', () => {
        expect(
            getLandingSnippet({ client: 'google', language: 'typescript', origin: ORIGIN })?.code,
        ).toMatch(/^import \{ GoogleGenAI \} from '@google\/genai';/);
        expect(
            getLandingSnippet({ client: 'google', language: 'python', origin: ORIGIN })?.code,
        ).toMatch(/^from google import genai/);
        expect(
            getLandingSnippet({ client: 'openai', language: 'typescript', origin: ORIGIN })?.code,
        ).toMatch(/^import OpenAI from 'openai';/);
        expect(
            getLandingSnippet({ client: 'openai', language: 'python', origin: ORIGIN })?.code,
        ).toMatch(/^from openai import OpenAI/);
        expect(
            getLandingSnippet({ client: 'vercel', language: 'typescript', origin: ORIGIN })?.code,
        ).toContain("import { generateText } from 'ai'");
        expect(
            getLandingSnippet({ client: 'vercel', language: 'typescript', origin: ORIGIN })?.code,
        ).toContain("import { createGoogleGenerativeAI } from '@ai-sdk/google'");
    });

    it('maps prism languages for Python and curl', () => {
        expect(
            getLandingSnippet({ client: 'google', language: 'python', origin: ORIGIN })
                ?.prismLanguage,
        ).toBe('python');
        expect(
            getLandingSnippet({ client: 'openai', language: 'curl', origin: ORIGIN })
                ?.prismLanguage,
        ).toBe('bash');
    });

    it('uses goog header on Google curl and Bearer on OpenAI curl', () => {
        const googleCurl =
            getLandingSnippet({ client: 'google', language: 'curl', origin: ORIGIN })?.code ?? '';
        const openaiCurl =
            getLandingSnippet({ client: 'openai', language: 'curl', origin: ORIGIN })?.code ?? '';
        expect(googleCurl).toContain('x-goog-api-key');
        expect(googleCurl).not.toContain('Authorization');
        expect(openaiCurl).toContain('Authorization: Bearer');
        expect(openaiCurl).toContain('/v1/chat/completions');
        expect(openaiCurl).not.toContain('x-goog-api-key');
    });
});
