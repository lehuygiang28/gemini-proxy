'use client';

import React from 'react';
import { Col, Row, Typography, theme } from 'antd';
import {
    SiNextdotjs,
    SiSupabase,
    SiHono,
    SiTypescript,
    SiPostgresql,
    SiAntdesign,
} from 'react-icons/si';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export function TechStackSection() {
    const { token } = useToken();

    const techStack = [
        {
            icon: <SiTypescript style={{ fontSize: 48, color: '#3178C6' }} />,
            name: 'TypeScript',
        },
        {
            icon: <SiHono style={{ fontSize: 48, color: '#E36002' }} />,
            name: 'Hono',
        },
        {
            icon: <SiSupabase style={{ fontSize: 48, color: '#3ECF8E' }} />,
            name: 'Supabase',
        },
        {
            icon: <SiPostgresql style={{ fontSize: 48, color: '#4169E1' }} />,
            name: 'PostgreSQL',
        },
        {
            icon: <SiNextdotjs style={{ fontSize: 48, color: token.colorText }} />,
            name: 'Next.js',
        },
        {
            icon: <SiAntdesign style={{ fontSize: 48, color: '#1677FF' }} />,
            name: 'Ant Design',
        },
    ];

    return (
        <div style={{ padding: '80px 24px', background: token.colorBgLayout }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Title
                    level={2}
                    style={{
                        textAlign: 'center',
                        marginBottom: 16,
                        color: token.colorTextHeading,
                    }}
                >
                    Powered by a Modern Tech Stack
                </Title>
                <Paragraph
                    type="secondary"
                    style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 64px' }}
                >
                    Gemini Proxy is built with a modern, robust, and scalable tech stack to ensure
                    the best performance and developer experience.
                </Paragraph>
                <Row gutter={[32, 32]} justify="center" align="middle">
                    {techStack.map((tech) => (
                        <Col key={tech.name} xs={12} sm={8} md={4} style={{ textAlign: 'center' }}>
                            {tech.icon}
                            <Title level={5} style={{ marginTop: 16 }}>
                                {tech.name}
                            </Title>
                        </Col>
                    ))}
                </Row>
            </div>
        </div>
    );
}
