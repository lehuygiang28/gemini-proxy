'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Typography, Input, Button, Alert, Space, Form } from 'antd';
import { useForm as useRefineForm } from '@refinedev/antd';
import type { AuthPageProps } from '@refinedev/core';
import {
    useLogin,
    useRegister,
    useForgotPassword,
    useUpdatePassword,
    useTranslation,
} from '@refinedev/core';
import { AuthCardChrome } from './auth-card-chrome';

type AuthType = NonNullable<AuthPageProps['type']>;

const AUTH_CALLBACK_ERROR_KEYS: Record<string, string> = {
    missing_auth_code: 'pages.auth.errors.missingAuthCode',
    auth_callback_failed: 'pages.auth.errors.callbackFailed',
    missing_auth_token: 'pages.auth.errors.missingAuthToken',
    auth_confirm_failed: 'pages.auth.errors.confirmFailed',
};

function failedMessageKey(type: AuthType): string {
    switch (type) {
        case 'register':
            return 'pages.register.errors.failed';
        case 'forgotPassword':
            return 'pages.forgotPassword.errors.failed';
        case 'updatePassword':
            return 'pages.updatePassword.errors.failed';
        default:
            return 'pages.login.errors.failed';
    }
}

function resolveAuthErrorMessage(
    raw: string | undefined,
    type: AuthType,
    translate: (key: string) => string,
): string {
    if (!raw) {
        return translate(failedMessageKey(type));
    }
    const catalogKey = AUTH_CALLBACK_ERROR_KEYS[raw];
    if (catalogKey) {
        return translate(catalogKey);
    }
    return translate(failedMessageKey(type));
}

