export type LandingClient = 'google' | 'openai' | 'vercel';
export type LandingLanguage = 'typescript' | 'python' | 'curl';

export type LandingSnippet = {
    code: string;
    prismLanguage: 'typescript' | 'python' | 'bash';
};

const CANONICAL_BASE = 'https://your-proxy-endpoint/v1';

const SNIPPETS: Record<LandingClient, Partial<Record<LandingLanguage, LandingSnippet>>> = {
    google: {
        typescript: {
            prismLanguage: 'typescript',
            code: `import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    httpOptions: {
        baseUrl: '${CANONICAL_BASE}',
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
            code: `from google import genai
from google.genai import types

client = genai.Client(
    api_key="YOUR_PROXY_API_KEY",
    http_options=types.HttpOptions(
        base_url="${CANONICAL_BASE}",
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
            code: `curl "${CANONICAL_BASE}/models/gemini-3.5-flash:generateContent" \\
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
            code: `import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: '${CANONICAL_BASE}',
});

const completion = await openai.chat.completions.create({
    model: 'gemini-3.7-flash',
    messages: [{ role: 'user', content: 'Hello' }],
});

console.log(completion.choices[0]?.message.content);`,
        },
        python: {
            prismLanguage: 'python',
            code: `from openai import OpenAI

client = OpenAI(
    api_key="YOUR_PROXY_API_KEY",
    base_url="${CANONICAL_BASE}",
)

completion = client.chat.completions.create(
    model="gemma-4-31b-it",
    messages=[{"role": "user", "content": "Hello"}],
)
print(completion.choices[0].message.content)`,
        },
        curl: {
            prismLanguage: 'bash',
            code: `curl "${CANONICAL_BASE}/chat/completions" \\
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
            code: `import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: '${CANONICAL_BASE}',
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
}): LandingSnippet | null {
    return SNIPPETS[input.client][input.language] ?? null;
}
