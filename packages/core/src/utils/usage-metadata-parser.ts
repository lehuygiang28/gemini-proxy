import { ProxyApiFormat } from '../types';

export interface GeminiUsageMetadata {
    promptTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
    candidatesTokenCount?: number;
    responseTokenCount?: number;
    thoughtsTokenCount?: number;
    toolUsePromptTokenCount?: number;
    promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    cacheTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    toolUsePromptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    modelVersion?: string;
    responseId?: string;
}

export interface OpenAIUsageMetadata {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    input_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
    model?: string;
    id?: string;
    created?: number;
    object?: string;
}

export type ProviderUsageMetadata = GeminiUsageMetadata & OpenAIUsageMetadata;

export interface ParsedUsageMetadata {
    promptTokens: number;
    completionTokens: number;
    thoughtsTokens: number;
    toolUsePromptTokens: number;
    cacheTokens: number;
    totalTokens: number;
    model: string;
    responseId?: string;
    parseError: boolean;
    raw: Record<string, unknown> | null;
}

function toCount(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        return 0;
    }
    return Math.floor(n);
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return null;
}

function mapGeminiUsage(
    meta: Record<string, unknown>,
    extras?: { model?: string; responseId?: string },
): ParsedUsageMetadata {
    const promptTokens = toCount(meta.promptTokenCount);
    const completionTokens = toCount(meta.candidatesTokenCount ?? meta.responseTokenCount);
    const thoughtsTokens = toCount(meta.thoughtsTokenCount);
    const toolUsePromptTokens = toCount(meta.toolUsePromptTokenCount);
    const cacheTokens = Math.min(toCount(meta.cachedContentTokenCount), promptTokens);
    const totalTokens = toCount(meta.totalTokenCount);
    const model =
        extras?.model ||
        (typeof meta.modelVersion === 'string' ? meta.modelVersion : '') ||
        '';
    const responseId =
        extras?.responseId || (typeof meta.responseId === 'string' ? meta.responseId : undefined);
    return {
        promptTokens,
        completionTokens,
        thoughtsTokens,
        toolUsePromptTokens,
        cacheTokens,
        totalTokens,
        model,
        responseId,
        parseError: false,
        raw: meta,
    };
}

function mapOpenAIUsage(
    usage: Record<string, unknown>,
    extras?: { model?: string; responseId?: string },
): ParsedUsageMetadata {
    const promptTokens = toCount(usage.prompt_tokens);
    const completionTokens = toCount(usage.completion_tokens);
    const details = asRecord(usage.completion_tokens_details);
    const promptDetails = asRecord(usage.prompt_tokens_details);
    const inputDetails = asRecord(usage.input_tokens_details);
    const cacheTokens = Math.min(
        toCount(promptDetails?.cached_tokens ?? inputDetails?.cached_tokens),
        promptTokens,
    );
    const thoughtsTokens = toCount(details?.reasoning_tokens);
    const totalTokens = toCount(usage.total_tokens);
    const model = extras?.model || (typeof usage.model === 'string' ? usage.model : '') || '';
    const responseId = extras?.responseId || (typeof usage.id === 'string' ? usage.id : undefined);
    return {
        promptTokens,
        completionTokens,
        thoughtsTokens,
        toolUsePromptTokens: 0,
        cacheTokens,
        totalTokens,
        model,
        responseId,
        parseError: false,
        raw: usage,
    };
}

/**
 * Incremental SSE / JSON usage parser for Gemini native and OpenAI-compat streams.
 */
export class UsageStreamParser {
    private buffer = '';
    private readonly decoder = new TextDecoder();
    private last: ParsedUsageMetadata | null = null;
    private sawDataPrefix = false;

    constructor(private readonly apiFormat: ProxyApiFormat) {}

    push(chunk: Uint8Array): void {
        this.buffer += this.decoder.decode(chunk, { stream: true });
        this.consumeCompleteLines();
    }

    snapshot(): ParsedUsageMetadata | null {
        return this.last;
    }

    finish(): ParsedUsageMetadata | null {
        this.buffer += this.decoder.decode();
        this.consumeCompleteLines();
        const leftover = this.buffer.trim();
        if (leftover) {
            if (leftover.startsWith('data:')) {
                this.tryParseDataLine(leftover.slice(5).trim());
            } else if (!this.sawDataPrefix) {
                this.tryParseJsonDocument(leftover);
            }
            this.buffer = '';
        }
        return this.last;
    }

    private consumeCompleteLines(): void {
        let newlineIndex = this.buffer.indexOf('\n');
        while (newlineIndex !== -1) {
            const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
            this.buffer = this.buffer.slice(newlineIndex + 1);
            this.consumeLine(line);
            newlineIndex = this.buffer.indexOf('\n');
        }
    }

    private consumeLine(line: string): void {
        const trimmed = line.trim();
        if (!trimmed) {
            return;
        }
        if (trimmed.startsWith('data:')) {
            this.sawDataPrefix = true;
            this.tryParseDataLine(trimmed.slice(5).trim());
        }
    }

    private tryParseDataLine(payload: string): void {
        if (!payload || payload === '[DONE]') {
            return;
        }
        try {
            const parsed: unknown = JSON.parse(payload);
            this.ingestEvent(parsed);
        } catch {
            // Incomplete JSON for this line; wait for more bytes via leftover buffer on finish.
        }
    }

    private tryParseJsonDocument(text: string): void {
        try {
            const parsed: unknown = JSON.parse(text);
            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    this.ingestEvent(item);
                }
                return;
            }
            this.ingestEvent(parsed);
        } catch {
            // Invalid JSON — leave last snapshot as-is.
        }
    }

    private ingestEvent(event: unknown): void {
        const record = asRecord(event);
        if (!record) {
            return;
        }
        if (this.apiFormat === 'gemini') {
            this.ingestGeminiEvent(record);
            return;
        }
        this.ingestOpenAIEvent(record);
    }

    private ingestGeminiEvent(record: Record<string, unknown>): void {
        const usage = asRecord(record.usageMetadata);
        if (!usage) {
            return;
        }
        const model = typeof record.modelVersion === 'string' ? record.modelVersion : undefined;
        const responseId = typeof record.responseId === 'string' ? record.responseId : undefined;
        this.last = mapGeminiUsage(usage, { model, responseId });
    }

    private ingestOpenAIEvent(record: Record<string, unknown>): void {
        const usage = asRecord(record.usage);
        if (!usage) {
            return;
        }
        const model = typeof record.model === 'string' ? record.model : undefined;
        const responseId = typeof record.id === 'string' ? record.id : undefined;
        this.last = mapOpenAIUsage(usage, { model, responseId });
    }
}

export class UsageMetadataParser {
    static parseFromResponseBody(
        bodyText: string,
        apiFormat: ProxyApiFormat,
    ): ParsedUsageMetadata | null {
        try {
            const parser = new UsageStreamParser(apiFormat);
            parser.push(new TextEncoder().encode(bodyText));
            return parser.finish();
        } catch (error) {
            console.warn('Failed to parse usage metadata:', error);
            return null;
        }
    }

    static async parseFromResponse(
        response: Response,
        apiFormat: ProxyApiFormat,
    ): Promise<ParsedUsageMetadata | null> {
        try {
            const clonedResponse = response.clone();
            const bodyText = await clonedResponse.text();
            return this.parseFromResponseBody(bodyText, apiFormat);
        } catch (error) {
            console.warn('Failed to parse usage metadata from response:', error);
            return null;
        }
    }
}
