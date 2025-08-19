'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, Col, Row, Typography, List as AntList, Space, theme } from 'antd';
import {
    KeyOutlined,
    SafetyCertificateOutlined,
    FileTextOutlined,
    RocketOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

export default function LandingPage() {
    const { token } = useToken();

    const features = [
        {
            icon: <KeyOutlined style={{ fontSize: 24, color: token.colorPrimary }} />,
            title: 'API Key Management',
            description:
                'Securely store and manage provider API keys with usage tracking and rotation capabilities.',
        },
        {
            icon: <SafetyCertificateOutlined style={{ fontSize: 24, color: token.colorSuccess }} />,
            title: 'Proxy API Keys',
            description:
                'Issue proxy keys for clients with aggregated usage monitoring and access control.',
        },
        {
            icon: <FileTextOutlined style={{ fontSize: 24, color: token.colorWarning }} />,
            title: 'Request Logs',
            description:
                'Comprehensive logging of all API requests with performance metrics and error tracking.',
        },
        {
            icon: <RocketOutlined style={{ fontSize: 24, color: token.colorInfo }} />,
            title: 'Multi-Provider Support',
            description:
                'Support for Google Gemini, OpenAI GPT, Anthropic Claude, and other major AI providers.',
        },
    ];

    const guides = [
        {
            title: 'Set up environment variables',
            description:
                'Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_ANON_SUPABASE_KEY in your environment.',
        },
        {
            title: 'Create your first API Key',
            description:
                'After logging in, navigate to API Keys and add your provider credentials.',
        },
        {
            title: 'Generate proxy keys',
            description: 'Create proxy API keys for your applications to use the proxy service.',
        },
        {
            title: 'Monitor usage',
            description:
                'Track request logs and usage metrics through the dashboard and logs pages.',
        },
    ];

    const containerStyles: React.CSSProperties = {
        maxWidth: 1200,
        margin: '0 auto',
        padding: token.paddingLG,
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    };

    const cardStyles: React.CSSProperties = {
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
    };

    const stepNumberStyles: React.CSSProperties = {
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: token.colorPrimary,
        color: token.colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 'bold',
    };

    return (
        <div style={containerStyles}>
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <Title style={{ color: token.colorText, marginBottom: token.marginMD }}>
                            Gemini Proxy
                        </Title>
                        <Paragraph
                            style={{
                                fontSize: 18,
                                maxWidth: 600,
                                margin: '0 auto',
                                color: token.colorTextSecondary,
                            }}
                        >
                            A production-ready API proxy management system for AI providers.
                            Securely manage API keys, monitor usage, and provide controlled access
                            to AI services.
                        </Paragraph>
                        <Space size="large" style={{ marginTop: 24 }}>
                            <Link href="/login">
                                <Button type="primary" size="large">
                                    Login
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="large">Register</Button>
                            </Link>
                        </Space>
                    </div>
                </Col>

                <Col span={24}>
                    <Title level={3} style={{ marginBottom: 24, color: token.colorText }}>
                        Key Features
                    </Title>
                    <Row gutter={[16, 16]}>
                        {features.map((feature) => (
                            <Col key={feature.title} xs={24} md={12}>
                                <Card style={cardStyles}>
                                    <Space direction="vertical" size="small">
                                        {feature.icon}
                                        <Title
                                            level={4}
                                            style={{ margin: 0, color: token.colorText }}
                                        >
                                            {feature.title}
                                        </Title>
                                        <Text
                                            type="secondary"
                                            style={{ color: token.colorTextSecondary }}
                                        >
                                            {feature.description}
                                        </Text>
                                    </Space>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>

                <Col span={24}>
                    <Card title="Getting Started" style={cardStyles}>
                        <AntList
                            itemLayout="vertical"
                            dataSource={guides}
                            renderItem={(item, index) => (
                                <AntList.Item>
                                    <Space>
                                        <div style={stepNumberStyles}>{index + 1}</div>
                                        <div>
                                            <Title
                                                level={5}
                                                style={{
                                                    marginBottom: 4,
                                                    color: token.colorText,
                                                }}
                                            >
                                                {item.title}
                                            </Title>
                                            <Text
                                                type="secondary"
                                                style={{ color: token.colorTextSecondary }}
                                            >
                                                {item.description}
                                            </Text>
                                        </div>
                                    </Space>
                                </AntList.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
