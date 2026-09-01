import { describe, expect, it } from 'vitest';
import {
    getLandingSnippet,
    listLandingLanguages,
    resolveLandingLanguage,
} from './landing-snippets';

const CLIENTS = ['google', 'openai', 'vercel'] as const;

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
        expect(getLandingSnippet({ client: 'vercel', language: 'python' })).toBeNull();
    });

    it('shows a TypeScript import and the canonical /v1 base URL', () => {
        const actual = getLandingSnippet({ client: 'google', language: 'typescript' });
        expect(actual).not.toBeNull();
        expect(actual?.prismLanguage).toBe('typescript');
        expect(actual?.code).toContain("import { GoogleGenAI } from '@google/genai'");
        expect(actual?.code).toContain("baseUrl: 'https://your-proxy-endpoint/v1'");
        expect(actual?.code).toContain('gemini-3.7-flash');
    });

    it('uses catalog model ids from 3.7, 3.6, 3.5, and gemma-4 across snippets', () => {
        const codes = CLIENTS.flatMap((client) =>
            listLandingLanguages(client).map(
                (language) => getLandingSnippet({ client, language })?.code ?? '',
            ),
        );
        const joined = codes.join('\n');
        expect(joined).toContain('gemini-3.7-flash');
        expect(joined).toContain('gemini-3.6-flash');
        expect(joined).toContain('gemini-3.5-flash');
        expect(joined).toContain('gemma-4-31b-it');
        expect(joined).not.toMatch(/gemini-2\./);
    });

    it('never advertises legacy /api/gproxy paths', () => {
        for (const client of CLIENTS) {
            for (const language of listLandingLanguages(client)) {
                const actual = getLandingSnippet({ client, language });
                expect(actual?.code).toContain('https://your-proxy-endpoint/v1');
                expect(actual?.code).not.toContain('/api/gproxy');
            }
        }
        expect.assertions(14);
    });

    it('keeps full import statements in SDK snippets', () => {
        expect(getLandingSnippet({ client: 'google', language: 'typescript' })?.code).toMatch(
            /^import \{ GoogleGenAI \} from '@google\/genai';/,
        );
        expect(getLandingSnippet({ client: 'google', language: 'python' })?.code).toMatch(
            /^from google import genai/,
        );
        expect(getLandingSnippet({ client: 'openai', language: 'typescript' })?.code).toMatch(
            /^import OpenAI from 'openai';/,
        );
        expect(getLandingSnippet({ client: 'openai', language: 'python' })?.code).toMatch(
            /^from openai import OpenAI/,
        );
        expect(getLandingSnippet({ client: 'vercel', language: 'typescript' })?.code).toContain(
            "import { generateText } from 'ai'",
        );
        expect(getLandingSnippet({ client: 'vercel', language: 'typescript' })?.code).toContain(
            "import { createGoogleGenerativeAI } from '@ai-sdk/google'",
        );
    });

    it('maps prism languages for Python and curl', () => {
        expect(getLandingSnippet({ client: 'google', language: 'python' })?.prismLanguage).toBe(
            'python',
        );
        expect(getLandingSnippet({ client: 'openai', language: 'curl' })?.prismLanguage).toBe(
            'bash',
        );
    });

    it('uses goog header on Google curl and Bearer on OpenAI curl', () => {
        const googleCurl = getLandingSnippet({ client: 'google', language: 'curl' })?.code ?? '';
        const openaiCurl = getLandingSnippet({ client: 'openai', language: 'curl' })?.code ?? '';
        expect(googleCurl).toContain('x-goog-api-key');
        expect(googleCurl).not.toContain('Authorization');
        expect(openaiCurl).toContain('Authorization: Bearer');
        expect(openaiCurl).toContain('/v1/chat/completions');
        expect(openaiCurl).not.toContain('x-goog-api-key');
    });
});
