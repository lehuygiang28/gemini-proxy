'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Col, Row, Space, Tabs, Typography, theme } from 'antd';
import { LayoutGroup, motion } from 'motion/react';

import { CodeBlock } from './code-block';
import LightRays from './light-ray';
import RotatingText from './rotating-text';

const { Paragraph } = Typography;
const { useToken } = theme;

export function HeroSection() {
    const { token } = useToken();

    return (
        <div
            style={{
                textAlign: 'center',
                paddingTop: 80,
                paddingBottom: 80,
                background: token.colorBgLayout,
                position: 'relative',
                overflow: 'hidden',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0,
                }}
            >
                <LightRays />
            </div>
            <Row
                justify="center"
                style={{ position: 'relative', zIndex: 1, maxWidth: '100%', width: '1200px' }}
            >
                <Col span={24}>
                    <LayoutGroup>
                        <motion.h1
                            style={{
                                color: token.colorTextHeading,
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                fontWeight: 700,
                                marginBottom: token.marginMD,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                            }}
                            layout
                        >
                            <motion.span
                                layout
                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                            >
                                Gemini{' '}
                            </motion.span>
                            <RotatingText
                                texts={['Proxy', 'Balancer', 'Polling', 'Rotator']}
                                staggerFrom={'last'}
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                staggerDuration={0.025}
                                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                                rotationInterval={2000}
                                style={{
                                    marginLeft: 8,
                                    padding: '0px 8px',
                                    color: token.colorTextLightSolid,
                                    background: token.colorPrimaryActive,
                                    borderRadius: token.borderRadiusLG,
                                }}
                            />
                        </motion.h1>
                    </LayoutGroup>
                    <Paragraph
                        style={{
                            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                            maxWidth: 720,
                            margin: '0 auto',
                            color: token.colorTextSecondary,
                            marginBottom: token.marginXL,
                        }}
                    >
                        An open-source, production-ready proxy for Google Gemini. Intelligent key
                        management, comprehensive logging, and seamless streaming support. Deploy
                        anywhere, from serverless to servers.
                    </Paragraph>
                    <Space size="large" style={{ marginBottom: 48 }}>
                        <Link href="/dashboard">
                            <Button type="primary" size="large" shape="round">
                                Get Started for Free
                            </Button>
                        </Link>
                        <Link href="https://github.com/lehuygiang28/gemini-proxy" target="_blank">
                            <Button size="large" shape="round">
                                View on GitHub
                            </Button>
                        </Link>
                    </Space>
                    <Row justify="center">
                        <Col span={24}>
                            <Tabs
                                defaultActiveKey="1"
                                centered
                                items={[
                                    {
                                        key: '1',
                                        label: '@google/genai',
                                        children: (
                                            <CodeBlock
                                                language="typescript"
                                                code={`// Use Gemini Pro with @google/genai
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    httpOptions: {
        baseUrl: 'https://gemini-proxy.your-domain.com/api/gproxy/gemini',
    },
});

const response = await genAI.models.generateContentStream({
    model: 'gemini-2.5-pro',
    contents: 'Write a 100 word poem about the sea.',
});

for await (const chunk of response) {
    console.log(chunk.text);
}`}
                                            />
                                        ),
                                    },
                                    {
                                        key: '2',
                                        label: 'OpenAI SDK',
                                        children: (
                                            <CodeBlock
                                                language="typescript"
                                                code={`// Use Gemini Flash with OpenAI's SDK
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://gemini-proxy.your-domain.com/api/gproxy/openai',
    apiKey: 'YOUR_PROXY_API_KEY',
});

const chatCompletion = await openai.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: 'Write a 100-word poem about the universe.' }],
    stream: true,
});

for await (const chunk of chatCompletion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`}
                                            />
                                        ),
                                    },
                                    {
                                        key: '3',
                                        label: 'Vercel AI SDK',
                                        children: (
                                            <CodeBlock
                                                language="typescript"
                                                code={`// Use Gemini Flash with Vercel AI SDK
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: 'http://localhost:9090/api/gproxy/gemini/v1beta',
});

const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    system: 'You are a friendly assistant!',
    prompt: 'Why is the sky blue?',
});

console.log(text);`}
                                            />
                                        ),
                                    },
                                ]}
                            />
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    );
}
