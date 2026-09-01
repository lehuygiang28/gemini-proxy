import { describe, expect, it } from 'vitest';
import { persistWithRetry } from './wait-until';

describe('persistWithRetry', () => {
    it('retries twice then succeeds on the third attempt', async () => {
        let attemptCount = 0;
        await persistWithRetry(async () => {
            attemptCount += 1;
            if (attemptCount < 3) {
                throw new Error(`attempt ${attemptCount}`);
            }
        });
        expect(attemptCount).toBe(3);
    });

    it('throws after three failures', async () => {
        let attemptCount = 0;
        await expect(
            persistWithRetry(async () => {
                attemptCount += 1;
                throw new Error('persist down');
            }),
        ).rejects.toThrow('persist down');
        expect(attemptCount).toBe(3);
    });

    it('returns on the first success without extra attempts', async () => {
        let attemptCount = 0;
        await persistWithRetry(async () => {
            attemptCount += 1;
        });
        expect(attemptCount).toBe(1);
    });
});
