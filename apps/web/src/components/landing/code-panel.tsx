'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { signalDeckPrism } from '@/features/landing/signal-deck-prism';

SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('bash', bash);

const CLIENTS: LandingClient[] = ['google', 'openai', 'vercel'];

type LandingCodePanelProps = {
    origin: string;
};

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

    const handleClient = (next: LandingClient) => {
        setClient(next);
        setLanguage(resolveLandingLanguage({ client: next, language }));
    };

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
            <div
                className="gp-landing-tab-row"
                role="tablist"
                aria-label={translate('landing.snippets.clientsLabel')}
            >
                {CLIENTS.map((item) => (
                    <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={client === item}
                        className={`gp-landing-tab${client === item ? ' is-active' : ''}`}
                        onClick={() => handleClient(item)}
                    >
                        {clientLabels[item]}
                    </button>
                ))}
            </div>
            <div className="gp-landing-lang-row">
                <div
                    className="gp-landing-lang-tabs"
                    role="tablist"
                    aria-label={translate('landing.snippets.languagesLabel')}
                >
                    {languages.map((item) => (
                        <button
                            key={item}
                            type="button"
                            role="tab"
                            aria-selected={resolvedLanguage === item}
                            className={`gp-landing-lang-tab${resolvedLanguage === item ? ' is-active' : ''}`}
                            onClick={() => setLanguage(item)}
                        >
                            {translate(`landing.snippets.languages.${item}`)}
                        </button>
                    ))}
                </div>
                <button type="button" className="gp-landing-copy" onClick={() => void handleCopy()}>
                    {copied
                        ? translate('landing.snippets.copied')
                        : translate('landing.snippets.copy')}
                </button>
            </div>
            <div className="gp-landing-code gp-snippet">
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
