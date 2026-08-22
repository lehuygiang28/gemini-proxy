import type { Tables } from '@gemini-proxy/database';

export type UserSettings = Tables<'user_settings'>;

export type UserSettingsFormValues = {
    detailed_observability: boolean;
    save_request_body: boolean;
    save_response_body: boolean;
};

export const DEFAULT_USER_SETTINGS: UserSettingsFormValues = {
    detailed_observability: false,
    save_request_body: false,
    save_response_body: false,
};

/** Display note: matches DataSanitizer.PAYLOAD_BODY_MAX_CHARS */
export const PAYLOAD_BODY_MAX_CHARS = 64 * 1024;
