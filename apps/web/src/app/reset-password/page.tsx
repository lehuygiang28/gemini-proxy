'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Form, Input, Button, Typography, Alert, theme } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { supabaseBrowserClient } from '@utils/supabase/client';
import { ColorModeContext } from '@contexts/color-mode';
import { useNotification } from '@refinedev/core';

const { Title, Text } = Typography;
const { useToken } = theme;

export default function ResetPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = useToken();
    const { mode } = React.useContext(ColorModeContext);
    const { open } = useNotification();

    useEffect(() => {
        // Check if we have the necessary parameters for password reset
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (type === 'recovery' && accessToken && refreshToken) {
            // Set the session for password reset
            supabaseBrowserClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
        }
    }, [searchParams]);

    const handleFinish = async (values: any) => {
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabaseBrowserClient.auth.updateUser({
                password: values.password,
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                setSuccess(true);
                open?.({
                    type: 'success',
                    message: 'Password updated successfully',
                    description:
                        'Your password has been reset. You can now log in with your new password.',
                });

                // Redirect to login after a short delay
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch (err: any) {
            setError(err?.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

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

    if (success) {
        return (
            <div style={containerStyles}>
                <Card style={cardStyles}>
                    <div style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                fontSize: token.fontSizeHeading1,
                                color: token.colorSuccess,
                                marginBottom: token.marginSM,
                            }}
                        >
                            ✅
                        </div>
                        <Title level={2} style={{ margin: 0, color: token.colorText }}>
                            Password Reset Successful
                        </Title>
                        <Text type="secondary" style={{ fontSize: token.fontSize }}>
                            Your password has been updated successfully. Redirecting to login...
                        </Text>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div style={containerStyles}>
            <Card style={cardStyles}>
                <div style={{ textAlign: 'center', marginBottom: token.marginLG }}>
                    <div
                        style={{
                            fontSize: token.fontSizeHeading1,
                            color: token.colorPrimary,
                            marginBottom: token.marginSM,
                        }}
                    >
                        🔐
                    </div>
                    <Title level={2} style={{ margin: 0, color: token.colorText }}>
                        Reset Your Password
                    </Title>
                    <Text type="secondary" style={{ fontSize: token.fontSize }}>
                        Enter your new password below
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

                <Form layout="vertical" onFinish={handleFinish} autoComplete="off" size="large">
                    <Form.Item
                        name="password"
                        label="New Password"
                        rules={[
                            { required: true, message: 'Please enter your new password' },
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
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
                            placeholder="Enter your new password"
                            style={{
                                borderRadius: token.borderRadius,
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Confirm New Password"
                        rules={[
                            { required: true, message: 'Please confirm your new password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Passwords do not match'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: token.colorTextSecondary }} />}
                            placeholder="Confirm your new password"
                            style={{
                                borderRadius: token.borderRadius,
                            }}
                        />
                    </Form.Item>

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
                            Update Password
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}
