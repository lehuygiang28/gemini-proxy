'use client';

import React from 'react';
import { Col, Row, Typography, theme } from 'antd';
import { GithubOutlined } from '@ant-design/icons';

const { Text, Link } = Typography;
const { useToken } = theme;

export function Footer() {
    const { token } = useToken();

    return (
        <div
            style={{
                padding: '24px 0',
                background: token.colorBgContainer,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Text type="secondary">
                            © {new Date().getFullYear()} Gemini Proxy. Created by{' '}
                            <Link
                                href="https://github.com/lehuygiang28"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Lê Huy Giang
                            </Link>
                        </Text>
                    </Col>
                    <Col>
                        <Link
                            href="https://github.com/lehuygiang28/gemini-proxy"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <GithubOutlined style={{ fontSize: 24, color: token.colorText }} />
                        </Link>
                    </Col>
                </Row>
            </div>
        </div>
    );
}
