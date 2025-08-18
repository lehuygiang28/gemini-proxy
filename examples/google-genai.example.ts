import { FunctionCallingConfigMode, FunctionDeclaration, GoogleGenAI } from '@google/genai';

const genAi = new GoogleGenAI({
    apiKey: 'gproxy_test_12345',
    httpOptions: {
        baseUrl: 'http://localhost:9090/api/gproxy/gemini',
    },
});

async function main() {
    try {
        console.log(`=== list ===`);
        const response = await genAi.models.list();
        console.log(response.page.map((m) => `${m.name} - ${m.version}`));
    } catch (error) {
        console.log(error);
    }

    try {
        console.log(`=== generateContent ===`);
        const response = await genAi.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Count from 1 to 10',
        });
        console.log(response);
        console.log(response.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (error) {}

    try {
        console.log(`=== streamGenerateContent ===`);
        const response2 = await genAi.models.generateContentStream({
            model: 'gemini-2.0-flash',
            contents: 'Count from 1 to 10',
        });
        for await (const chunk of response2) {
            console.log(chunk.text);
        }
    } catch (error) {
        console.log(error);
    }

    try {
        console.log(`=== functionCalling ===`);
        const controlLightDeclaration: FunctionDeclaration = {
            name: 'controlLight',
            parametersJsonSchema: {
                type: 'object',
                properties: {
                    brightness: {
                        type: 'number',
                    },
                    colorTemperature: {
                        type: 'string',
                    },
                },
                required: ['brightness', 'colorTemperature'],
            },
        };

        const response = await genAi.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: 'Dim the lights so the room feels cozy and warm.',
            config: {
                toolConfig: {
                    functionCallingConfig: {
                        // Force it to call any function
                        mode: FunctionCallingConfigMode.ANY,
                        allowedFunctionNames: ['controlLight'],
                    },
                },
                tools: [{ functionDeclarations: [controlLightDeclaration] }],
            },
        });

        console.log(response.functionCalls);
    } catch (error) {
        console.error(error);
    }
}

main().catch((err) => {
    console.error(err);
});
