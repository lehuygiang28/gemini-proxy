import { describe, expect, it } from 'vitest';
import { skipPlanMember } from './skip-plan-member';

describe('skipPlanMember', () => {
    it('drops remaining pairs for the skipped member and keeps later members', () => {
        const plan = [
            { apiKeyId: 'A', canonicalModel: 'm0' },
            { apiKeyId: 'B', canonicalModel: 'm0' },
            { apiKeyId: 'A', canonicalModel: 'm1' },
        ];
        const actual = skipPlanMember({
            remaining: plan.slice(1),
            skippedModel: 'm0',
        });
        expect(actual).toEqual([{ apiKeyId: 'A', canonicalModel: 'm1' }]);
    });

    it('is a no-op when the skipped model is already gone', () => {
        const remaining = [{ apiKeyId: 'A', canonicalModel: 'm1' }];
        expect(skipPlanMember({ remaining, skippedModel: 'm0' })).toEqual(remaining);
    });

    it('returns an empty plan when every remaining pair is the skipped member', () => {
        expect(
            skipPlanMember({
                remaining: [
                    { apiKeyId: 'B', canonicalModel: 'm0' },
                    { apiKeyId: 'C', canonicalModel: 'm0' },
                ],
                skippedModel: 'm0',
            }),
        ).toEqual([]);
    });
});
