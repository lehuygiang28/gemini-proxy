export type ImportFormat = '9router' | 'native' | 'legacy-array' | 'unknown';

export type NormalizedImportKey = {
    name: string;
    api_key_value: string;
    provider: 'googleaistudio';
    is_active: boolean;
    metadata: {
        source: '9router' | 'native' | 'legacy';
        connection_id?: string;
        priority?: number;
        test_status?: string;
        imported_at: string;
    };
};

export type ImportParseResult = {
    format: ImportFormat;
    keys: NormalizedImportKey[];
    stats: {
        total_connections?: number;
        gemini_connections?: number;
        imported_keys?: number;
        skipped_unsupported?: number;
        skipped_masked?: number;
        skipped_invalid?: number;
    };
    warnings: string[];
};

export type NineRouterConnection = {
    id?: string;
    provider?: string;
    authType?: string;
    name?: string | null;
    apiKey?: string;
    isActive?: boolean;
    priority?: number;
    testStatus?: string;
};
