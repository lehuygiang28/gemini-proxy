'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, Col, Row, Typography, List as AntList } from 'antd';

const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
    const features = [
        {
            title: 'API Key Management',
            description: 'Create, rotate, and monitor provider API keys with usage stats.',
        },
        {
            title: 'Proxy API Keys',
            description: 'Issue proxy keys for clients; aggregate usage and control access.',
        },
        {
            title: 'Request Logs',
            description: 'Inspect requests/responses, errors, and token usage for debugging.',
        },
        {
            title: 'Supabase Auth',
            description: 'Secure login/register/forgot-password flows backed by Supabase.',
        },
    ];

    const guides = [
        {
            title: 'Set environment variables',
            description: 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_ANON_SUPABASE_KEY',
        },
        {
            title: 'Create your first API Key',
            description: 'After logging in, go to API Keys and add one with provider info.',
        },
        {
            title: 'Send requests through /api/gproxy',
            description: 'Use your proxy key to call supported providers via the proxy route.',
        },
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24 }}>
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <Title>Gemini Proxy</Title>
                    <Paragraph>
                        A production-ready admin for managing provider API keys, proxy keys, and
                        request logs built with Ant Design, Refine, and Supabase.
                    </Paragraph>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <Link href="/login">
                            <Button type="primary">Login</Button>
                        </Link>
                        <Link href="/register">
                            <Button>Register</Button>
                        </Link>
                    </div>
                </Col>

                <Col span={24}>
                    <Row gutter={[16, 16]}>
                        {features.map((f) => (
                            <Col key={f.title} xs={24} md={12}>
                                <Card title={f.title} bordered>
                                    <Paragraph>{f.description}</Paragraph>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>

                <Col span={24}>
                    <Card title="Quick Start">
                        <AntList
                            itemLayout="vertical"
                            dataSource={guides}
                            renderItem={(item) => (
                                <AntList.Item>
                                    <Title level={5} style={{ marginBottom: 4 }}>
                                        {item.title}
                                    </Title>
                                    <Text type="secondary">{item.description}</Text>
                                </AntList.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
