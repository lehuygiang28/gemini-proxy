import React, { useCallback, useState } from 'react';
import { useTranslation } from '@refinedev/core';
import { Button, Tooltip } from 'antd';
import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

interface CopyRowProps {
    label: string;
    value: string;
    mono?: boolean;
    masked?: boolean;
}

function maskSecret(value: string): string {
    if (value.length <= 12) {
        return value;
    }
    const bearer = 'Bearer ';
    if (value.includes(bearer)) {
        const idx = value.lastIndexOf(bearer);
        const prefix = value.slice(0, idx + bearer.length);
        const secret = value.slice(idx + bearer.length);
        if (secret.length > 10) {
            return `${prefix}${secret.slice(0, 6)}…${secret.slice(-4)}`;
        }
        return value;
    }
    if (value.includes(': ')) {
        const idx = value.lastIndexOf(': ');
        const prefix = value.slice(0, idx + 2);
        const secret = value.slice(idx + 2);
        if (secret.length > 10) {
            return `${prefix}${secret.slice(0, 6)}…${secret.slice(-4)}`;
        }
        return value;
    }
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/**
 * Single-line label + value + copy control.
 */
export function CopyRow({ label, value, mono = true, masked = false }: CopyRowProps) {
    const { translate } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!value) {
            return;
        }
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore clipboard failures
        }
    }, [value]);

    const display = masked && value ? maskSecret(value) : value || '—';

    return (
        <div className="gp-copy-row">
            <span className="gp-copy-label">{label}</span>
            <Tooltip title={masked ? value : undefined}>
                <code className={mono ? 'gp-copy-value gp-live-mono' : 'gp-copy-value'}>
                    {display}
                </code>
            </Tooltip>
            <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                onClick={() => void handleCopy()}
                disabled={!value}
                aria-label={translate('proxy_quickstart.copyAria', { label })}
            />
        </div>
    );
}
