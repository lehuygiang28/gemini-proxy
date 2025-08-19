'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomAuthPage } from './custom-auth-page';
import { authProviderClient } from '@providers/auth-provider/auth-provider.client';
import { supabaseBrowserClient } from '@utils/supabase/client';
import { useNotification } from '@refinedev/core';
import type { AuthPageProps } from '@refinedev/core';

export const AuthPage: React.FC<AuthPageProps> = ({ type }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { open } = useNotification();

    const handleFinish = async (values: any) => {
        setLoading(true);
        setError(null);

        try {
            let result;

            switch (type) {
                case 'login':
                    result = await authProviderClient.login?.({
                        email: values.email,
                        password: values.password,
                    });
                    break;
                case 'register':
                    result = await authProviderClient.register?.({
                        email: values.email,
                        password: values.password,
                    });
                    break;
                case 'forgotPassword':
                    // Use Supabase's built-in password reset functionality
                    const { error: resetError } =
                        await supabaseBrowserClient.auth.resetPasswordForEmail(values.email, {
                            redirectTo: `${window.location.origin}/reset-password`,
                        });

                    if (resetError) {
                        setError(resetError.message);
                    } else {
                        open?.({
                            type: 'success',
                            message: 'Reset link sent',
                            description:
                                'If an account with that email exists, you will receive a password reset link.',
                        });
                        router.push('/login');
                    }
                    return;
                default:
                    throw new Error('Unsupported auth type');
            }

            if (result?.success) {
                open?.({
                    type: 'success',
                    message: 'Success',
                    description:
                        type === 'login'
                            ? 'Successfully logged in'
                            : 'Account created successfully',
                });
                router.push(result.redirectTo || '/dashboard');
            } else {
                setError(result?.error?.message || 'Authentication failed');
            }
        } catch (err: any) {
            setError(err?.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Only render for supported auth types
    if (!type || !['login', 'register', 'forgotPassword'].includes(type)) {
        return null;
    }

    return (
        <CustomAuthPage
            type={type as 'login' | 'register' | 'forgotPassword'}
            onFinish={handleFinish}
            loading={loading}
            error={error}
        />
    );
};
