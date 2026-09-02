import { describe, expect, it } from 'vitest';
import { splitLandingHeadline } from './split-landing-headline';

describe('splitLandingHeadline', () => {
    it('splits around the interpolated path', () => {
        const actual = splitLandingHeadline('Point any Gemini SDK at one /v1 URL.', '/v1');
        expect(actual).toEqual({
            before: 'Point any Gemini SDK at one ',
            after: ' URL.',
            hasPath: true,
        });
    });

    it('does not inject the path when substitution is missing', () => {
        const actual = splitLandingHeadline('Point any Gemini SDK at one {path} URL.', '/v1');
        expect(actual).toEqual({
            before: 'Point any Gemini SDK at one {path} URL.',
            after: '',
            hasPath: false,
        });
    });
});
