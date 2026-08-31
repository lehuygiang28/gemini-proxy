import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { serve } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { vi } from 'vitest';
import OpenAI from 'openai';
import { coreApp } from '../../src/app';
import { setSupabaseFactoryForTests } from '../../src/services/supabase.service';
import {
    CONTRACT_PROXY_KEY,
    createContractEnv,
    createExecutionCtx,
    createMockSupabase,
    originRequests,
    resetContractHarness,
} from '../proxy-contract/harness';

const GEMINI_ORIGIN_BODY = {
    candidates: [
        {
            content: {
                role: 'model',
                parts: [{ text: 'sdk-smoke-ok' }],
            },
            finishReason: 'STOP',
            index: 0,
        },
    ],
    usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 4,
        totalTokenCount: 12,
    },
};

const OPENAI_ORIGIN_BODY = {
    id: 'chatcmpl-sdk-smoke',
    object: 'chat.completion',
    created: 1_700_000_000,
    model: 'gemini-flash',
    choices: [
        {
            index: 0,
            message: { role: 'assistant', content: 'sdk-smoke-ok' },
            finish_reason: 'stop',
        },
    ],
    usage: {
        prompt_tokens: 8,
        completion_tokens: 4,
        total_tokens: 12,
    },
};

const realFetch = globalThis.fetch.bind(globalThis);

function toRequest(input: RequestInfo | URL, init?: RequestInit): Request {
    return input instanceof Request ? input : new Request(input, init);
}

function isOriginUrl(url: string): boolean {
    return url.startsWith('https://origin.test');
}

describe('SDK smoke', () => {
    let server: ServerType;
    let baseUrl: string;
    const previousEnv: Record<string, string | undefined> = {};

    beforeAll(async () => {
        const contractEnv = createContractEnv();
        for (const [key, value] of Object.entries(contractEnv)) {
            previousEnv[key] = process.env[key];
            process.env[key] = value;
        }

        setSupabaseFactoryForTests(() => createMockSupabase());
        vi.stubGlobal(
            'fetch',
            async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
                const request = toRequest(input, init);
                if (isOriginUrl(request.url)) {
                    originRequests.push(request);
                    const isOpenAi =
                        request.url.includes('/openai/') ||
                        request.url.includes('chat/completions');
                    return new Response(
                        JSON.stringify(isOpenAi ? OPENAI_ORIGIN_BODY : GEMINI_ORIGIN_BODY),
                        {
                            status: 200,
                            headers: { 'content-type': 'application/json' },
                        },
                    );
                }
                return realFetch(input, init);
            },
        );

        const wrapped = new Hono().basePath('/api/gproxy').route('/', coreApp);
        server = await new Promise<ServerType>((resolve) => {
            const created = serve(
                {
                    fetch: (request) => wrapped.fetch(request, contractEnv, createExecutionCtx()),
                    port: 0,
                },
                () => resolve(created),
            );
        });
        const address = server.address();
        if (!address || typeof address === 'string') {
            throw new Error('loopback server did not bind a TCP port');
        }
        baseUrl = `http://127.0.0.1:${address.port}/api/gproxy`;
    });

    afterEach(() => {
        originRequests.length = 0;
    });

    afterAll(() => {
        server.close();
        for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
        resetContractHarness();
    });

    it('reaches the proxy with the OpenAI SDK', async () => {
        const openai = new OpenAI({
            baseURL: `${baseUrl}/openai`,
            apiKey: CONTRACT_PROXY_KEY,
        });
        const completion = await openai.chat.completions.create({
            model: 'gemini-flash',
            messages: [{ role: 'user', content: 'ping' }],
        });
        expect(completion.choices[0]?.message?.content).toBe('sdk-smoke-ok');
        expect(originRequests.length).toBeGreaterThan(0);
    });

    it('reaches the proxy with the Google GenAI SDK', async () => {
        const { GoogleGenAI } = await import('@google/genai');
        const genAi = new GoogleGenAI({
            apiKey: CONTRACT_PROXY_KEY,
            httpOptions: { baseUrl: `${baseUrl}/gemini` },
        });
        const response = await genAi.models.generateContent({
            model: 'gemini-flash',
            contents: 'ping',
        });
        expect(response.text).toContain('sdk-smoke-ok');
        expect(originRequests.length).toBeGreaterThan(0);
    });

    it('reaches the proxy with the Vercel AI SDK', async () => {
        const { generateText } = await import('ai');
        const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const google = createGoogleGenerativeAI({
            apiKey: CONTRACT_PROXY_KEY,
            baseURL: `${baseUrl}/gemini/v1beta`,
        });
        const { text } = await generateText({
            model: google('gemini-flash'),
            prompt: 'ping',
        });
        expect(text).toContain('sdk-smoke-ok');
        expect(originRequests.length).toBeGreaterThan(0);
    });
});