export const AuthPage = (props: Partial<AuthPageProps>) => {
    const type: AuthType = (props.type as AuthType) ?? 'login';
    const { translate } = useTranslation();
    const router = useRouter();

    const { formProps, saveButtonProps } = useRefineForm();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const { mutate: login, isPending: isLoggingIn } = useLogin();
    const { mutate: register, isPending: isRegistering } = useRegister();
    const { mutate: forgotPassword, isPending: isResetting } = useForgotPassword();
    const { mutate: updatePassword, isPending: isUpdatingPassword } = useUpdatePassword();

    const isLoading = isLoggingIn || isRegistering || isResetting || isUpdatingPassword;

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        if (error) {
            setErrorMessage(resolveAuthErrorMessage(decodeURIComponent(error), type, translate));
        }
        if (params.get('registered') === '1') {
            setInfoMessage(translate('pages.register.infoCreated'));
        }
        if (params.get('passwordUpdated') === '1') {
            setInfoMessage(translate('pages.updatePassword.infoUpdated'));
        }
    }, [translate, type]);

    const titles = useMemo(() => {
        switch (type) {
            case 'register':
                return {
                    title: translate('pages.register.title'),
                    submit: translate('pages.register.buttons.submit'),
                };
            case 'forgotPassword':
                return {
                    title: translate('pages.forgotPassword.title'),
                    submit: translate('pages.forgotPassword.buttons.submit'),
                };
            case 'updatePassword':
                return {
                    title: translate('pages.updatePassword.title'),
                    submit: translate('pages.updatePassword.buttons.submit'),
                };
            default:
                return {
                    title: translate('pages.login.title'),
                    submit: translate('pages.login.buttons.submit'),
                };
        }
    }, [type, translate]);

    const redirectAfterAuth = useCallback(
        async (path: string) => {
            // Sync server components / middleware with cookies set by the browser client
            router.refresh();
            router.push(path);
        },
        [router],
    );

    const onFinish = useCallback(
        async (values: Record<string, string>) => {
            setErrorMessage(null);
            setInfoMessage(null);
            try {
                if (type === 'login') {
                    await new Promise<void>((resolve, reject) =>
                        login(
                            { email: values.email, password: values.password },
                            {
                                onSuccess: (res) => {
                                    if (res?.success) {
                                        void redirectAfterAuth(res.redirectTo ?? '/dashboard').then(
                                            () => resolve(),
                                        );
                                    } else {
                                        reject(new Error(translate(failedMessageKey(type))));
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
                                        const target = res.redirectTo ?? '/login?registered=1';
                                        if (target.startsWith('/dashboard')) {
                                            void redirectAfterAuth(target).then(() => resolve());
                                        } else {
                                            setInfoMessage(translate('pages.register.infoCreated'));
                                            router.push(target);
                                            resolve();
                                        }
                                    } else {
                                        reject(new Error(translate(failedMessageKey(type))));
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
                                        setInfoMessage(translate('pages.forgotPassword.infoSent'));
                                        resolve();
                                    } else {
                                        reject(new Error(translate(failedMessageKey(type))));
                                    }
                                },
                                onError: (err: unknown) => reject(err as Error),
                            },
                        ),
                    );
                } else if (type === 'updatePassword') {
                    await new Promise<void>((resolve, reject) =>
                        updatePassword(
                            { password: values.password },
                            {
                                onSuccess: (res) => {
                                    if (res?.success) {
                                        const target = res.redirectTo ?? '/login?passwordUpdated=1';
                                        void redirectAfterAuth(target).then(() => resolve());
                                    } else {
                                        reject(new Error(translate(failedMessageKey(type))));
                                    }
                                },
                                onError: (err: unknown) => reject(err as Error),
                            },
                        ),
                    );
                }
            } catch {
                setErrorMessage(translate(failedMessageKey(type)));
            }
        },
        [
            type,
            login,
            register,
            forgotPassword,
            updatePassword,
            router,
            redirectAfterAuth,
            translate,
        ],
    );

    const footerLinks = useMemo(() => {
        if (type === 'login') {
            return (
                <Space size={8} split={<span>•</span>}>
                    <Link href="/register">{translate('pages.login.buttons.createAccount')}</Link>
                    <Link href="/forgot-password">
                        {translate('pages.login.buttons.forgotPassword')}
                    </Link>
                </Space>
            );
        }
        if (type === 'register') {
            return (
                <Space size={8} split={<span>•</span>}>
                    <Link href="/login">{translate('pages.register.buttons.haveAccount')}</Link>
                    <Link href="/forgot-password">
                        {translate('pages.register.buttons.forgotPassword')}
                    </Link>
                </Space>
            );
        }
        if (type === 'updatePassword') {
            return (
                <Space size={8} split={<span>•</span>}>
                    <Link href="/login">
                        {translate('pages.updatePassword.buttons.backToSignIn')}
                    </Link>
                </Space>
            );
        }
        return (
            <Space size={8} split={<span>•</span>}>
                <Link href="/login">{translate('pages.forgotPassword.buttons.backToSignIn')}</Link>
                <Link href="/register">{translate('pages.login.buttons.createAccount')}</Link>
            </Space>
        );
    }, [type, translate]);

    return (
        <AuthCardChrome>
            <div>
                <Typography.Title level={3} style={{ marginBottom: 0 }}>
                    {titles.title}
                </Typography.Title>
                <Typography.Text type="secondary">
                    {type === 'login' && translate('pages.login.subtitle')}
                    {type === 'register' && translate('pages.register.subtitle')}
                    {type === 'forgotPassword' && translate('pages.forgotPassword.subtitle')}
                    {type === 'updatePassword' && translate('pages.updatePassword.subtitle')}
                </Typography.Text>
            </div>

            {errorMessage ? <Alert type="error" message={errorMessage} showIcon /> : null}
            {infoMessage ? <Alert type="info" message={infoMessage} showIcon /> : null}

            <Form
                {...formProps}
                layout="vertical"
                initialValues={{ email: '', password: '', confirmPassword: '' }}
                onFinish={onFinish}
                disabled={isLoading}
                requiredMark={false}
            >
                {type !== 'updatePassword' ? (
                    <Form.Item
                        name="email"
                        label={translate(
                            type === 'forgotPassword'
                                ? 'pages.forgotPassword.fields.email'
                                : type === 'register'
                                  ? 'pages.register.fields.email'
                                  : 'pages.login.fields.email',
                        )}
                        rules={[
                            {
                                required: true,
                                message: translate(
                                    type === 'forgotPassword'
                                        ? 'pages.forgotPassword.errors.requiredEmail'
                                        : type === 'register'
                                          ? 'pages.register.errors.requiredEmail'
                                          : 'pages.login.errors.requiredEmail',
                                ),
                            },
                            {
                                type: 'email',
                                message: translate(
                                    type === 'forgotPassword'
                                        ? 'pages.forgotPassword.errors.validEmail'
                                        : type === 'register'
                                          ? 'pages.register.errors.validEmail'
                                          : 'pages.login.errors.validEmail',
                                ),
                            },
                        ]}
                    >
                        <Input
                            placeholder={translate('common.emailPlaceholder')}
                            autoComplete="email"
                        />
                    </Form.Item>
                ) : null}

                {type !== 'forgotPassword' ? (
                    <Form.Item
                        name="password"
                        label={translate(
                            type === 'updatePassword'
                                ? 'pages.updatePassword.fields.password'
                                : type === 'register'
                                  ? 'pages.register.fields.password'
                                  : 'pages.login.fields.password',
                        )}
                        rules={[
                            {
                                required: true,
                                message: translate(
                                    type === 'updatePassword'
                                        ? 'pages.updatePassword.errors.requiredPassword'
                                        : type === 'register'
                                          ? 'pages.register.errors.requiredPassword'
                                          : 'pages.login.errors.requiredPassword',
                                ),
                            },
                            ...(type === 'updatePassword' || type === 'register'
                                ? [
                                      {
                                          min: 8,
                                          message: translate(
                                              type === 'updatePassword'
                                                  ? 'pages.updatePassword.errors.minPassword'
                                                  : 'pages.register.errors.minPassword',
                                          ),
                                      },
                                  ]
                                : []),
                        ]}
                    >
                        <Input.Password
                            placeholder="••••••••"
                            autoComplete={type === 'login' ? 'current-password' : 'new-password'}
                        />
                    </Form.Item>
                ) : null}

                {type === 'updatePassword' ? (
                    <Form.Item
                        name="confirmPassword"
                        label={translate('pages.updatePassword.fields.confirmPassword')}
                        dependencies={['password']}
                        rules={[
                            {
                                required: true,
                                message: translate(
                                    'pages.updatePassword.errors.requiredConfirmPassword',
                                ),
                            },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(
                                        new Error(
                                            translate(
                                                'pages.updatePassword.errors.confirmPasswordNotMatch',
                                            ),
                                        ),
                                    );
                                },
                            }),
                        ]}
                    >
                        <Input.Password placeholder="••••••••" autoComplete="new-password" />
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
        </AuthCardChrome>
    );
};
