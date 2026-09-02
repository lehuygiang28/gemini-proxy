export type LandingClient = 'google' | 'openai' | 'vercel';
export type LandingLanguage = 'typescript' | 'python' | 'curl';

export type LandingSnippet = {
    code: string;
    prismLanguage: 'typescript' | 'python' | 'bash';
};

type SnippetTemplate = {
    prismLanguage: LandingSnippet['prismLanguage'];
    code: (baseUrl: string) => string;
};

const SNIPPETS: Record<LandingClient, Partial<Record<LandingLanguage, SnippetTemplate>>> = {
    google: {
        typescript: {
            prismLanguage: 'typescript',
            code: (baseUrl) => `import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    httpOptions: {
        baseUrl: '${baseUrl}',
    },
});

const response = await ai.models.generateContent({
    model: 'gemini-3.7-flash',
    contents: 'Hello',
});

console.log(response.text);`,
        },
        python: {
            prismLanguage: 'python',
            code: (baseUrl) => `from google import genai
from google.genai import types

client = genai.Client(
    api_key="YOUR_PROXY_API_KEY",
    http_options=types.HttpOptions(
        base_url="${baseUrl}",
    ),
)

response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents="Hello",
)
print(response.text)`,
        },
        curl: {
            prismLanguage: 'bash',
            code: (baseUrl) => `curl "${baseUrl}/models/gemini-3.5-flash:generateContent" \\
  -H "Content-Type: application/json" \\
  -H "x-goog-api-key: $GEMINI_PROXY_API_KEY" \\
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}]
  }'`,
        },
    },
    openai: {
        typescript: {
            prismLanguage: 'typescript',
            code: (baseUrl) => `import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: '${baseUrl}',
});

const completion = await openai.chat.completions.create({
    model: 'gemini-3.7-flash',
    messages: [{ role: 'user', content: 'Hello' }],
});

console.log(completion.choices[0]?.message.content);`,
        },
        python: {
            prismLanguage: 'python',
            code: (baseUrl) => `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_PROXY_API_KEY",
    base_url="${baseUrl}",
)

completion = client.chat.completions.create(
    model="gemma-4-31b-it",
    messages=[{"role": "user", "content": "Hello"}],
)
print(completion.choices[0].message.content)`,
        },
        curl: {
            prismLanguage: 'bash',
            code: (baseUrl) => `curl "${baseUrl}/chat/completions" \\
  -H "Authorization: Bearer $GEMINI_PROXY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-3.5-flash",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
        },
    },
    vercel: {
        typescript: {
            prismLanguage: 'typescript',
            code: (baseUrl) => `import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: '${baseUrl}',
});

const { text } = await generateText({
    model: google('gemini-3.7-flash'),
    prompt: 'Hello',
});

console.log(text);`,
        },
    },
};

/**
 * Builds `{origin}/v1` for landing examples.
 */
export function landingV1BaseUrl(origin: string): string {
    return `${origin.trim().replace(/\/+$/, '')}/v1`;
}

/**
 * Resolves the public origin from request headers (Host / forwarded).
 */
export function originFromRequestHeaders(headersList: {
    get(name: string): string | null;
}): string {
    const forwardedHost = headersList.get('x-forwarded-host');
    const host = (forwardedHost ?? headersList.get('host') ?? 'localhost')
        .split(',')[0]
        ?.trim()
        .replace(/\/+$/, '');
    const forwardedProto = headersList.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const isLocal =
        host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
    const proto = forwardedProto ?? (isLocal ? 'http' : 'https');
    return `${proto}://${host}`;
}

/**
 * Returns language tabs available for a client. Vercel AI SDK is TypeScript-only.
 */
export function listLandingLanguages(client: LandingClient): LandingLanguage[] {
    const entry = SNIPPETS[client];
    return (['typescript', 'python', 'curl'] as const).filter((language) =>
        Boolean(entry[language]),
    );
}

/**
 * Keeps the current language when the next client supports it; otherwise TypeScript.
 */
export function resolveLandingLanguage(input: {
    client: LandingClient;
    language: LandingLanguage;
}): LandingLanguage {
    const supported = listLandingLanguages(input.client);
    if (supported.includes(input.language)) {
        return input.language;
    }
    return 'typescript';
}

/**
 * Returns the copyable snippet for a client/language pair, or null if unsupported.
 */
export function getLandingSnippet(input: {
    client: LandingClient;
    language: LandingLanguage;
    origin: string;
}): LandingSnippet | null {
    const template = SNIPPETS[input.client][input.language];
    if (!template) {
        return null;
    }
    return {
        prismLanguage: template.prismLanguage,
        code: template.code(landingV1BaseUrl(input.origin)),
    };
}
