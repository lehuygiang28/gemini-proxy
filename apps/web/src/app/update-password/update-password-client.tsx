'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Card, Space, Spin, Typography, theme } from 'antd';
import { AuthPage } from '@components/auth-page';
import { supabaseBrowserClient } from '@utils/supabase/client';

type GateState = 'loading' | 'ready' | 'error';

/**
 * Waits for recovery/PKCE session before showing the set-password form.
 * Handles: cookie session, ?code= exchange, hash tokens, PASSWORD_RECOVERY event.
 */
export function UpdatePasswordClient() {
    const { token } = theme.useToken();
    const [state, setState] = useState<GateState>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: number | undefined;

        const finishReady = () => {
            if (!cancelled) {
                setErrorMessage(null);
                setState('ready');
            }
        };

        const finishError = (message: string) => {
            if (!cancelled) {
                setErrorMessage(message);
                setState('error');
            }
        };

        const { data: authListener } = supabaseBrowserClient.auth.onAuthStateChange(
            (event, session) => {
                if (
                    session &&
                    (event === 'PASSWORD_RECOVERY' ||
                        event === 'SIGNED_IN' ||
                        event === 'INITIAL_SESSION' ||
                        event === 'TOKEN_REFRESHED')
                ) {
                    finishReady();
                }
            },
        );

        void (async () => {
            try {
                const url = new URL(window.location.href);
                const code = url.searchParams.get('code');

                if (code) {
                    const { error } = await supabaseBrowserClient.auth.exchangeCodeForSession(
                        code,
                    );
                    if (error) {
                        finishError(
                            error.message ||
                                'Reset link is invalid or expired. Request a new one.',
                        );
                        return;
                    }
                    window.history.replaceState({}, '', '/update-password');
                    finishReady();
                    return;
                }

                const {
                    data: { session },
                } = await supabaseBrowserClient.auth.getSession();
                if (session) {
                    finishReady();
                    return;
                }

                // Hash-based recovery can resolve slightly after mount.
                timeoutId = window.setTimeout(() => {
                    void supabaseBrowserClient.auth.getSession().then(({ data }) => {
                        if (data.session) {
                            finishReady();
                        } else {
                            finishError(
                                'Reset link is invalid or expired. Request a new one.',
                            );
                        }
                    });
                }, 2000);
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Could not validate the reset link.';
                finishError(message);
            }
        })();

        return () => {
            cancelled = true;
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (state === 'ready') {
        return <AuthPage type="updatePassword" />;
    }

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
                variant="borderless"
            >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Typography.Title level={3} style={{ marginBottom: 0 }}>
                        Set a new password
                    </Typography.Title>
                    {state === 'loading' ? (
                        <Space>
                            <Spin size="small" />
                            <Typography.Text type="secondary">
                                Validating your reset link…
                            </Typography.Text>
                        </Space>
                    ) : null}
                    {state === 'error' && errorMessage ? (
                        <>
                            <Alert type="error" showIcon message={errorMessage} />
                            <Typography.Text>
                                <Link href="/forgot-password">Request a new reset link</Link>
                                {' · '}
                                <Link href="/login">Back to sign in</Link>
                            </Typography.Text>
                        </>
                    ) : null}
                </Space>
            </Card>
        </div>
    );
}
