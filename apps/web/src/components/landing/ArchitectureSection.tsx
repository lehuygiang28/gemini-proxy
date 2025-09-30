'use client';

import React from 'react';
import { Row, Col, Typography, Card, Space, Badge, Divider, theme } from 'antd';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const ArchitectureSection: React.FC = () => {
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
            }}
        >
            {children}
        </Card>
    );

    return (
        <div
            style={{
                paddingLeft: token.paddingLG,
                paddingRight: token.paddingLG,
                paddingBottom: token.paddingXL,
            }}
        >
            <Row justify="center" style={{ marginBottom: token.marginXL }}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: token.marginMD }}>
                        🏗️ Architecture
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        Simple, secure, and scalable architecture for production use
                    </Paragraph>
                </Col>
            </Row>

            <Row justify="center">
                <Col xs={24} md={20} lg={18}>
                    <SectionCard
                        title={
                            <Space>
                                <Badge color={token.colorPrimary} />
                                <span
                                    style={{
                                        color: token.colorText,
                                        fontSize: '18px',
                                        fontWeight: 600,
                                    }}
                                >
                                    🔄 How It Works
                                </span>
                            </Space>
                        }
                    >
                        <Row gutter={[token.marginLG, token.marginLG]} align="middle">
                            <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        padding: token.paddingLG,
                                        background: token.colorFillQuaternary,
                                        borderRadius: token.borderRadiusLG,
                                        border: `2px solid ${token.colorPrimary}`,
                                    }}
                                >
                                    <Title
                                        level={4}
                                        style={{
                                            color: token.colorPrimary,
                                            marginBottom: token.marginSM,
                                        }}
                                    >
                                        Your Application
                                    </Title>
                                    <Paragraph
                                        style={{ color: token.colorTextSecondary, margin: 0 }}
                                    >
                                        Makes API requests using your preferred SDK
                                    </Paragraph>
                                </div>
                            </Col>
                            <Col xs={24} md={2} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', color: token.colorPrimary }}>→</div>
                            </Col>
                            <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        padding: token.paddingLG,
                                        background: token.colorFillQuaternary,
                                        borderRadius: token.borderRadiusLG,
                                        border: `2px solid ${token.colorSuccess}`,
                                    }}
                                >
                                    <Title
                                        level={4}
                                        style={{
                                            color: token.colorSuccess,
                                            marginBottom: token.marginSM,
                                        }}
                                    >
                                        Gemini Proxy
                                    </Title>
                                    <Paragraph
                                        style={{ color: token.colorTextSecondary, margin: 0 }}
                                    >
                                        Intelligently routes requests to healthy API keys, logs
                                        request/response data, and manages load balancing
                                    </Paragraph>
                                </div>
                            </Col>
                            <Col xs={24} md={2} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', color: token.colorSuccess }}>→</div>
                            </Col>
                            <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                                <div
                                    style={{
                                        padding: token.paddingLG,
                                        background: token.colorFillQuaternary,
                                        borderRadius: token.borderRadiusLG,
                                        border: `2px solid ${token.colorWarning}`,
                                    }}
                                >
                                    <Title
                                        level={4}
                                        style={{
                                            color: token.colorWarning,
                                            marginBottom: token.marginSM,
                                        }}
                                    >
                                        Google Gemini API
                                    </Title>
                                    <Paragraph
                                        style={{ color: token.colorTextSecondary, margin: 0 }}
                                    >
                                        Processes your AI requests
                                    </Paragraph>
                                </div>
                            </Col>
                        </Row>

                        <Divider />

                        <Row gutter={[token.marginLG, token.marginLG]}>
                            <Col xs={24} md={12}>
                                <Title
                                    level={4}
                                    style={{
                                        color: token.colorText,
                                        marginBottom: token.marginMD,
                                    }}
                                >
                                    📊 Data Storage
                                </Title>
                                <Paragraph style={{ color: token.colorTextSecondary }}>
                                    All data is securely stored in Supabase PostgreSQL with Row
                                    Level Security (RLS) enabled for maximum protection. API keys,
                                    request logs, and analytics are stored with proper access
                                    controls and are accessible only to authorized users.
                                </Paragraph>
                            </Col>
                            <Col xs={24} md={12}>
                                <Title
                                    level={4}
                                    style={{
                                        color: token.colorText,
                                        marginBottom: token.marginMD,
                                    }}
                                >
                                    🔒 Security Features
                                </Title>
                                <Paragraph style={{ color: token.colorTextSecondary }}>
                                    Built with enterprise-grade security including RLS policies,
                                    typed RPCs, secure environment handling, and comprehensive audit
                                    logging for compliance.
                                </Paragraph>
                            </Col>
                        </Row>
                    </SectionCard>
                </Col>
            </Row>
        </div>
    );
};
