import { describe, expect, it } from 'vitest';
import {
    selectPoolAndKey,
    type PoolWindowState,
    type SchedulerCandidate,
} from './project-pool-scheduler';

const NOW_MS = Date.parse('2026-08-31T12:00:00.000Z');

function createCandidate(
    id: string,
    projectPoolId: string | null,
    lastUsedAt: string | null,
): SchedulerCandidate {
    return {
        id,
        projectPoolId,
        lastUsedAt,
        lastErrorAt: null,
        failureCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        cooldownUntil: null,
        isActive: true,
    };
}

function createPool(poolId: string, overrides: Partial<PoolWindowState> = {}): PoolWindowState {
    return {
        poolId,
        cooldownUntil: null,
        rpmLimit: null,
        tpmLimit: null,
        minuteRequests: 0,
        minuteTokens: 0,
        ...overrides,
    };
}

function select(
    candidates: SchedulerCandidate[],
    pools: PoolWindowState[],
    overrides: Partial<Parameters<typeof selectPoolAndKey>[0]> = {},
): ReturnType<typeof selectPoolAndKey> {
    return selectPoolAndKey({
        candidates,
        pools,
        nowMs: NOW_MS,
        excludeKeyIds: [],
        preferKeyId: null,
        requiredPoolId: null,
        requiredKeyId: null,
        ...overrides,
    });
}

describe('selectPoolAndKey', () => {
    it('rejects every key when their shared pool has exhausted RPM', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', null),
            createCandidate('key-b', 'pool-a', null),
        ];
        const pools = [createPool('pool-a', { rpmLimit: 1, minuteRequests: 1 })];

        const actualSelection = select(candidates, pools);

        expect(actualSelection).toBeNull();
    });

    it('selects different equal-load pools by oldest key when the first key is excluded', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', 'pool-b', '2026-08-31T11:00:00.000Z'),
        ];
        const pools = [createPool('pool-a'), createPool('pool-b')];

        const firstSelection = select(candidates, pools);
        const secondSelection = select(candidates, pools, { excludeKeyIds: ['key-a'] });

        expect(firstSelection).toEqual({ keyId: 'key-a', poolId: 'pool-a' });
        expect(secondSelection).toEqual({ keyId: 'key-b', poolId: 'pool-b' });
    });

    it('treats keys without pool IDs as independent singleton pools', () => {
        const candidates = [
            createCandidate('key-a', null, '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', null, '2026-08-31T11:00:00.000Z'),
        ];
        const exhaustedLiteralNullPool = createPool('null', {
            rpmLimit: 1,
            minuteRequests: 1,
        });

        const firstSelection = select(candidates, [exhaustedLiteralNullPool]);
        const secondSelection = select(candidates, [exhaustedLiteralNullPool], {
            excludeKeyIds: ['key-a'],
        });

        expect(firstSelection).toEqual({ keyId: 'key-a', poolId: null });
        expect(secondSelection).toEqual({ keyId: 'key-b', poolId: null });
    });

    it('only considers keys in the required pool', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', 'pool-b', '2026-08-31T11:00:00.000Z'),
        ];

        const actualSelection = select(candidates, [createPool('pool-a'), createPool('pool-b')], {
            requiredPoolId: 'pool-b',
        });

        expect(actualSelection).toEqual({ keyId: 'key-b', poolId: 'pool-b' });
    });

    it('skips a preferred key when its pool is cooling down', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', 'pool-b', '2026-08-31T11:00:00.000Z'),
        ];
        const pools = [
            createPool('pool-a', { cooldownUntil: '2026-08-31T12:01:00.000Z' }),
            createPool('pool-b'),
        ];

        const actualSelection = select(candidates, pools, { preferKeyId: 'key-a' });

        expect(actualSelection).toEqual({ keyId: 'key-b', poolId: 'pool-b' });
    });

    it('prefers the pool with the lower normalized request load', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', 'pool-b', '2026-08-31T11:00:00.000Z'),
        ];
        const pools = [
            createPool('pool-a', { rpmLimit: 10, minuteRequests: 8 }),
            createPool('pool-b', { rpmLimit: 10, minuteRequests: 2 }),
        ];

        const actualSelection = select(candidates, pools);

        expect(actualSelection).toEqual({ keyId: 'key-b', poolId: 'pool-b' });
    });

    it('prefers an unused unlabeled pool over a used unlabeled pool', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', 'pool-b', '2026-08-31T11:00:00.000Z'),
        ];
        const pools = [
            createPool('pool-a', { minuteRequests: 1 }),
            createPool('pool-b', { minuteRequests: 0 }),
        ];

        const actualSelection = select(candidates, pools);

        expect(actualSelection).toEqual({ keyId: 'key-b', poolId: 'pool-b' });
    });

    it('does not schedule a key when its pool row is missing and still schedules a singleton', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', '2026-08-31T10:00:00.000Z'),
            createCandidate('key-b', null, '2026-08-31T11:00:00.000Z'),
        ];

        const actualSelection = select(candidates, []);

        expect(actualSelection).toEqual({ keyId: 'key-b', poolId: null });
    });

    it('does not schedule any key when every candidate pool row is missing', () => {
        const candidates = [
            createCandidate('key-a', 'pool-a', null),
            createCandidate('key-b', 'pool-b', null),
        ];

        const actualSelection = select(candidates, []);

        expect(actualSelection).toBeNull();
    });
});
