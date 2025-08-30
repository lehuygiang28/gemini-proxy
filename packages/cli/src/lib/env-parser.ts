export interface EnvApiKey {
    name: string;
    key: string;
}

export interface EnvProxyApiKey {
    name: string;
    proxy_key_value: string;
}

export class EnvParser {
    /**
     * Parse GEMINI_API_KEY from environment variable
     * Supports both JSON array format and comma-separated format
     */
    static parseGoogleAIStudioApiKeys(envValue: string): EnvApiKey[] {
        if (!envValue) {
            return [];
        }

        try {
            // Try to parse as JSON array first
            const parsed = JSON.parse(envValue);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => ({
                    name: item.name || 'Unnamed Key',
                    key: item.key,
                }));
            }
        } catch (error) {
            // If JSON parsing fails, try comma-separated format
            const keys = envValue
                .split(',')
                .map((key) => key.trim())
                .filter((key) => key);
            return keys.map((key, index) => ({
                name: `API Key ${index + 1}`,
                key,
            }));
        }

        return [];
    }

    /**
     * Parse PROXY_API_KEY from environment variable
     * Supports both JSON array format and comma-separated format
     */
    static parseProxyApiKeys(envValue: string): EnvProxyApiKey[] {
        if (!envValue) {
            return [];
        }

        try {
            // Try to parse as JSON array first
            const parsed = JSON.parse(envValue);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => ({
                    name: item.name || 'Unnamed Proxy Key',
                    proxy_key_value: item.key,
                }));
            }
        } catch (error) {
            // If JSON parsing fails, try comma-separated format
            const keys = envValue
                .split(',')
                .map((key) => key.trim())
                .filter((key) => key);
            return keys.map((key, index) => ({
                name: `Proxy Key ${index + 1}`,
                proxy_key_value: key,
            }));
        }

        return [];
    }

    /**
     * Get API keys from environment variables
     */
    static getApiKeysFromEnv(): { googleaistudio: EnvApiKey[]; proxy: EnvProxyApiKey[] } {
        const googleaistudioKeys = this.parseGoogleAIStudioApiKeys(
            process.env.GEMINI_API_KEY || '',
        );
        const proxyKeys = this.parseProxyApiKeys(process.env.PROXY_API_KEY || '');

        return { googleaistudio: googleaistudioKeys, proxy: proxyKeys };
    }
}
