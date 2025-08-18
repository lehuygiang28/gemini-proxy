import { ProxyApiFormat } from '../types';

export interface UsageMetadata {
    promptTokenCount?: number;
    totalTokenCount?: number;
    promptTokensDetails?: Array<{
        modality: string;
        tokenCount: number;
    }>;
    candidatesTokenCount?: number;
    candidatesTokensDetails?: Array<{
        modality: string;
        tokenCount: number;
    }>;
    modelVersion?: string;
    responseId?: string;
    // OpenAI format fields
    completion_tokens?: number;
    prompt_tokens?: number;
    total_tokens?: number;
    model?: string;
    id?: string;
    created?: number;
    object?: string;
}

export interface ParsedUsageMetadata {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    responseId?: string;
    metadata: UsageMetadata;
}

export class UsageMetadataParser {
    /**
     * Parse usage metadata from response body text
     * Supports both streaming and non-streaming formats for Gemini and OpenAI
     */
    static parseFromResponseBody(
        bodyText: string,
        apiFormat: ProxyApiFormat,
    ): ParsedUsageMetadata | null {
        try {
            if (apiFormat === 'gemini') {
                return this.parseGeminiResponse(bodyText);
            } else if (apiFormat === 'openai-compatible') {
                return this.parseOpenAIResponse(bodyText);
            }
        } catch (error) {
            console.warn('Failed to parse usage metadata:', error);
        }
        return null;
    }

    /**
     * Parse Gemini response (both streaming and non-streaming)
     */
    private static parseGeminiResponse(bodyText: string): ParsedUsageMetadata | null {
        // Check if it's streaming format (data: prefix)
        if (bodyText.includes('data: ')) {
            return this.parseGeminiStreaming(bodyText);
        } else {
            return this.parseGeminiNonStreaming(bodyText);
        }
    }

