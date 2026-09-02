import type { CSSProperties } from 'react';

const text: CSSProperties = { color: 'var(--gp-text)' };
const accent: CSSProperties = { color: 'var(--gp-accent)' };
const success: CSSProperties = { color: 'var(--gp-success)' };
const info: CSSProperties = { color: 'var(--gp-info)' };
const muted: CSSProperties = { color: 'var(--gp-text-muted)', fontStyle: 'italic' };
const warn: CSSProperties = { color: 'var(--gp-warn)' };

/**
 * Prism token colors aligned to Signal Deck CSS variables (no purple oneDark).
 */
export const signalDeckPrism: { [key: string]: CSSProperties } = {
    'code[class*="language-"]': {
        ...text,
        fontFamily: 'var(--gp-font-mono), "IBM Plex Mono", ui-monospace, monospace',
        fontSize: '13px',
        lineHeight: 1.65,
        background: 'transparent',
    },
    'pre[class*="language-"]': {
        ...text,
        fontFamily: 'var(--gp-font-mono), "IBM Plex Mono", ui-monospace, monospace',
        fontSize: '13px',
        lineHeight: 1.65,
        margin: 0,
        padding: 0,
        background: 'transparent',
        overflow: 'auto',
    },
    comment: muted,
    prolog: muted,
    doctype: muted,
    cdata: muted,
    punctuation: { color: 'var(--gp-text-secondary)' },
    property: accent,
    tag: accent,
    boolean: warn,
    number: warn,
    constant: warn,
    symbol: warn,
    deleted: { color: 'var(--gp-error)' },
    selector: success,
    'attr-name': info,
    string: success,
    char: success,
    builtin: info,
    inserted: success,
    operator: { color: 'var(--gp-text-secondary)' },
    entity: info,
    url: success,
    '.language-css .token.string': success,
    '.style .token.string': success,
    atrule: accent,
    'attr-value': success,
    keyword: accent,
    'keyword-module': accent,
    'keyword-control-flow': accent,
    function: info,
    className: info,
    'class-name': info,
    maybeClassName: info,
    'maybe-class-name': info,
    namespace: info,
    imports: accent,
    'imports-punctuation': { color: 'var(--gp-text-secondary)' },
    regex: success,
    important: { ...accent, fontWeight: 600 },
    variable: text,
    parameter: text,
    'template-string': success,
    interpolation: text,
    literal: warn,
    generic: info,
};
