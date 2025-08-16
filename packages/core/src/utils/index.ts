import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique UUID
 * @returns A unique UUID
 */
export function generateId() {
    return uuidv4();
}

// Export body detector utilities
export * from './body-detector';