    /**
     * Parse Gemini streaming response
     */
    private static parseGeminiStreaming(bodyText: string): ParsedUsageMetadata | null {
        let finalUsageMetadata: UsageMetadata | null = null;
        let modelVersion = '';
        let responseId = '';

        // Split by lines and process each line that starts with 'data: '
        const lines = bodyText.split('\n');
        let currentJsonStr = '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                // Start of a new data line
                currentJsonStr = line.substring(6); // Remove 'data: ' prefix

                if (currentJsonStr.trim() === '[DONE]') continue;

                try {
                    const data = JSON.parse(currentJsonStr);
                    if (data.usageMetadata) {
                        // For Gemini, we can get usage metadata from any chunk
                        // but we want the final values from the last chunk with finishReason
                        if (data.candidates?.[0]?.finishReason === 'STOP') {
                            // This is the final chunk, use its usage metadata
                            finalUsageMetadata = data.usageMetadata;
                            modelVersion = data.modelVersion || '';
                            responseId = data.responseId || '';
                            break; // Found the final chunk, stop processing
                        } else {
                            // Keep updating with the latest usage metadata as fallback
                            finalUsageMetadata = data.usageMetadata;
                            modelVersion = data.modelVersion || '';
                            responseId = data.responseId || '';
                        }
                    }
                } catch (error) {
                    // Skip invalid JSON lines
                    continue;
                }
            }
        }

        if (!finalUsageMetadata) return null;

        return {
            promptTokens: finalUsageMetadata.promptTokenCount || 0,
            completionTokens: finalUsageMetadata.candidatesTokenCount || 0,
            totalTokens: finalUsageMetadata.totalTokenCount || 0,
            model: modelVersion,
            responseId: responseId,
            metadata: finalUsageMetadata,
        };
    }

    /**
     * Parse Gemini non-streaming response
     */
    private static parseGeminiNonStreaming(bodyText: string): ParsedUsageMetadata | null {
        try {
            const data = JSON.parse(bodyText);

            // Handle array format (multiple responses)
            const responses = Array.isArray(data) ? data : [data];

            // Find the last response with usage metadata
            let finalUsageMetadata: UsageMetadata | null = null;
            let modelVersion = '';
            let responseId = '';

            for (const response of responses) {
                if (response.usageMetadata) {
                    finalUsageMetadata = response.usageMetadata;
                    modelVersion = response.modelVersion || '';
                    responseId = response.responseId || '';
                }
            }

            if (!finalUsageMetadata) return null;

            return {
                promptTokens: finalUsageMetadata.promptTokenCount || 0,
                completionTokens: finalUsageMetadata.candidatesTokenCount || 0,
                totalTokens: finalUsageMetadata.totalTokenCount || 0,
                model: modelVersion,
                responseId: responseId,
                metadata: finalUsageMetadata,
            };
        } catch (error) {
            // Silently return null for invalid JSON
            return null;
        }
    }

    /**
     * Parse OpenAI response (both streaming and non-streaming)
     */
    private static parseOpenAIResponse(bodyText: string): ParsedUsageMetadata | null {
        // Check if it's streaming format (data: prefix)
        if (bodyText.includes('data: ')) {
            return this.parseOpenAIStreaming(bodyText);
        } else {
            return this.parseOpenAINonStreaming(bodyText);
        }
    }

    /**
     * Parse OpenAI streaming response
     */
    private static parseOpenAIStreaming(bodyText: string): ParsedUsageMetadata | null {
        let finalUsage: any = null;
        let model = '';
        let id = '';
        let created = 0;

        // Split by lines and process each line that starts with 'data: '
        const lines = bodyText.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6); // Remove 'data: ' prefix
                if (jsonStr.trim() === '[DONE]') continue;

                try {
                    const data = JSON.parse(jsonStr);
                    if (data.usage && data.choices?.[0]?.finish_reason === 'stop') {
                        // For OpenAI, we only want usage data from the final chunk with finish_reason
                        finalUsage = data.usage;
                        model = data.model || '';
                        id = data.id || '';
                        created = data.created || 0;
                        break; // Found the final chunk, stop processing
                    }
                    // Skip intermediate chunks as they have incomplete usage data
                } catch (error) {
                    // Skip invalid JSON lines
                    continue;
                }
            }
        }

        if (!finalUsage) return null;

        return {
            promptTokens: finalUsage.prompt_tokens || 0,
            completionTokens: finalUsage.completion_tokens || 0,
            totalTokens: finalUsage.total_tokens || 0,
            model: model,
            responseId: id,
            metadata: {
                ...finalUsage,
                model,
                id,
                created,
            },
        };
    }

    /**
     * Parse OpenAI non-streaming response
     */
    private static parseOpenAINonStreaming(bodyText: string): ParsedUsageMetadata | null {
        try {
            const data = JSON.parse(bodyText);

            if (!data.usage) return null;

            return {
                promptTokens: data.usage.prompt_tokens || 0,
                completionTokens: data.usage.completion_tokens || 0,
                totalTokens: data.usage.total_tokens || 0,
                model: data.model || '',
                responseId: data.id || '',
                metadata: {
                    ...data.usage,
                    model: data.model,
                    id: data.id,
                    created: data.created,
                    object: data.object,
                },
            };
        } catch (error) {
            console.warn('Failed to parse OpenAI non-streaming response:', error);
            return null;
        }
    }

    /**
     * Clone response and extract usage metadata
     */
    static async parseFromResponse(
        response: Response,
        apiFormat: ProxyApiFormat,
    ): Promise<ParsedUsageMetadata | null> {
        try {
            // Clone the response to avoid consuming the original
            const clonedResponse = response.clone();
            const bodyText = await clonedResponse.text();

            return this.parseFromResponseBody(bodyText, apiFormat);
        } catch (error) {
            console.warn('Failed to parse usage metadata from response:', error);
            return null;
        }
    }
}
