'use client';

import React, { useContext } from 'react';
import { Row, Col, Typography, Card, theme, Tag } from 'antd';
import {
    SiNextdotjs,
    SiTypescript,
    SiSupabase,
    SiAntdesign,
    SiRefine,
    SiHono,
} from 'react-icons/si';
import { FaReact } from 'react-icons/fa';
import { ColorModeContext } from '@/contexts/color-mode';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

export const TechStackSection: React.FC = () => {
    const { token } = useToken();
    const { mode } = useContext(ColorModeContext);

    // Theme-aware color helper
    const getThemeAwareColor = (lightColor: string, darkColor: string) => {
        return mode === 'dark' ? darkColor : lightColor;
    };

    const techStack = [
        {
            name: 'Next.js 15',
            icon: (
                <SiNextdotjs
                    style={{ fontSize: '28px', color: getThemeAwareColor('#000000', '#FFFFFF') }}
                />
            ),
            description: 'React framework with App Router',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Framework',
        },
        {
            name: 'React 19',
            icon: <FaReact style={{ fontSize: '28px', color: '#61DAFB' }} />,
            description: 'UI library for building interfaces',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Library',
        },
        {
            name: 'TypeScript',
            icon: <SiTypescript style={{ fontSize: '28px', color: '#3178C6' }} />,
            description: 'Typed JavaScript at any scale',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Language',
        },
        {
            name: 'Refine v5',
            icon: <SiRefine style={{ fontSize: '28px', color: '#00FFFF' }} />,
            description: 'React-based admin panel framework',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Framework',
        },
        {
            name: 'Ant Design',
            icon: <SiAntdesign style={{ fontSize: '28px', color: '#1890FF' }} />,
            description: 'Enterprise UI design language',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'UI Library',
        },
        {
            name: 'Supabase',
            icon: <SiSupabase style={{ fontSize: '28px', color: '#3ECF8E' }} />,
            description: 'Open source Firebase alternative',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Database',
        },
        {
            name: 'Hono',
            icon: <SiHono style={{ fontSize: '28px', color: '#FF6B35' }} />,
            description: 'Lightweight web framework',
            color: token.colorText,
            bgColor: token.colorFillQuaternary,
            category: 'Framework',
        },
    ];

    return (
        <div
            style={{
                paddingLeft: token.paddingLG,
                paddingRight: token.paddingLG,
                paddingBottom: token.paddingXL,
                background: token.colorBgLayout,
            }}
        >
            <Row justify="center" style={{ marginBottom: token.marginXL }}>
                <Col xs={24} md={20} lg={16} style={{ textAlign: 'center' }}>
                    <Title level={2} style={{ marginBottom: token.marginMD }}>
                        🛠️ Tech Stack
                    </Title>
                    <Paragraph style={{ fontSize: '1.1rem', color: token.colorTextSecondary }}>
                        Built with modern, production-ready technologies
                    </Paragraph>
                </Col>
            </Row>

            <Row gutter={[token.marginLG, token.marginLG]} justify="center">
                <Col xs={24} md={20} lg={18}>
                    <Row gutter={[token.marginMD, token.marginMD]}>
                        {techStack.map((tech, index) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={index}>
                                <Card
                                    style={{
                                        borderRadius: token.borderRadiusLG,
                                        boxShadow: token.boxShadowTertiary,
                                        background: token.colorBgContainer,
                                        height: '100%',
                                        textAlign: 'center',
                                        border: `1px solid ${token.colorBorder}`,
                                        transition: 'all 0.3s ease',
                                    }}
                                    bodyStyle={{
                                        padding: token.paddingLG,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        minHeight: '200px',
                                    }}
                                    hoverable
                                >
                                    <div
                                        style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: token.borderRadius,
                                            background: tech.bgColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginBottom: token.marginMD,
                                            border: `1px solid ${token.colorBorder}`,
                                        }}
                                    >
                                        {tech.icon}
                                    </div>

                                    <div
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Title
                                            level={5}
                                            style={{
                                                color: token.colorText,
                                                marginBottom: token.marginXS,
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {tech.name}
                                        </Title>

                                        <Tag
                                            color="blue"
                                            style={{
                                                marginBottom: token.marginSM,
                                                fontSize: '12px',
                                                padding: '4px 10px',
                                                height: 'auto',
                                                lineHeight: '1.3',
                                                borderRadius: '12px',
                                                minWidth: 'auto',
                                                width: 'fit-content',
                                                display: 'inline-block',
                                            }}
                                        >
                                            {tech.category}
                                        </Tag>

                                        <Paragraph
                                            style={{
                                                color: token.colorTextSecondary,
                                                margin: 0,
                                                fontSize: '13px',
                                                lineHeight: 1.4,
                                                textAlign: 'center',
                                            }}
                                        >
                                            {tech.description}
                                        </Paragraph>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>
            </Row>
        </div>
    );
};
