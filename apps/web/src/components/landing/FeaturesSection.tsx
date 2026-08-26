'use client';

import React from 'react';
import { useTranslation } from '@refinedev/core';
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
                height: '100%',
            }}
        >
            {children}
        </Card>
    );

    const features = [
        {
            icon: <KeyOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />,
            title: translate('landing.features.apiKeys.title'),
            description: translate('landing.features.apiKeys.body'),
            tags: [
                { color: 'blue', text: translate('landing.features.apiKeys.t1') },
                { color: 'green', text: translate('landing.features.apiKeys.t2') },
                { color: 'purple', text: translate('landing.features.apiKeys.t3') },
            ],
        },
        {
            icon: <ThunderboltOutlined style={{ color: token.colorSuccess, fontSize: '20px' }} />,
            title: translate('landing.features.loadBalancing.title'),
            description: translate('landing.features.loadBalancing.body'),
            tags: [
                { color: 'green', text: translate('landing.features.loadBalancing.t1') },
                { color: 'orange', text: translate('landing.features.loadBalancing.t2') },
                { color: 'red', text: translate('landing.features.loadBalancing.t3') },
            ],
        },
        {
            icon: <BarChartOutlined style={{ color: token.colorWarning, fontSize: '20px' }} />,
            title: translate('landing.features.monitoring.title'),
            description: translate('landing.features.monitoring.body'),
            tags: [
                { color: 'blue', text: translate('landing.features.monitoring.t1') },
                { color: 'green', text: translate('landing.features.monitoring.t2') },
                { color: 'purple', text: translate('landing.features.monitoring.t3') },
            ],
        },
        {
            icon: <SafetyOutlined style={{ color: token.colorError, fontSize: '20px' }} />,
            title: translate('landing.features.security.title'),
            description: translate('landing.features.security.body'),
            tags: [
                { color: 'red', text: translate('landing.features.security.t1') },
                { color: 'orange', text: translate('landing.features.security.t2') },
                { color: 'blue', text: translate('landing.features.security.t3') },
            ],
        },
        {
            icon: <FileTextOutlined style={{ color: token.colorInfo, fontSize: '20px' }} />,
            title: translate('landing.features.logging.title'),
            description: translate('landing.features.logging.body'),
            tags: [
                { color: 'green', text: translate('landing.features.logging.t1') },
                { color: 'blue', text: translate('landing.features.logging.t2') },
                { color: 'purple', text: translate('landing.features.logging.t3') },
            ],
        },
        {
            icon: <GlobalOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />,
            title: translate('landing.features.platforms.title'),
            description: translate('landing.features.platforms.body'),
            tags: [
                { color: 'blue', text: translate('landing.features.platforms.t1') },
                { color: 'green', text: translate('landing.features.platforms.t2') },
                { color: 'orange', text: translate('landing.features.platforms.t3') },
            ],
        },
    ];

    return (
        <div style={{ padding: token.paddingLG }}>
            <Row justify="center" style={{ marginBottom: token.marginXL }}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: token.marginMD }}>
                        🚀 {translate('landing.features.heading')}
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        {translate('landing.features.subheading')}
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
