import { AppwriteContext, AppwriteRequest } from './types';

/**
 * Convert Appwrite context to a standard Request object
 */
export function getRequest(context: AppwriteContext): Request {
    const { req } = context;

    // Build the full URL
    const url = req.url;

    // Prepare headers
    const headers = new Headers();
    if (req.headers) {
        Object.entries(req.headers).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                headers.set(key, value);
            }
        });
    }

    // Prepare request init
    const requestInit: RequestInit = {
        method: req.method || 'GET',
        headers,
    };

    // Handle body
    if (req.bodyRaw) {
        // Use raw body if available
        requestInit.body = req.bodyRaw;
    } else if (req.body) {
        // Use parsed body if available
        if (typeof req.body === 'string') {
            requestInit.body = req.body;
        } else {
            // Convert object to JSON string
            requestInit.body = JSON.stringify(req.body);
            // Set content-type if not already set
            if (!headers.has('content-type')) {
                headers.set('content-type', 'application/json');
            }
        }
    }

    return new Request(url, requestInit);
}

/**
 * Convert Hono Response to Appwrite response
 */
export async function getResponse(context: AppwriteContext, response: Response): Promise<any> {
    const { res } = context;

    // Get response headers
    const headers: Record<string, any> = {};
    response.headers.forEach((value, key) => {
        headers[key] = value;
    });

    // Get response body based on content type
    const contentType = response.headers.get('content-type') || '';
    let body: any;

    try {
        if (contentType.includes('application/json')) {
            body = await response.json();
        } else if (contentType.includes('text/')) {
            body = await response.text();
        } else {
            // For binary or other content types, get as text
            body = await response.text();
        }
    } catch (error) {
        // Fallback to text if parsing fails
        body = await response.text();
    }

    // Return appropriate response based on content type
    if (contentType.includes('application/json')) {
        return res.json(body, response.status);
    } else {
        return res.send(body, response.status, headers);
    }
}

/**
 * Validate required environment variables
 */
export function validateEnvironment(): string[] {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    return missing;
}
