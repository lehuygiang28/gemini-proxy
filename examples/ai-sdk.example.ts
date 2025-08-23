import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * With Vercel AI SDK, we must add the extra /v1beta after /gemini
 * because they don't auto-handle it like the Google GenAI SDK does.
 *
 * Google GenAI SDK: /api/gproxy/gemini
 * Vercel AI SDK:   /api/gproxy/gemini/v1beta
 */
const google = createGoogleGenerativeAI({
    apiKey: 'gproxy_test_12345',
    baseURL: 'http://localhost:9090/api/gproxy/gemini/v1beta',
});

async function main() {
    const { text } = await generateText({
        model: google('gemini-2.5-flash'),
        system: 'You are a friendly assistant!',
        prompt: 'Why is the sky blue?',
    });

    console.log(`=== Google Generative AI Response ===`);
    console.log(text);
}

main().catch(console.error);
