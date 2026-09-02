'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from '@refinedev/core';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import {
    getLandingSnippet,
    landingV1BaseUrl,
    listLandingLanguages,
    resolveLandingLanguage,
    type LandingClient,
    type LandingLanguage,
} from '@/features/landing/landing-snippets';
import { selectLandingTab } from '@/features/landing/select-landing-tab';
import { signalDeckPrism } from '@/features/landing/signal-deck-prism';

SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);

const CLIENTS: LandingClient[] = ['google', 'openai', 'vercel'];
const SNIPPET_PANEL_ID = 'gp-landing-snippet-panel';

type LandingCodePanelProps = {
    origin: string;
};

type LandingTabListProps<T extends string> = {
    ariaLabel: string;
    className: string;
    getLabel: (item: T) => string;
    idPrefix: string;
    items: readonly T[];
    onChange: (next: T) => void;
    tabClassName: string;
    value: T;
};

/**
 * Renders a WAI-ARIA tablist that controls the landing snippet panel.
 */
function LandingTabList<T extends string>({
    ariaLabel,
    className,
    getLabel,
    idPrefix,
    items,
    onChange,
    tabClassName,
    value,
}: LandingTabListProps<T>) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const next = selectLandingTab(items, value, event.key);
        if (!next) {
            return;
        }
        event.preventDefault();
        onChange(next);
        window.queueMicrotask(() => {
            document.getElementById(`${idPrefix}-${next}`)?.focus();
        });
    };

    return (
        <div className={className} role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
            {items.map((item) => {
                const isActive = item === value;
                return (
                    <button
                        key={item}
                        id={`${idPrefix}-${item}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={SNIPPET_PANEL_ID}
                        tabIndex={isActive ? 0 : -1}
                        className={`${tabClassName}${isActive ? ' is-active' : ''}`}
                        onClick={() => onChange(item)}
                    >
                        {getLabel(item)}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Client + language switcher with Signal Deck Prism highlighting.
 */
export function LandingCodePanel({ origin }: LandingCodePanelProps) {
    const { translate } = useTranslation();
    const [client, setClient] = useState<LandingClient>('google');
    const [language, setLanguage] = useState<LandingLanguage>('typescript');
    const [copied, setCopied] = useState(false);
    const [liveOrigin, setLiveOrigin] = useState(origin);

    useEffect(() => {
        setLiveOrigin(window.location.origin);
    }, []);

    useEffect(() => {
        setLanguage((current) => resolveLandingLanguage({ client, language: current }));
    }, [client]);

    const languages = listLandingLanguages(client);
    const resolvedLanguage = resolveLandingLanguage({ client, language });
    const snippet = getLandingSnippet({
        client,
        language: resolvedLanguage,
        origin: liveOrigin,
    });
    const baseUrl = landingV1BaseUrl(liveOrigin);

    const clientLabels = useMemo(
        () => ({
            google: translate('landing.snippets.clients.google'),
            openai: translate('landing.snippets.clients.openai'),
            vercel: translate('landing.snippets.clients.vercel'),
        }),
        [translate],
    );

    const handleCopy = async () => {
        if (!snippet) {
            return;
        }
        try {
            await navigator.clipboard.writeText(snippet.code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore clipboard failures in unsupported browsers
        }
    };

    if (!snippet) {
        return null;
    }

    return (
        <div className="gp-landing-panel">
            <LandingTabList
                ariaLabel={translate('landing.snippets.clientsLabel')}
                className="gp-landing-tab-row"
                getLabel={(item) => clientLabels[item]}
                idPrefix="gp-landing-client"
                items={CLIENTS}
                onChange={setClient}
                tabClassName="gp-landing-tab"
                value={client}
            />
            <div className="gp-landing-lang-row">
                <LandingTabList
                    ariaLabel={translate('landing.snippets.languagesLabel')}
                    className="gp-landing-lang-tabs"
                    getLabel={(item) => translate(`landing.snippets.languages.${item}`)}
                    idPrefix="gp-landing-language"
                    items={languages}
                    onChange={setLanguage}
                    tabClassName="gp-landing-lang-tab"
                    value={resolvedLanguage}
                />
                <button type="button" className="gp-landing-copy" onClick={() => void handleCopy()}>
                    {copied
                        ? translate('landing.snippets.copied')
                        : translate('landing.snippets.copy')}
                </button>
            </div>
            <div
                className="gp-landing-code gp-snippet"
                id={SNIPPET_PANEL_ID}
                role="tabpanel"
                aria-labelledby={`gp-landing-client-${client} gp-landing-language-${resolvedLanguage}`}
            >
                <SyntaxHighlighter
                    language={snippet.prismLanguage}
                    style={signalDeckPrism}
                    wrapLines
                    PreTag="div"
                    codeTagProps={{
                        style: {
                            fontFamily:
                                'var(--gp-font-mono), "IBM Plex Mono", ui-monospace, monospace',
                            fontSize: '13px',
                            lineHeight: 1.65,
                        },
                    }}
                    lineProps={(lineNumber) => {
                        const line = snippet.code.split('\n')[lineNumber - 1] ?? '';
                        if (line.includes(baseUrl)) {
                            return { className: 'gp-landing-v1-line' };
                        }
                        return {};
                    }}
                    customStyle={{
                        margin: 0,
                        padding: 0,
                        background: 'transparent',
                    }}
                >
                    {snippet.code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}
