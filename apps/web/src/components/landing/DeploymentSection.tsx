'use client';

import React, { useContext } from 'react';
import { useTranslation } from '@refinedev/core';
import { Row, Col, Typography, Card, Space, Badge, Tag, theme } from 'antd';
import { RocketOutlined, ApiOutlined, CloudOutlined } from '@ant-design/icons';
import { FaNodeJs, FaCloudflare, FaAws } from 'react-icons/fa';
import {
    SiDeno,
    SiBun,
    SiSupabase,
    SiVercel,
    SiNetlify,
    SiAppwrite,
    SiTypescript,
} from 'react-icons/si';
import { ColorModeContext } from '@/contexts/color-mode';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const DeploymentSection: React.FC = () => {
    const { token } = useToken();
    const { mode } = useContext(ColorModeContext);
    const { translate } = useTranslation();

    // Theme-aware color helper
    const getThemeAwareColor = (lightColor: string, darkColor: string) => {
        return mode === 'dark' ? darkColor : lightColor;
    };

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

    const deploymentOptions = [
        {
            icon: <RocketOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />,
            title: translate('landing.deployment.web.title'),
            badge: <Badge color="green" text={translate('landing.deployment.web.badge')} />,
            description: translate('landing.deployment.web.body'),
            tags: [
                { color: 'blue', text: translate('landing.deployment.web.t1') },
                { color: 'green', text: translate('landing.deployment.web.t2') },
                { color: 'purple', text: translate('landing.deployment.web.t3') },
            ],
            platforms: [
                {
                    icon: (
                        <SiVercel
                            style={{
                                fontSize: '20px',
                                color: getThemeAwareColor('#000000', '#FFFFFF'),
                            }}
                        />
                    ),
                    name: 'Vercel',
                },
                {
                    icon: <SiNetlify style={{ fontSize: '20px', color: '#00C7B7' }} />,
                    name: 'Netlify',
                },
                { icon: <FaAws style={{ fontSize: '20px', color: '#FF9900' }} />, name: 'AWS' },
            ],
        },
        {
            icon: <ApiOutlined style={{ color: token.colorSuccess, fontSize: '20px' }} />,
            title: translate('landing.deployment.api.title'),
            badge: <Badge color="blue" text={translate('landing.deployment.api.badge')} />,
            description: translate('landing.deployment.api.body'),
            tags: [
                { color: 'orange', text: translate('landing.deployment.api.t1') },
                { color: 'blue', text: translate('landing.deployment.api.t2') },
                { color: 'green', text: translate('landing.deployment.api.t3') },
            ],
            platforms: [
                {
                    icon: <FaNodeJs style={{ fontSize: '20px', color: '#339933' }} />,
                    name: 'Node.js',
                },
                {
                    icon: (
                        <SiDeno
                            style={{
                                fontSize: '20px',
                                color: getThemeAwareColor('#000000', '#FFFFFF'),
                            }}
                        />
                    ),
                    name: 'Deno',
                },
                { icon: <SiBun style={{ fontSize: '20px', color: '#FBF0DF' }} />, name: 'Bun' },
                {
                    icon: <SiTypescript style={{ fontSize: '20px', color: '#3178C6' }} />,
                    name: 'TypeScript',
                },
            ],
        },
        {
            icon: <CloudOutlined style={{ color: token.colorWarning, fontSize: '20px' }} />,
            title: translate('landing.deployment.edge.title'),
            badge: <Badge color="purple" text={translate('landing.deployment.edge.badge')} />,
            description: translate('landing.deployment.edge.body'),
            tags: [
                { color: 'blue', text: translate('landing.deployment.edge.t1') },
                { color: 'green', text: translate('landing.deployment.edge.t2') },
                { color: 'orange', text: translate('landing.deployment.edge.t3') },
            ],
            platforms: [
                {
                    icon: (
                        <SiVercel
                            style={{
                                fontSize: '20px',
                                color: getThemeAwareColor('#000000', '#FFFFFF'),
                            }}
                        />
                    ),
                    name: 'Vercel',
                },
                {
                    icon: <FaCloudflare style={{ fontSize: '20px', color: '#F38020' }} />,
                    name: 'Cloudflare',
                },
                {
                    icon: <SiAppwrite style={{ fontSize: '20px', color: '#F02E65' }} />,
                    name: 'Appwrite',
                },
                {
                    icon: <SiSupabase style={{ fontSize: '20px', color: '#3ECF8E' }} />,
                    name: 'Supabase',
                },
            ],
        },
    ];

    return (
        <div
            style={{
                paddingLeft: token.paddingLG,
                paddingRight: token.paddingLG,
                paddingBottom: token.paddingXL,
                background: token.colorFillQuaternary,
            }}
        >
            <Row justify="center" style={{ marginBottom: token.marginXL }}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: token.marginMD }}>
                        🌐 {translate('landing.deployment.heading')}
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        {translate('landing.deployment.subheading')}
                    </Paragraph>
                </Col>
            </Row>

            <Row gutter={[token.marginLG, token.marginLG]} justify="center">
                <Col xs={24} md={20} lg={18}>
                    <Row gutter={[token.marginLG, token.marginLG]}>
                        {deploymentOptions.map((option, index) => (
                            <Col xs={24} md={12} lg={8} key={index}>
                                <SectionCard
                                    title={
                                        <Space>
                                            {option.icon}
                                            <span
                                                style={{
                                                    color: token.colorText,
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {option.title}
                                            </span>
                                        </Space>
                                    }
                                    extra={option.badge}
                                >
                                    <Paragraph
                                        style={{
                                            color: token.colorTextSecondary,
                                            marginBottom: token.marginMD,
                                        }}
                                    >
                                        {option.description}
                                    </Paragraph>

                                    <div style={{ marginBottom: token.marginMD }}>
                                        <Paragraph
                                            style={{
                                                color: token.colorText,
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                marginBottom: token.marginSM,
                                            }}
                                        >
                                            {translate('landing.deployment.platforms')}
                                        </Paragraph>
                                        <Space wrap size={[12, 12]}>
                                            {option.platforms.map((platform, platformIndex) => (
                                                <Space
                                                    key={platformIndex}
                                                    size={6}
                                                    style={{
                                                        margin: '6px',
                                                        padding: '6px 10px',
                                                        background: token.colorFillQuaternary,
                                                        borderRadius: '8px',
                                                        border: `1px solid ${token.colorBorder}`,
                                                    }}
                                                >
                                                    {platform.icon}
                                                    <span
                                                        style={{
                                                            fontSize: '13px',
                                                            fontWeight: 500,
                                                            color: token.colorText,
                                                        }}
                                                    >
                                                        {platform.name}
                                                    </span>
                                                </Space>
                                            ))}
                                        </Space>
                                    </div>

                                    <Space wrap size={[8, 8]}>
                                        {option.tags.map((tag, tagIndex) => (
                                            <Tag
                                                key={tagIndex}
                                                color={tag.color}
                                                style={{
                                                    margin: '4px',
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    height: 'auto',
                                                    lineHeight: '1.3',
                                                    borderRadius: '12px',
                                                }}
                                            >
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
