'use client';

import React, { useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from '@refinedev/core';
import { fetchModelProbe } from './fetch-model-probe';

type ProbeState = 'idle' | 'loading' | 'success' | 'error';

export function ModelProbeButton(props: {
    readonly model: string;
    readonly apiKeyId?: string;
    readonly size?: 'small' | 'middle';
}) {
    const { translate } = useTranslation();
    const [state, setState] = useState<ProbeState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleProbe = async () => {
        setState('loading');
        setErrorMessage(null);
        const result = await fetchModelProbe({
            model: props.model,
            apiKeyId: props.apiKeyId,
        });
        if (result.ok) {
            setState('success');
            return;
        }
        setState('error');
        setErrorMessage(result.error);
    };

    const statusNode =
        state === 'success' ? (
            <Typography.Text type="success">
                <CheckCircleOutlined /> {translate('modelProbe.success')}
            </Typography.Text>
        ) : state === 'error' ? (
            <Tooltip title={errorMessage ?? translate('modelProbe.failed')}>
                <Typography.Text type="danger">
                    <CloseCircleOutlined /> {translate('modelProbe.failed')}
                </Typography.Text>
            </Tooltip>
        ) : null;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Button
                size={props.size ?? 'small'}
                icon={<ThunderboltOutlined />}
                loading={state === 'loading'}
                onClick={() => void handleProbe()}
            >
                {translate('modelProbe.test')}
            </Button>
            {statusNode}
        </span>
    );
}
