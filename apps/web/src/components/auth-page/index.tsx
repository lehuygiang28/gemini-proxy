'use client';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Typography, Input, Button, Alert, Space, theme, Form } from 'antd';
import { useForm as useRefineForm } from '@refinedev/antd';
import type { AuthPageProps } from '@refinedev/core';
import { useLogin, useRegister, useForgotPassword } from '@refinedev/core';

type AuthType = NonNullable<AuthPageProps['type']>;

export const AuthPage = (props: Partial<AuthPageProps>) => {
    const type: AuthType = (props.type as AuthType) ?? 'login';
    const router = useRouter();
    const { token } = theme.useToken();

    const { formProps, saveButtonProps } = useRefineForm();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const { mutate: login, isPending: isLoggingIn } = useLogin();
    const { mutate: register, isPending: isRegistering } = useRegister();
    const { mutate: forgotPassword, isPending: isResetting } = useForgotPassword();

    const isLoading = isLoggingIn || isRegistering || isResetting;

    const titles = useMemo(() => {
        switch (type) {
            case 'register':
                return { title: 'Create your account', submit: 'Create account' };
            case 'forgotPassword':
                return { title: 'Reset your password', submit: 'Send reset link' };
            default:
                return { title: 'Sign in to your account', submit: 'Sign in' };
        }
    }, [type]);

    const onFinish = useCallback(
        async (values: Record<string, string>) => {
            setErrorMessage(null);
            try {
                if (type === 'login') {
                    await new Promise<void>((resolve, reject) =>
                        login(
                            { email: values.email, password: values.password },
                            {
                                onSuccess: (res) => {
                                    if (res?.success) {
                                        router.push(res.redirectTo ?? '/');
                                        resolve();
                                    } else {
                                        reject(new Error(res?.error?.message ?? 'Login failed'));
                                    }
                                },
                                onError: (err: unknown) => reject(err as Error),
                            },
                        ),
                    );
                } else if (type === 'register') {
                    await new Promise<void>((resolve, reject) =>
                        register(
                            { email: values.email, password: values.password },
                            {
                                onSuccess: (res) => {
                                    if (res?.success) {
                                        router.push(res.redirectTo ?? '/login');
                                        resolve();
                                    } else {
                                        reject(new Error(res?.error?.message ?? 'Register failed'));
                                    }
                                },
                                onError: (err: unknown) => reject(err as Error),
                            },
                        ),
                    );
                } else if (type === 'forgotPassword') {
                    await new Promise<void>((resolve, reject) =>
                        forgotPassword(
                            { email: values.email },
                            {
                                onSuccess: (res) => {
                                    if (res?.success) {
                                        resolve();
                                    } else {
                                        reject(
                                            new Error(
                                                res?.error?.message ?? 'Failed to send reset email',
                                            ),
                                        );
                                    }
                                },
                                onError: (err: unknown) => reject(err as Error),
                            },
                        ),
                    );
                }
            } catch (e: unknown) {
                const err = e as Error;
                setErrorMessage(err?.message ?? 'Something went wrong');
            }
        },
        [type, login, register, forgotPassword, router],
    );

    const footerLinks = useMemo(() => {
        if (type === 'login') {
            return (
                <Space size={8} split={<span>•</span>}>
                    <Link href="/register">Create account</Link>
                    <Link href="/forgot-password">Forgot password?</Link>
                </Space>
            );
        }
        if (type === 'register') {
            return (
                <Space size={8} split={<span>•</span>}>
                    <Link href="/login">Have an account? Sign in</Link>
                    <Link href="/forgot-password">Forgot password?</Link>
                </Space>
            );
        }
        return (
            <Space size={8} split={<span>•</span>}>
                <Link href="/login">Back to sign in</Link>
                <Link href="/register">Create account</Link>
            </Space>
        );
    }, [type]);

    return (
        <div
            style={{
                display: 'grid',
                placeItems: 'center',
                minHeight: '100dvh',
                padding: token.padding,
                background: token.colorBgLayout,
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: token.colorBgContainer,
                    boxShadow: token.boxShadow,
                    borderRadius: token.borderRadiusLG,
                }}
                bordered={false}
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                        <Typography.Title level={3} style={{ marginBottom: 0 }}>
                            {titles.title}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                            {type === 'login' && 'Use your email and password to continue.'}
                            {type === 'register' &&
                                'Create an account with your email and a password.'}
                            {type === 'forgotPassword' &&
                                'Enter your email to receive a reset link.'}
                        </Typography.Text>
                    </div>

                    {errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}

                    <Form
                        {...formProps}
                        layout="vertical"
                        initialValues={{ email: '', password: '' }}
                        onFinish={onFinish}
                        disabled={isLoading}
                        requiredMark={false}
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Please enter your email' },
                                { type: 'email', message: 'Please enter a valid email' },
                            ]}
                        >
                            <Input placeholder="you@example.com" autoComplete="email" />
                        </Form.Item>

                        {type !== 'forgotPassword' ? (
                            <Form.Item
                                name="password"
                                label="Password"
                                rules={[{ required: true, message: 'Please enter your password' }]}
                            >
                                <Input.Password
                                    placeholder="••••••••"
                                    autoComplete={
                                        type === 'login' ? 'current-password' : 'new-password'
                                    }
                                />
                            </Form.Item>
                        ) : null}

                        <Form.Item>
                            <Button
                                {...saveButtonProps}
                                type="primary"
                                htmlType="submit"
                                block
                                loading={isLoading}
                            >
                                {titles.submit}
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>{footerLinks}</div>
                </Space>
            </Card>
        </div>
    );
};
