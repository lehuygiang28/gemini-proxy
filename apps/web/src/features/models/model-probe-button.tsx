'use client';

import React, { useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { fetchModelProbe } from './fetch-model-probe';
import { formatModelProbeErrorMessage } from './format-model-probe-error';

type ProbeState = 'idle' | 'loading' | 'success' | 'error';

const ERROR_TEXT_MAX = 120;

export function ModelProbeButton(props: {
    readonly model: string;
    readonly apiKeyId?: string;
    readonly size?: 'small' | 'middle';
    readonly disabled?: boolean;
}) {
    const { translate } = useTranslation();
    const [state, setState] = useState<ProbeState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleProbe = async () => {
        setState('loading');
        setErrorMessage(null);
        try {
            const result = await fetchModelProbe({
                model: props.model,
                apiKeyId: props.apiKeyId,
            });
            if (result.ok === true) {
                setState('success');
                return;
            }
            setState('error');
            let message = formatModelProbeErrorMessage(result.error, translate);
            if (result.status) {
                message = `${message} (HTTP ${result.status})`;
            }
            setErrorMessage(message);
        } catch (error) {
            setState('error');
            setErrorMessage(
                error instanceof Error ? error.message : translate('modelProbe.errors.probeFailed'),
            );
        }
    };

    const errorLabel =
        errorMessage && errorMessage.length > ERROR_TEXT_MAX
            ? `${errorMessage.slice(0, ERROR_TEXT_MAX)}…`
            : errorMessage;

    const statusNode =
        state === 'success' ? (
            <Typography.Text type="success">
                <CheckCircleOutlined /> {translate('modelProbe.success')}
            </Typography.Text>
        ) : state === 'error' && errorLabel ? (
            <Tooltip title={errorMessage !== errorLabel ? errorMessage : undefined}>
                <Typography.Text type="danger" style={{ maxWidth: 360 }}>
                    <CloseCircleOutlined /> {errorLabel}
                </Typography.Text>
            </Tooltip>
        ) : null;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
                size={props.size ?? 'small'}
                icon={<ThunderboltOutlined />}
                loading={state === 'loading'}
                disabled={props.disabled}
                onClick={() => void handleProbe()}
            >
                {translate('modelProbe.test')}
            </Button>
            {statusNode}
        </span>
    );
}
