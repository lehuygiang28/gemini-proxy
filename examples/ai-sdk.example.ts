import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

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
