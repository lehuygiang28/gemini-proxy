'use client';

import React, { useState } from 'react';
import { Modal, Button, theme } from 'antd';
import { CodeOutlined, FileTextOutlined, BugOutlined } from '@ant-design/icons';
import { JsonDisplay } from './JsonDisplay';

const { useToken } = theme;

interface JsonModalProps {
    data: unknown;
    title?: string;
    trigger?: React.ReactNode;
    size?: 'small' | 'medium' | 'large';
    type?: 'request' | 'response' | 'error';
}

export const JsonModal: React.FC<JsonModalProps> = ({
    data,
    title = 'JSON Data',
    trigger,
    size = 'medium',
    type = 'request',
}) => {
    const { token } = useToken();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getModalSize = () => {
        switch (size) {
            case 'small':
                return { width: 600 };
            case 'large':
                return { width: 1000 };
            default:
                return { width: 800 };
        }
    };

    const getTypeConfig = () => {
        switch (type) {
            case 'request':
                return {
                    icon: <FileTextOutlined />,
                    color: token.colorPrimary,
                };
            case 'response':
                return {
                    icon: <CodeOutlined />,
                    color: token.colorSuccess,
                };
            case 'error':
                return {
                    icon: <BugOutlined />,
                    color: token.colorError,
                };
        }
    };

    const typeConfig = getTypeConfig();
    const hasData = data && Object.keys(data || {}).length > 0;

    const defaultTrigger = (
        <Button
            type="text"
            size="small"
            icon={typeConfig.icon}
            onClick={() => setIsModalOpen(true)}
            style={{
                color: typeConfig.color,
                fontSize: token.fontSizeSM,
                padding: '4px 8px',
                borderRadius: token.borderRadius,
                fontWeight: 500,
            }}
        >
            {hasData ? `View ${title}` : `No ${title.toLowerCase()}`}
        </Button>
    );

    return (
        <>
            {trigger || defaultTrigger}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: token.marginSM }}>
                        {typeConfig.icon}
                        <span style={{ fontWeight: 600 }}>{title}</span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={
                    <Button type="primary" onClick={() => setIsModalOpen(false)}>
                        Close
                    </Button>
                }
                {...getModalSize()}
                style={{ top: 20 }}
                bodyStyle={{
                    maxHeight: '75vh',
                    overflow: 'auto',
                    padding: token.paddingMD,
                    background: token.colorBgContainer,
                }}
            >
                <JsonDisplay
                    data={data}
                    title={title}
                    collapsible={false}
                    showActions={true}
                    maxHeight="60vh"
                    type={type}
                />
            </Modal>
        </>
    );
};
