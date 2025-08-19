import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'http://localhost:9090/api/gproxy/openai',
    apiKey: 'gproxy_test_12345',
});

async function main() {
    const chatCompletion = await openai.chat.completions.create({
        model: 'gemini-2.5-pro',
        messages: [{ role: 'user', content: 'Write a 100-word poem.' }],
        stream: true,
    });

    for await (const chunk of chatCompletion) {
        process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
}

main().catch(console.error);
