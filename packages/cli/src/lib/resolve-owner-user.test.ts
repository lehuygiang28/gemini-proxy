import { describe, expect, it, vi } from 'vitest';
import { resolveOwnerUserId } from './resolve-owner-user';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

describe('resolveOwnerUserId', () => {
    it('throws /No users/ when the directory is empty', async () => {
        await expect(
            resolveOwnerUserId({
                interactive: false,
                listUsers: async () => [],
            }),
        ).rejects.toThrow(/No users/);
    });

    it('returns the only user when userId is omitted', async () => {
        const actual = await resolveOwnerUserId({
            interactive: false,
            listUsers: async () => [{ id: USER_A, email: 'a@example.com' }],
        });
        expect(actual).toBe(USER_A);
    });

    it('throws /--user-id/ when two users exist and the session is not interactive', async () => {
        await expect(
            resolveOwnerUserId({
                interactive: false,
                listUsers: async () => [
                    { id: USER_A, email: 'a@example.com' },
                    { id: USER_B, email: 'b@example.com' },
                ],
            }),
        ).rejects.toThrow(/--user-id/);
    });

    it('calls selectUser when two users exist and the session is interactive', async () => {
        const selectUser = vi.fn(async () => USER_B);
        const actual = await resolveOwnerUserId({
            interactive: true,
            listUsers: async () => [
                { id: USER_A, email: 'a@example.com' },
                { id: USER_B, email: 'b@example.com' },
            ],
            selectUser,
        });
        expect(actual).toBe(USER_B);
        expect(selectUser).toHaveBeenCalledOnce();
    });

    it('throws when userId is not a UUID', async () => {
        await expect(
            resolveOwnerUserId({
                userId: 'not-a-uuid',
                interactive: false,
            }),
        ).rejects.toThrow(/UUID|Invalid user id/i);
    });

    it('throws when userId is not found', async () => {
        await expect(
            resolveOwnerUserId({
                userId: USER_A,
                interactive: false,
                getUserById: async () => null,
            }),
        ).rejects.toThrow(/not found/i);
    });
});
