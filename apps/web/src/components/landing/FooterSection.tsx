'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { useTranslation } from '@refinedev/core';
import { Row, Col, Typography, Space, Tag, Divider, theme } from 'antd';
import { GithubOutlined, StarOutlined } from '@ant-design/icons';
import { SiNextdotjs, SiTypescript, SiSupabase, SiAntdesign, SiRefine } from 'react-icons/si';
import { ColorModeContext } from '@/contexts/color-mode';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

export const FooterSection: React.FC = () => {
    const { token } = useToken();
    const { mode } = useContext(ColorModeContext);
    const { translate } = useTranslation();

    // Theme-aware color helper
    const getThemeAwareColor = (lightColor: string, darkColor: string) => {
        return mode === 'dark' ? darkColor : lightColor;
    };

    return (
        <div
            style={{
                padding: token.paddingXL,
                textAlign: 'center',
                color: token.colorTextSecondary,
                background: token.colorFillQuaternary,
                borderTop: `1px solid ${token.colorBorder}`,
            }}
        >
            <Row justify="center" gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} md={20} lg={16}>
                    <Row gutter={[token.marginLG, token.marginLG]}>
                        <Col xs={24} md={8}>
                            <Title
                                level={5}
                                style={{ color: token.colorText, marginBottom: token.marginMD }}
                            >
                                🚀 Gemini Proxy
                            </Title>
                            <Paragraph style={{ color: token.colorTextSecondary, margin: 0 }}>
                                {translate('landing.footer.blurb')}
                            </Paragraph>
                        </Col>
                        <Col xs={24} md={8}>
                            <Title
                                level={5}
                                style={{ color: token.colorText, marginBottom: token.marginMD }}
                            >
                                🔗 {translate('landing.footer.quickLinks')}
                            </Title>
                            <Space direction="vertical" size="small">
                                <Link href="/dashboard" style={{ color: token.colorTextSecondary }}>
                                    {translate('landing.footer.dashboard')}
                                </Link>
                                <Link
                                    href="https://github.com/lehuygiang28/gemini-proxy"
                                    target="_blank"
                                    style={{ color: token.colorTextSecondary }}
                                >
                                    {translate('landing.footer.github')}
                                </Link>
                                <Link
                                    href="https://github.com/lehuygiang28/gemini-proxy/issues"
                                    target="_blank"
                                    style={{ color: token.colorTextSecondary }}
                                >
                                    {translate('landing.footer.issues')}
                                </Link>
                            </Space>
                        </Col>
                        <Col xs={24} md={8}>
                            <Title
                                level={5}
                                style={{ color: token.colorText, marginBottom: token.marginMD }}
                            >
                                🛠️ {translate('landing.footer.builtWith')}
                            </Title>
                            <Space wrap size={[12, 12]}>
                                <Tag
                                    color="blue"
                                    icon={
                                        <SiNextdotjs
                                            style={{
                                                color: getThemeAwareColor('#000000', '#FFFFFF'),
                                                fontSize: '14px',
                                                marginRight: '4px',
                                            }}
                                        />
                                    }
                                    style={{
                                        margin: '6px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        height: 'auto',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    Next.js 15
                                </Tag>
                                <Tag
                                    color="green"
                                    icon={
                                        <SiRefine
                                            style={{
                                                color: '#00FFFF',
                                                fontSize: '14px',
                                                marginRight: '4px',
                                            }}
                                        />
                                    }
                                    style={{
                                        margin: '6px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        height: 'auto',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    Refine v5
                                </Tag>
                                <Tag
                                    color="purple"
                                    icon={
                                        <SiAntdesign
                                            style={{
                                                color: '#1890FF',
                                                fontSize: '14px',
                                                marginRight: '4px',
                                            }}
                                        />
                                    }
                                    style={{
                                        margin: '6px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        height: 'auto',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    Ant Design
                                </Tag>
                                <Tag
                                    color="orange"
                                    icon={
                                        <SiSupabase
                                            style={{
                                                color: '#3ECF8E',
                                                fontSize: '14px',
                                                marginRight: '4px',
                                            }}
                                        />
                                    }
                                    style={{
                                        margin: '6px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        height: 'auto',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    Supabase
                                </Tag>
                                <Tag
                                    color="red"
                                    icon={
                                        <SiTypescript
                                            style={{
                                                color: '#3178C6',
                                                fontSize: '14px',
                                                marginRight: '4px',
                                            }}
                                        />
                                    }
                                    style={{
                                        margin: '6px',
                                        padding: '4px 12px',
                                        fontSize: '13px',
                                        height: 'auto',
                                        lineHeight: '1.4',
                                    }}
                                >
                                    TypeScript
                                </Tag>
                            </Space>
                        </Col>
                    </Row>

                    <Divider style={{ margin: `${token.marginLG}px 0` }} />

                    <Row justify="space-between" align="middle">
                        <Col>
                            <Text style={{ color: token.colorTextSecondary }}>
                                {translate('landing.footer.copyright', {
                                    year: new Date().getFullYear(),
                                })}{' '}
                                <Link
                                    href="https://github.com/lehuygiang28"
                                    target="_blank"
                                    style={{ color: token.colorPrimary }}
                                >
                                    lehuygiang28
                                </Link>
                            </Text>
                        </Col>
                        <Col>
                            <Space>
                                <Link
                                    href="https://github.com/lehuygiang28/gemini-proxy"
                                    target="_blank"
                                    style={{ color: token.colorTextSecondary }}
                                >
                                    <GithubOutlined style={{ fontSize: '18px' }} />
                                </Link>
                                <Link
                                    href="https://github.com/lehuygiang28/gemini-proxy/stargazers"
                                    target="_blank"
                                    style={{ color: token.colorTextSecondary }}
                                >
                                    <StarOutlined style={{ fontSize: '18px' }} />
                                </Link>
                            </Space>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
};
