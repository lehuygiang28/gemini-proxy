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
});
