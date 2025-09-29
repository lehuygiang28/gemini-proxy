'use client';

import React from 'react';
import Link from 'next/link';
import { Row, Col, Typography, Button, Card, Space, Tabs, Badge, theme } from 'antd';
import {
    ThunderboltOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    FileTextOutlined,
    GithubOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

export default function IndexPage() {
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

    const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
        <pre
            className="gp-scrollable"
            style={{
                background: token.colorFillQuaternary,
                padding: token.paddingMD,
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorder}`,
                color: token.colorText,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                maxWidth: '100%',
                boxSizing: 'border-box',
                maxHeight: 360,
                overflow: 'auto',
            }}
        >
            {code}
        </pre>
    );

    return (
        <div
            style={{
                minHeight: '100vh',
                background: token.colorBgLayout,
            }}
        >
            {/* Hero */}
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
                        <Title
                            style={{ marginBottom: token.marginSM, color: token.colorTextHeading }}
                        >
                            Gemini Proxy
                        </Title>
                        <Paragraph
                            style={{
                                color: token.colorTextSecondary,
                                marginBottom: token.marginLG,
                            }}
                        >
                            Production-ready proxy for Google Gemini with secure key management,
                            intelligent load balancing, detailed request logging, and seamless
                            streaming. Built with Refine, Next.js, Ant Design, and Supabase.
                        </Paragraph>
                        <Space size="middle" wrap>
                            <Link href="/dashboard">
                                <Button
                                    type="primary"
                                    size="large"
                                    shape="round"
                                    icon={<ThunderboltOutlined />}
                                >
                                    Get Started
                                </Button>
                            </Link>
                            <Link
                                href="https://github.com/lehuygiang28/gemini-proxy"
                                target="_blank"
                            >
                                <Button size="large" shape="round" icon={<GithubOutlined />}>
                                    GitHub
                                </Button>
                            </Link>
                        </Space>
                    </Col>
                </Row>
            </div>

            {/* Value Props */}
            <div style={{ padding: token.paddingLG }}>
                <Row gutter={[token.marginLG, token.marginLG]} justify="center">
                    <Col xs={24} md={20} lg={18}>
                        <Row gutter={[token.marginLG, token.marginLG]}>
                            <Col xs={24} md={12}>
                                <SectionCard
                                    title={
                                        <Space>
                                            <KeyOutlined style={{ color: token.colorPrimary }} />
                                            <span style={{ color: token.colorText }}>
                                                Secure Key Management
                                            </span>
                                        </Space>
                                    }
                                >
                                    <Paragraph style={{ color: token.colorTextSecondary }}>
                                        Rotate, balance, and monitor API keys with RLS-secured
                                        storage. Import in bulk and track usage with real-time
                                        statistics.
                                    </Paragraph>
                                </SectionCard>
                            </Col>
                            <Col xs={24} md={12}>
                                <SectionCard
                                    title={
                                        <Space>
                                            <FileTextOutlined
                                                style={{ color: token.colorSuccess }}
                                            />
                                            <span style={{ color: token.colorText }}>
                                                Comprehensive Logging
                                            </span>
                                        </Space>
                                    }
                                >
                                    <Paragraph style={{ color: token.colorTextSecondary }}>
                                        Request/response logs with performance metrics, retries, and
                                        export. Inspect via modals or dedicated pages with intercept
                                        routes.
                                    </Paragraph>
                                </SectionCard>
                            </Col>
                            <Col xs={24} md={12}>
                                <SectionCard
                                    title={
                                        <Space>
                                            <SafetyCertificateOutlined
                                                style={{ color: token.colorWarning }}
                                            />
                                            <span style={{ color: token.colorText }}>
                                                Production Security
                                            </span>
                                        </Space>
                                    }
                                >
                                    <Paragraph style={{ color: token.colorTextSecondary }}>
                                        Supabase RLS, typed RPCs, and strict form handling. No side
                                        effects; all user context is injected at action time.
                                    </Paragraph>
                                </SectionCard>
                            </Col>
                            <Col xs={24} md={12}>
                                <SectionCard
                                    title={
                                        <Space>
                                            <ThunderboltOutlined
                                                style={{ color: token.colorInfo }}
                                            />
                                            <span style={{ color: token.colorText }}>
                                                Great DX & UX
                                            </span>
                                        </Space>
                                    }
                                >
                                    <Paragraph style={{ color: token.colorTextSecondary }}>
                                        Refine v5 hooks, Ant Design tokens, type-safe data provider
                                        with RPC, and responsive UI built for scale.
                                    </Paragraph>
                                </SectionCard>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </div>

            {/* Integration Examples */}
            <div
                style={{
                    paddingLeft: token.paddingLG,
                    paddingRight: token.paddingLG,
                    paddingBottom: token.paddingXL,
                }}
            >
                <Row justify="center">
                    <Col xs={24} md={20} lg={18}>
                        <SectionCard
                            title={
                                <Space>
                                    <Badge color={token.colorPrimary} />
                                    <span style={{ color: token.colorText }}>Quick Start</span>
                                </Space>
                            }
                        >
                            <Tabs
                                items={[
                                    {
                                        key: 'google-genai',
                                        label: '@google/genai',
                                        children: (
                                            <CodeBlock
                                                code={`import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    httpOptions: { baseUrl: 'https://your-domain.com/api/gproxy/gemini' },
});

const stream = await genAI.models.generateContentStream({
    model: 'gemini-2.5-pro',
    contents: 'Write a short poem about the sea.'
});

for await (const chunk of stream) {
    process.stdout.write(chunk.text);
}`}
                                            />
                                        ),
                                    },
                                    {
                                        key: 'openai',
                                        label: 'OpenAI SDK',
                                        children: (
                                            <CodeBlock
                                                code={`import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://your-domain.com/api/gproxy/openai',
    apiKey: 'YOUR_PROXY_API_KEY',
});

const chat = await openai.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: true,
});

for await (const chunk of chat) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`}
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </SectionCard>
                    </Col>
                </Row>
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: token.paddingLG,
                    textAlign: 'center',
                    color: token.colorTextSecondary,
                }}
            >
                <Text>
                    © {new Date().getFullYear()} Gemini Proxy • Built with Refine & Ant Design •{' '}
                    <Link href="https://github.com/lehuygiang28/gemini-proxy" target="_blank">
                        GitHub
                    </Link>
                </Text>
            </div>
        </div>
    );
}
