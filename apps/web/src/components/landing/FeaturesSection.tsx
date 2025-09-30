'use client';

import React from 'react';
import { Row, Col, Typography, Card, Space, Tag, theme } from 'antd';
import {
    KeyOutlined,
    ThunderboltOutlined,
    BarChartOutlined,
    SafetyOutlined,
    FileTextOutlined,
    GlobalOutlined,
} from '@ant-design/icons';
import { SiSupabase, SiNextdotjs, SiTypescript } from 'react-icons/si';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const FeaturesSection: React.FC = () => {
    const { token } = useToken();

    const SectionCard: React.FC<
        React.PropsWithChildren<{ title: React.ReactNode; extra?: React.ReactNode }>
    > = ({ title, extra, children }) => (
        <Card
            title={title}
            extra={extra}
            style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
                background: token.colorBgContainer,
                height: '100%',
            }}
        >
            {children}
        </Card>
    );

    const features = [
        {
            icon: <KeyOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />,
            title: '🔑 API Key Management',
            description:
                'Secure storage and intelligent rotation of multiple Google Gemini API keys with real-time usage tracking.',
            tags: [
                { color: 'blue', text: 'Secure Storage' },
                { color: 'green', text: 'Key Rotation' },
                { color: 'purple', text: 'Usage Analytics' },
            ],
        },
        {
            icon: <ThunderboltOutlined style={{ color: token.colorSuccess, fontSize: '20px' }} />,
            title: '⚡ Load Balancing',
            description:
                'Intelligent request distribution across multiple API keys with automatic failover and retry mechanisms.',
            tags: [
                { color: 'green', text: 'Auto Distribution' },
                { color: 'orange', text: 'Failover' },
                { color: 'red', text: 'Retry Logic' },
            ],
        },
        {
            icon: <BarChartOutlined style={{ color: token.colorWarning, fontSize: '20px' }} />,
            title: '📊 Monitoring & Analytics',
            description:
                'Real-time request logging, performance metrics, cost tracking, and comprehensive dashboards.',
            tags: [
                { color: 'blue', text: 'Real-time Logs' },
                { color: 'green', text: 'Performance Metrics' },
                { color: 'purple', text: 'Cost Tracking' },
            ],
        },
        {
            icon: <SafetyOutlined style={{ color: token.colorError, fontSize: '20px' }} />,
            title: '🛡️ Security & Access Control',
            description:
                'Proxy API key management, request authentication, rate limiting, and secure environment handling.',
            tags: [
                { color: 'red', text: 'Authentication' },
                { color: 'orange', text: 'Rate Limiting' },
                { color: 'blue', text: 'Secure Storage' },
            ],
        },
        {
            icon: <FileTextOutlined style={{ color: token.colorInfo, fontSize: '20px' }} />,
            title: '📝 Comprehensive Logging',
            description:
                'Detailed request/response logs with performance metrics, retry attempts, and export capabilities.',
            tags: [
                { color: 'green', text: 'Request Logs' },
                { color: 'blue', text: 'Response Tracking' },
                { color: 'purple', text: 'Export Data' },
            ],
        },
        {
            icon: <GlobalOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />,
            title: '🌍 Multi-Platform Support',
            description:
                'Deploy anywhere with support for Next.js, Vercel, Cloudflare, Appwrite, and standalone servers.',
            tags: [
                { color: 'blue', text: 'Next.js' },
                { color: 'green', text: 'Vercel' },
                { color: 'orange', text: 'Cloudflare' },
            ],
        },
    ];

    return (
        <div style={{ padding: token.paddingLG }}>
            <Row justify="center" style={{ marginBottom: token.marginXL }}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: token.marginMD }}>
                        🚀 Core Features
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        Everything you need to manage, monitor, and scale your Gemini API usage
                    </Paragraph>
                </Col>
            </Row>

            <Row gutter={[token.marginLG, token.marginLG]} justify="center">
                <Col xs={24} md={20} lg={18}>
                    <Row gutter={[token.marginLG, token.marginLG]}>
                        {features.map((feature, index) => (
                            <Col xs={24} md={12} lg={8} key={index}>
                                <SectionCard
                                    title={
                                        <Space>
                                            {feature.icon}
                                            <span
                                                style={{
                                                    color: token.colorText,
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {feature.title}
                                            </span>
                                        </Space>
                                    }
                                >
                                    <Paragraph
                                        style={{
                                            color: token.colorTextSecondary,
                                            marginBottom: token.marginMD,
                                        }}
                                    >
                                        {feature.description}
                                    </Paragraph>
                                    <Space wrap>
                                        {feature.tags.map((tag, tagIndex) => (
                                            <Tag key={tagIndex} color={tag.color}>
                                                {tag.text}
                                            </Tag>
                                        ))}
                                    </Space>
                                </SectionCard>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>
        </div>
    );
};
