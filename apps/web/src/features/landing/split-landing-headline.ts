export type SplitLandingHeadline = {
    after: string;
    before: string;
    hasPath: boolean;
};

/**
 * Splits a translated headline around the highlighted path without injecting a second copy.
 */
export function splitLandingHeadline(headline: string, path: string): SplitLandingHeadline {
    const index = headline.indexOf(path);
    if (index < 0) {
        return { before: headline, after: '', hasPath: false };
    }
    return {
        before: headline.slice(0, index),
        after: headline.slice(index + path.length),
        hasPath: true,
    };
}
