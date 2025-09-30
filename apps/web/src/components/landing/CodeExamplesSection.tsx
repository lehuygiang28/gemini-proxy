'use client';

import React, { useState } from 'react';
import { Row, Col, Typography, Card, Space, Tabs, Badge, Button, theme } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const CodeExamplesSection: React.FC = () => {
    const { token } = useToken();
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('google-genai');

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

    const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
        const handleCopy = async () => {
            try {
                await navigator.clipboard.writeText(code);
                setCopiedCode(code);
                setTimeout(() => setCopiedCode(null), 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        };

        return (
            <div style={{ position: 'relative' }}>
                <SyntaxHighlighter
                    language={language}
                    style={oneDark}
                    customStyle={{
                        borderRadius: token.borderRadius,
                        fontSize: '13px',
                        lineHeight: '1.5',
                        maxHeight: '400px',
                        overflow: 'auto',
                    }}
                    showLineNumbers
                    wrapLines
                >
                    {code}
                </SyntaxHighlighter>
                <Button
                    size="small"
                    type="text"
                    icon={copiedCode === code ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={handleCopy}
                    style={{
                        position: 'absolute',
                        top: token.paddingXS,
                        right: token.paddingXS,
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorder}`,
                    }}
                >
                    {copiedCode === code ? 'Copied!' : 'Copy'}
                </Button>
            </div>
        );
    };

    const codeExamples = [
        {
            key: 'google-genai',
            label: (
                <Space>
                    <span style={{ fontWeight: 600 }}>@google/genai</span>
                    <Badge color="blue" text="Official SDK" />
                </Space>
            ),
            description: 'Use the official Google Generative AI SDK with our proxy endpoint:',
            code: `import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    httpOptions: {
        baseUrl: 'http://localhost:9090/api/gproxy/gemini',
    },
});

// Generate content
const response = await genAI.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Count from 1 to 10',
});

console.log(response.text);`,
            language: 'typescript',
        },
        {
            key: 'openai',
            label: (
                <Space>
                    <span style={{ fontWeight: 600 }}>OpenAI SDK</span>
                    <Badge color="green" text="Compatible" />
                </Space>
            ),
            description: 'Use OpenAI-compatible clients with our proxy endpoint:',
            code: `import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: 'http://localhost:9090/api/gproxy/openai',
});

// Chat completion with streaming
const chatCompletion = await openai.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: 'Write a 100-word poem.' }],
    stream: true,
});

for await (const chunk of chatCompletion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,
            language: 'typescript',
        },
        {
            key: 'ai-sdk',
            label: (
                <Space>
                    <span style={{ fontWeight: 600 }}>Vercel AI SDK</span>
                    <Badge color="purple" text="Modern" />
                </Space>
            ),
            description: 'Use Vercel AI SDK with our proxy endpoint (note the /v1beta path):',
            code: `import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
    apiKey: 'YOUR_PROXY_API_KEY',
    baseURL: 'http://localhost:9090/api/gproxy/gemini/v1beta',
});

// Generate text
const { text } = await generateText({
    model: google('gemini-2.5-flash'),
    system: 'You are a friendly assistant!',
    prompt: 'Why is the sky blue?',
});

console.log(text);`,
            language: 'typescript',
        },
    ];

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
                        💻 Integration Examples
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        Get started in minutes with our comprehensive SDK examples
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
                                    🚀 Quick Start Examples
                                </span>
                            </Space>
                        }
                    >
                        <Tabs
                            size="large"
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            items={codeExamples.map((example) => ({
                                key: example.key,
                                label: example.label,
                                children: (
                                    <div>
                                        <Paragraph
                                            style={{
                                                marginBottom: token.marginMD,
                                                color: token.colorTextSecondary,
                                            }}
                                        >
                                            {example.description}
                                        </Paragraph>
                                        <CodeBlock
                                            code={example.code}
                                            language={example.language}
                                        />
                                    </div>
                                ),
                            }))}
                        />
                    </SectionCard>
                </Col>
            </Row>
        </div>
    );
};
