'use client';

import React from 'react';
import { Col, Row, Typography, theme, Divider } from 'antd';
import { FaNodeJs, FaCloudflare, FaAws } from 'react-icons/fa';
import {
    SiDeno,
    SiBun,
    SiSupabase,
    SiVercel,
    SiNetlify,
    SiFastly,
    SiAppwrite,
    SiGooglecloud,
} from 'react-icons/si';
import { VscAzure } from 'react-icons/vsc';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export function PlatformSection() {
    const { token } = useToken();

    const runtimes = [
        {
            icon: <FaNodeJs style={{ fontSize: 48, color: '#339933' }} />,
            name: 'Node.js',
        },
        {
            icon: <SiDeno style={{ fontSize: 48, color: token.colorText }} />,
            name: 'Deno',
        },
        {
            icon: <SiBun style={{ fontSize: 48, color: '#FBF0DF' }} />,
            name: 'Bun',
        },
    ];

    const platforms = [
        {
            icon: <SiVercel style={{ fontSize: 48, color: token.colorText }} />,
            name: 'Vercel',
        },
        {
            icon: <FaCloudflare style={{ fontSize: 48, color: '#F38020' }} />,
            name: 'Cloudflare',
        },
        {
            icon: <SiSupabase style={{ fontSize: 48, color: '#3ECF8E' }} />,
            name: 'Supabase',
        },
    ];

    return (
        <div style={{ padding: '80px 24px', background: token.colorBgContainer }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Title
                    level={2}
                    style={{
                        textAlign: 'center',
                        marginBottom: 16,
                        color: token.colorTextHeading,
                    }}
                >
                    Run Anywhere, Deploy Everywhere
                </Title>
                <Paragraph
                    type="secondary"
                    style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 64px' }}
                >
                    Gemini Proxy&apos;s platform-agnostic core is designed for flexibility, allowing
                    you to run it in your preferred environment and deploy it to your favorite
                    platform.
                </Paragraph>

                <Title level={4} style={{ textAlign: 'center', marginBottom: 32 }}>
                    Supported Runtimes
                </Title>
                <Row gutter={[32, 32]} justify="center" align="middle">
                    {runtimes.map((runtime) => (
                        <Col
                            key={runtime.name}
                            xs={12}
                            sm={8}
                            md={8}
                            style={{ textAlign: 'center' }}
                        >
                            {runtime.icon}
                            <Title level={5} style={{ marginTop: 16 }}>
                                {runtime.name}
                            </Title>
                        </Col>
                    ))}
                </Row>

                <Divider />

                <Title level={4} style={{ textAlign: 'center', marginBottom: 32 }}>
                    Deployment Platforms
                </Title>
                <Row gutter={[32, 32]} justify="center" align="middle">
                    {platforms.map((platform) => (
                        <Col
                            key={platform.name}
                            xs={12}
                            sm={8}
                            md={8}
                            style={{ textAlign: 'center' }}
                        >
                            {platform.icon}
                            <Title level={5} style={{ marginTop: 16 }}>
                                {platform.name}
                            </Title>
                        </Col>
                    ))}
                </Row>

                <Divider />

                <Title level={4} style={{ textAlign: 'center', marginBottom: 32 }}>
                    Coming Soon
                </Title>
                <Paragraph
                    type="secondary"
                    style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 32px' }}
                >
                    We are constantly working to expand our platform support. If you don&apos;t see
                    your favorite platform, let us know!
                </Paragraph>
                <Row gutter={[32, 32]} justify="center" align="middle">
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <SiNetlify style={{ fontSize: 48, color: '#00C7B7' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            Netlify
                        </Title>
                    </Col>
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <SiFastly style={{ fontSize: 48, color: '#FF282D' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            Fastly
                        </Title>
                    </Col>
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <SiAppwrite style={{ fontSize: 48, color: '#F02E65' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            Appwrite
                        </Title>
                    </Col>
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <SiGooglecloud style={{ fontSize: 48, color: '#4285F4' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            Google Cloud
                        </Title>
                    </Col>
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <VscAzure style={{ fontSize: 48, color: '#0089D6' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            Azure
                        </Title>
                    </Col>
                    <Col xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                        <FaAws style={{ fontSize: 48, color: '#232F3E' }} />
                        <Title level={5} style={{ marginTop: 16 }}>
                            AWS Lambda
                        </Title>
                    </Col>
                </Row>
            </div>
        </div>
    );
}
