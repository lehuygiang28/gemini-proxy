'use client';

import React from 'react';
import { useTranslation } from '@refinedev/core';
import { Row, Col, Typography, Card, Space, Badge, Divider, theme } from 'antd';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const ArchitectureSection: React.FC = () => {
    const { token } = useToken();
    const { translate } = useTranslation();

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
                        🏗️ {translate('landing.architecture.heading')}
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        {translate('landing.architecture.subheading')}
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
                                    🔄 {translate('landing.architecture.howItWorks')}
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
                                        {translate('landing.architecture.yourApp')}
                                    </Title>
                                    <Paragraph
                                        style={{ color: token.colorTextSecondary, margin: 0 }}
                                    >
                                        {translate('landing.architecture.yourAppBody')}
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
                                        {translate('landing.architecture.proxyBody')}
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
                                        {translate('landing.architecture.geminiApi')}
                                    </Title>
                                    <Paragraph
                                        style={{ color: token.colorTextSecondary, margin: 0 }}
                                    >
                                        {translate('landing.architecture.geminiApiBody')}
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
                                    📊 {translate('landing.architecture.dataStorage')}
                                </Title>
                                <Paragraph style={{ color: token.colorTextSecondary }}>
                                    {translate('landing.architecture.dataStorageBody')}
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
                                    🔒 {translate('landing.architecture.security')}
                                </Title>
                                <Paragraph style={{ color: token.colorTextSecondary }}>
                                    {translate('landing.architecture.securityBody')}
                                </Paragraph>
                            </Col>
                        </Row>
                    </SectionCard>
                </Col>
            </Row>
        </div>
    );
};
