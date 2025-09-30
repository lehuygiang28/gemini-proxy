'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { Row, Col, Typography, Button, Space, Badge, theme } from 'antd';
import { RocketOutlined, GithubOutlined } from '@ant-design/icons';
import { SiNextdotjs, SiTypescript, SiSupabase, SiAntdesign } from 'react-icons/si';
import { ColorModeContext } from '@/contexts/color-mode';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const HeroSection: React.FC = () => {
    const { token } = useToken();
    const { mode } = useContext(ColorModeContext);

    // Theme-aware color helper
    const getThemeAwareColor = (lightColor: string, darkColor: string) => {
        return mode === 'dark' ? darkColor : lightColor;
    };

    return (
        <div
            style={{
                paddingTop: token.paddingXL,
                paddingBottom: token.paddingXL,
                paddingLeft: token.paddingLG,
                paddingRight: token.paddingLG,
                background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillQuaternary} 100%)`,
            }}
        >
            <Row justify="center" gutter={[token.marginLG, token.marginLG]}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    {/* Badges */}
                    <Space size="middle" wrap style={{ marginBottom: token.marginMD }}>
                        <Badge
                            color="green"
                            text={
                                <Space size={4}>
                                    <span>MIT License</span>
                                </Space>
                            }
                        />
                        <Badge
                            color="blue"
                            text={
                                <Space size={6}>
                                    <SiTypescript style={{ color: '#3178C6', fontSize: '14px' }} />
                                    <span>TypeScript</span>
                                </Space>
                            }
                        />
                        <Badge
                            color="purple"
                            text={
                                <Space size={6}>
                                    <SiNextdotjs
                                        style={{
                                            color: getThemeAwareColor('#000000', '#FFFFFF'),
                                            fontSize: '14px',
                                        }}
                                    />
                                    <span>Next.js 15</span>
                                </Space>
                            }
                        />
                        <Badge
                            color="orange"
                            text={
                                <Space size={6}>
                                    <SiSupabase style={{ color: '#3ECF8E', fontSize: '14px' }} />
                                    <span>Supabase</span>
                                </Space>
                            }
                        />
                        <Badge
                            color="red"
                            text={
                                <Space size={6}>
                                    <SiAntdesign style={{ color: '#1890FF', fontSize: '14px' }} />
                                    <span>Ant Design</span>
                                </Space>
                            }
                        />
                    </Space>

                    <Title
                        level={1}
                        style={{
                            marginBottom: token.marginSM,
                            color: token.colorTextHeading,
                            fontSize: '3.5rem',
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorSuccess} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        Gemini Proxy
                    </Title>

                    <Title
                        level={3}
                        style={{
                            color: token.colorTextSecondary,
                            fontWeight: 400,
                            marginBottom: token.marginLG,
                        }}
                    >
                        Production-Ready API Proxy for Google Gemini
                    </Title>

                    <Paragraph
                        style={{
                            color: token.colorTextSecondary,
                            marginBottom: token.marginLG,
                            fontSize: '1.1rem',
                            lineHeight: 1.6,
                            maxWidth: '800px',
                            margin: '0 auto',
                        }}
                    >
                        Secure key management, intelligent load balancing, comprehensive monitoring,
                        and seamless streaming. Deploy anywhere with our multi-platform support.
                    </Paragraph>

                    <Space
                        size="large"
                        wrap
                        style={{ marginBottom: token.marginLG, paddingTop: token.paddingSM }}
                    >
                        <Link href="/dashboard">
                            <Button
                                type="primary"
                                size="large"
                                shape="round"
                                icon={<RocketOutlined />}
                                style={{
                                    height: '48px',
                                    paddingLeft: '32px',
                                    paddingRight: '32px',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                }}
                            >
                                Get Started
                            </Button>
                        </Link>
                        <Link href="https://github.com/lehuygiang28/gemini-proxy" target="_blank">
                            <Button
                                size="large"
                                shape="round"
                                icon={<GithubOutlined />}
                                style={{
                                    height: '48px',
                                    paddingLeft: '32px',
                                    paddingRight: '32px',
                                    fontSize: '16px',
                                }}
                            >
                                View on GitHub
                            </Button>
                        </Link>
                    </Space>
                </Col>
            </Row>
        </div>
    );
};
