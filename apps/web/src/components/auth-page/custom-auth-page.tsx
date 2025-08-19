'use client';

import React from 'react';
import { Card, Form, Input, Button, Typography, Space, Divider, Alert, theme } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, KeyOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ColorModeContext } from '@contexts/color-mode';
import type { Rule } from 'antd/es/form';

const { Title, Text } = Typography;
const { useToken } = theme;

interface CustomAuthPageProps {
    type: 'login' | 'register' | 'forgotPassword';
    title?: string;
    subtitle?: string;
    onFinish: (values: any) => Promise<void>;
    loading?: boolean;
    error?: string | null;
}

interface FormField {
    name: string;
    label: string;
    rules: Rule[];
    prefix: React.ReactNode;
    type?: 'text' | 'password' | 'email';
}

export const CustomAuthPage: React.FC<CustomAuthPageProps> = ({
    type,
    title,
    subtitle,
    onFinish,
    loading = false,
    error,
}) => {
    const { token } = useToken();
    const { mode } = React.useContext(ColorModeContext);
    const router = useRouter();

    const getPageConfig = () => {
        switch (type) {
            case 'login':
                return {
                    title: title || 'Welcome Back',
                    subtitle: subtitle || 'Sign in to your account to continue',
                    submitText: 'Sign In',
                    icon: <UserOutlined />,
                };
            case 'register':
                return {
                    title: title || 'Create Account',
                    subtitle: subtitle || 'Sign up to get started with Gemini Proxy',
                    submitText: 'Create Account',
                    icon: <UserOutlined />,
                };
            case 'forgotPassword':
                return {
                    title: title || 'Reset Password',
                    subtitle: subtitle || 'Enter your email to receive reset instructions',
                    submitText: 'Send Reset Link',
                    icon: <KeyOutlined />,
                };
            default:
                return {
                    title: 'Authentication',
                    subtitle: 'Please authenticate to continue',
                    submitText: 'Submit',
                    icon: <UserOutlined />,
                };
        }
    };

    const config = getPageConfig();

    const cardStyles: React.CSSProperties = {
        maxWidth: 400,
        width: '100%',
        margin: '0 auto',
        boxShadow: token.boxShadowTertiary,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
    };

    const containerStyles: React.CSSProperties = {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: token.paddingLG,
        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    };

    const logoStyles: React.CSSProperties = {
        fontSize: token.fontSizeHeading1,
        color: token.colorPrimary,
        marginBottom: token.marginSM,
    };

    const getFormFields = (): FormField[] => {
        const baseFields: FormField[] = [
            {
                name: 'email',
                label: 'Email',
                rules: [
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' },
                ],
                prefix: <MailOutlined style={{ color: token.colorTextSecondary }} />,
                type: 'email',
            },
        ];

        if (type === 'login' || type === 'register') {
            baseFields.push({
                name: 'password',
                label: 'Password',
                rules: [
                    { required: true, message: 'Please enter your password' },
                    {
                        validator: (_, value) => {
                            if (!value || value.length >= 6) {
                                return Promise.resolve();
                            }
                            return Promise.reject(
                                new Error('Password must be at least 6 characters'),
                            );
                        },
                    },
                ],
                prefix: <LockOutlined style={{ color: token.colorTextSecondary }} />,
                type: 'password',
            });
        }

        if (type === 'register') {
            baseFields.push({
                name: 'confirmPassword',
                label: 'Confirm Password',
                rules: [
                    { required: true, message: 'Please confirm your password' },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                                return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match'));
                        },
                    }),
                ],
                prefix: <LockOutlined style={{ color: token.colorTextSecondary }} />,
                type: 'password',
            });
        }

        return baseFields;
    };

    const getNavigationLinks = () => {
        switch (type) {
            case 'login':
                return (
                    <Space
                        direction="vertical"
                        size="small"
                        style={{ width: '100%', textAlign: 'center' }}
                    >
                        <Link href="/forgot-password" style={{ color: token.colorPrimary }}>
                            Forgot your password?
                        </Link>
                        <Text type="secondary">
                            Don't have an account?{' '}
                            <Link href="/register" style={{ color: token.colorPrimary }}>
                                Sign up
                            </Link>
                        </Text>
                    </Space>
                );
            case 'register':
                return (
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: token.colorPrimary }}>
                            Sign in
                        </Link>
                    </Text>
                );
            case 'forgotPassword':
                return (
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                        Remember your password?{' '}
                        <Link href="/login" style={{ color: token.colorPrimary }}>
                            Sign in
                        </Link>
                    </Text>
                );
            default:
                return null;
        }
    };

    return (
        <div style={containerStyles}>
            <Card style={cardStyles}>
                <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
                    <div style={logoStyles}>🔑</div>
                    <Title level={2} style={{ margin: 0, color: token.colorText }}>
                        {config.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: token.fontSize }}>
                        {config.subtitle}
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: token.marginLG }}
                    />
                )}

                <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
                    {getFormFields().map((field) => (
                        <Form.Item
                            key={field.name}
                            name={field.name}
                            label={field.label}
                            rules={field.rules}
                        >
                            <Input
                                prefix={field.prefix}
                                type={field.type || 'text'}
                                placeholder={`Enter your ${field.label.toLowerCase()}`}
                                style={{
                                    borderRadius: token.borderRadius,
                                }}
                            />
                        </Form.Item>
                    ))}

                    <Form.Item style={{ marginBottom: token.marginMD }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            style={{
                                width: '100%',
                                height: 48,
                                borderRadius: token.borderRadius,
                                fontSize: token.fontSizeLG,
                                fontWeight: 600,
                            }}
                        >
                            {config.submitText}
                        </Button>
                    </Form.Item>
                </Form>

                <Divider style={{ margin: token.marginLG }} />

                {getNavigationLinks()}
            </Card>
        </div>
    );
};
