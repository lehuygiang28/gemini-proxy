'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useList } from '@refinedev/core';
import { Alert, Button, Empty, Segmented, Select } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';
import type { Tables } from '@gemini-proxy/database';
import { CopyRow } from './copy-row';

type ProxyKey = Pick<Tables<'proxy_api_keys'>, 'id' | 'name' | 'proxy_key_value' | 'is_active'>;
type SnippetKind = 'openai' | 'gemini' | 'curl-openai' | 'curl-gemini';

function buildSnippets(base: string, key: string): Record<SnippetKind, string> {
    const openaiBase = `${base}/openai`;
    const geminiBase = `${base}/gemini`;
    const safeKey = key || 'YOUR_PROXY_KEY';

    return {
        openai: `import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: '${safeKey}',
  baseURL: '${openaiBase}',
});

const res = await client.chat.completions.create({
  model: 'gemini-2.5-flash',
  messages: [{ role: 'user', content: 'Hello' }],
});
console.log(res.choices[0]?.message?.content);`,
        gemini: `import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: '${safeKey}',
  httpOptions: { baseUrl: '${geminiBase}' },
});

const res = await ai.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: 'Hello',
});
console.log(res.text);`,
        'curl-openai': `curl -s '${openaiBase}/v1/chat/completions' \\
  -H 'Authorization: Bearer ${safeKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"Hello"}]}'`,
        'curl-gemini': `curl -s '${geminiBase}/v1beta/models/gemini-2.0-flash:generateContent' \\
  -H 'x-goog-api-key: ${safeKey}' \\
  -H 'Content-Type: application/json' \\
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'`,
    };
}

/**
 * Quick-start panel: endpoints, proxy key, copyable client snippets.
 */
export function ProxyQuickStart() {
    const [origin, setOrigin] = useState('');
    const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>();
    const [snippetKind, setSnippetKind] = useState<SnippetKind>('openai');
    const [snippetCopied, setSnippetCopied] = useState(false);

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const { result, query } = useList<ProxyKey>({
        resource: 'proxy_api_keys',
        pagination: { currentPage: 1, pageSize: 100 },
        filters: [
            { field: 'is_active', operator: 'eq', value: true },
            { field: 'deleted_at', operator: 'null', value: true },
        ],
        sorters: [{ field: 'created_at', order: 'desc' }],
        meta: { select: 'id, name, proxy_key_value, is_active' },
    });

    const keys = result?.data ?? [];

    useEffect(() => {
        if (!selectedKeyId && keys.length > 0) {
            setSelectedKeyId(keys[0].id);
        }
    }, [keys, selectedKeyId]);

    const selectedKey = keys.find((key) => key.id === selectedKeyId);
    const proxyBase = origin ? `${origin}/api/gproxy` : '';
    const openaiUrl = proxyBase ? `${proxyBase}/openai` : '';
    const openaiChatUrl = openaiUrl ? `${openaiUrl}/v1/chat/completions` : '';
    const geminiUrl = proxyBase ? `${proxyBase}/gemini` : '';
    const geminiV1betaUrl = geminiUrl ? `${geminiUrl}/v1beta` : '';
    const keyValue = selectedKey?.proxy_key_value ?? '';

    const snippets = useMemo(
        () => buildSnippets(proxyBase || 'http://localhost:4040/api/gproxy', keyValue),
        [proxyBase, keyValue],
    );
    const snippet = snippets[snippetKind];

    const copySnippet = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setSnippetCopied(true);
            window.setTimeout(() => setSnippetCopied(false), 1500);
        } catch {
            // ignore
        }
    };

    if (!query.isLoading && keys.length === 0) {
        return (
            <div className="gp-panel" style={{ padding: 24 }}>
                <Empty description="Create an active proxy key first" />
            </div>
        );
    }

    return (
        <div className="gp-quickstart">
            <div className="gp-panel" style={{ padding: 16, marginBottom: 12 }}>
                <div className="gp-section-title">Endpoints</div>
                <CopyRow label="OpenAI base" value={openaiUrl} />
                <CopyRow label="OpenAI chat" value={openaiChatUrl} />
                <CopyRow label="Gemini base" value={geminiUrl} />
                <CopyRow label="Gemini v1beta" value={geminiV1betaUrl} />
            </div>

            <div className="gp-panel" style={{ padding: 16, marginBottom: 12 }}>
                <div className="gp-section-title">Proxy key</div>
                <Select
                    style={{ width: '100%', marginBottom: 8 }}
                    loading={query.isLoading}
                    value={selectedKeyId}
                    onChange={setSelectedKeyId}
                    options={keys.map((key) => ({
                        value: key.id,
                        label: key.name,
                    }))}
                    placeholder="Select key"
                />
                <CopyRow label="API key" value={keyValue} masked />
                <CopyRow
                    label="OpenAI auth"
                    value={keyValue ? `Authorization: Bearer ${keyValue}` : ''}
                    masked
                />
                <CopyRow
                    label="Gemini auth"
                    value={keyValue ? `x-goog-api-key: ${keyValue}` : ''}
                    masked
                />
            </div>

            <div className="gp-panel" style={{ padding: 16 }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 10,
                    }}
                >
                    <div className="gp-section-title" style={{ marginBottom: 0 }}>
                        Snippet
                    </div>
                    <Button
                        type="primary"
                        size="small"
                        icon={snippetCopied ? <CheckOutlined /> : <CopyOutlined />}
                        onClick={() => void copySnippet()}
                        disabled={!keyValue}
                    >
                        {snippetCopied ? 'Copied' : 'Copy'}
                    </Button>
                </div>
                <Segmented
                    size="small"
                    block
                    value={snippetKind}
                    onChange={(value) => setSnippetKind(value as SnippetKind)}
                    options={[
                        { label: 'OpenAI SDK', value: 'openai' },
                        { label: 'Gemini SDK', value: 'gemini' },
                        { label: 'curl OpenAI', value: 'curl-openai' },
                        { label: 'curl Gemini', value: 'curl-gemini' },
                    ]}
                    style={{ marginBottom: 12 }}
                />
                {!keyValue ? (
                    <Alert type="warning" showIcon message="Select a proxy key" />
                ) : (
                    <pre className="gp-snippet gp-scrollable">{snippet}</pre>
                )}
            </div>
        </div>
    );
}
