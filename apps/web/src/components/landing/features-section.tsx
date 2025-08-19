'use client';

import React from 'react';
import { Card, Col, Row, Typography, theme } from 'antd';
import {
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
    RocketOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export function FeaturesSection() {
    const { token } = useToken();

    const features = [
        {
            icon: <KeyOutlined style={{ fontSize: 32, color: token.colorPrimary }} />,
            title: 'Intelligent Key Management',
            description:
                'Automatically rotate and retry API keys to ensure high availability and resilience.',
        },
        {
            icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: token.colorSuccess }} />,
            title: 'Streaming Support',
            description:
                'Full support for streaming responses from both Gemini and OpenAI-compatible APIs.',
        },
        {
            icon: <FileTextOutlined style={{ fontSize: 32, color: token.colorWarning }} />,
            title: 'Comprehensive Logging',
            description:
                'Track every request and analyze usage metadata for better insights and cost management.',
        },
        {
            icon: <RocketOutlined style={{ fontSize: 32, color: token.colorInfo }} />,
            title: 'Platform Agnostic',
            description:
                'A single core package that can be deployed across various platforms and runtimes.',
        },
    ];

    const cardStyles: React.CSSProperties = {
        borderRadius: token.borderRadiusLG,
        padding: token.paddingLG,
        textAlign: 'center',
        height: '100%',
        border: `1px solid ${token.colorBorderSecondary}`,
        transition: 'all 0.3s ease',
    };

    return (
        <div style={{ padding: '80px 0', background: token.colorBgLayout }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <Title
                    level={2}
                    style={{
                        textAlign: 'center',
                        marginBottom: 64,
                        color: token.colorTextHeading,
                    }}
                >
                    Everything you need for production
                </Title>
                <Row gutter={[32, 32]}>
                    {features.map((feature) => (
                        <Col key={feature.title} xs={24} sm={12} md={6}>
                            <Card
                                hoverable
                                style={cardStyles}
                                styles={{
                                    header: { border: 0 },
                                    body: { padding: 0 },
                                }}
                            >
                                {feature.icon}
                                <Title level={4} style={{ marginTop: 24, marginBottom: 8 }}>
                                    {feature.title}
                                </Title>
                                <Paragraph type="secondary">{feature.description}</Paragraph>
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>
        </div>
    );
}
