import type { Tables } from '@gemini-proxy/database';

export type UserSettings = Tables<'user_settings'>;

export type ModelPricingRow = {
    key?: string;
    modelId: string;
    inputPerMillion: number;
    outputPerMillion: number;
    cachedInputPerMillion?: number;
};

export type UserSettingsFormValues = {
    detailed_observability: boolean;
    save_request_body: boolean;
    save_response_body: boolean;
    pricing_rows?: ModelPricingRow[];
};

export const DEFAULT_USER_SETTINGS: UserSettingsFormValues = {
    detailed_observability: false,
    save_request_body: false,
    save_response_body: false,
};

/** Display note: matches DataSanitizer.PAYLOAD_BODY_MAX_CHARS */
export const PAYLOAD_BODY_MAX_CHARS = 64 * 1024;
