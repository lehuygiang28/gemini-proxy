import { describe, expect, it, vi } from 'vitest';
import {
    isCliInteractive,
    keysOwnedBy,
    listOwnerDirectoryBatch,
    listOwnerDirectoryPage,
    listOwnerUsers,
    resolveOwnerUserId,
} from './resolve-owner-user';

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

    it('treats quick mode as non-interactive even when stdin is a TTY', () => {
        expect(isCliInteractive({ quick: true, isTty: true })).toBe(false);
        expect(isCliInteractive({ quick: false, isTty: true })).toBe(true);
        expect(isCliInteractive({ isTty: false })).toBe(false);
    });

    it('lists at most two auth users to distinguish 0, 1, and 2+', () => {
        expect(listOwnerDirectoryPage()).toEqual({ page: 1, perPage: 2 });
    });

    it('pages the full directory 100 at a time for interactive selection', () => {
        expect(listOwnerDirectoryBatch(3)).toEqual({ page: 3, perPage: 100 });
    });

    it('fetches every owner page when the session is interactive', async () => {
        const USER_C = '33333333-3333-4333-8333-333333333333';
        const listedPages: Array<{ page: number; perPage: number }> = [];
        const pageOne = Array.from({ length: 100 }, (_, index) => ({
            id: index === 0 ? USER_A : `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`,
            email: `u${index}@example.com`,
        }));
        const actual = await listOwnerUsers({
            interactive: true,
            listPage: async (page) => {
                listedPages.push(page);
                if (page.page === 1) {
                    return pageOne;
                }
                return [{ id: USER_C, email: 'c@example.com' }];
            },
        });
        expect(listedPages).toEqual([
            { page: 1, perPage: 100 },
            { page: 2, perPage: 100 },
        ]);
        expect(actual).toHaveLength(101);
        expect(actual[0]?.id).toBe(USER_A);
        expect(actual[100]?.id).toBe(USER_C);
    });

    it('probes only the first two owners when the session is not interactive', async () => {
        const listedPages: Array<{ page: number; perPage: number }> = [];
        await listOwnerUsers({
            interactive: false,
            listPage: async (page) => {
                listedPages.push(page);
                return [
                    { id: USER_A, email: 'a@example.com' },
                    { id: USER_B, email: 'b@example.com' },
                ];
            },
        });
        expect(listedPages).toEqual([{ page: 1, perPage: 2 }]);
    });

    it('keeps only keys owned by the selected user', () => {
        const actual = keysOwnedBy(
            [
                { id: 'own', user_id: USER_A },
                { id: 'other', user_id: USER_B },
            ],
            USER_A,
        );
        expect(actual).toEqual([{ id: 'own', user_id: USER_A }]);
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
