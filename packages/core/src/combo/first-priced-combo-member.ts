import { resolveGeminiPricing } from '../constants/gemini-pricing';

export function firstPricedComboMember(members: readonly string[]): string | undefined {
    for (const member of members) {
        if (resolveGeminiPricing(member)) {
            return member;
        }
    }
    return members[0];
}
