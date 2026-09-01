import type { ComboAttempt } from './combo-types';

export function skipPlanMember(input: {
    readonly remaining: readonly ComboAttempt[];
    readonly skippedModel: string;
}): ComboAttempt[] {
    return input.remaining.filter((attempt) => attempt.canonicalModel !== input.skippedModel);
}
