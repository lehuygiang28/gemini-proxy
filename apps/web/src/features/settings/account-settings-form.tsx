'use client';

import React, { useEffect, useState } from 'react';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Avatar, Button, Form, Input, Typography } from 'antd';
import { useGetIdentity, useNotification } from '@refinedev/core';
import { supabaseBrowserClient } from '@utils/supabase/client';

const { Text } = Typography;

const DISPLAY_NAME_MAX = 64;

type AccountSection = 'profile' | 'email' | 'security';

type Identity = {
    id?: string;
    email?: string | null;
    name?: string | null;
};

type ProfileFormValues = {
    displayName: string;
};

type EmailFormValues = {
    email: string;
    currentPassword: string;
};

type PasswordFormValues = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

type NavItem = {
    key: AccountSection;
    label: string;
    icon: React.ReactNode;
};

const NAV_ITEMS: readonly NavItem[] = [
    { key: 'profile', label: 'Profile', icon: <UserOutlined /> },
    { key: 'email', label: 'Email', icon: <MailOutlined /> },
    { key: 'security', label: 'Security', icon: <LockOutlined /> },
] as const;

function initialsFrom(identity?: Identity | null): string {
    const source = identity?.name?.trim() || identity?.email?.trim() || '?';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

function displayNameFrom(identity?: Identity | null): string {
    const name = identity?.name?.trim();
    const email = identity?.email?.trim();
    if (name && email && name.toLowerCase() !== email.toLowerCase()) {
        return name;
    }
    if (email) {
        return email.split('@')[0] || 'Account';
    }
    return name || 'Account';
}

/**
 * Account profile + security — Supabase Auth updateUser / signInWithPassword.
 * Clerk-inspired split layout: left nav + active section pane.
 */
export function AccountSettingsForm() {
    const [activeSection, setActiveSection] = useState<AccountSection>('profile');
    const [profileForm] = Form.useForm<ProfileFormValues>();
    const [emailForm] = Form.useForm<EmailFormValues>();
    const [passwordForm] = Form.useForm<PasswordFormValues>();
    const { data: identity, isLoading, refetch } = useGetIdentity<Identity>();
    const notification = useNotification();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (!identity) {
            return;
        }
        profileForm.setFieldsValue({
            displayName:
                identity.name && identity.name !== identity.email ? identity.name : '',
        });
        emailForm.setFieldsValue({
            email: identity.email ?? '',
            currentPassword: '',
        });
    }, [identity, profileForm, emailForm]);

    const refreshIdentity = async () => {
        await refetch?.();
    };

    const handleSaveProfile = async (values: ProfileFormValues) => {
        setSavingProfile(true);
        try {
            const displayName = values.displayName.trim().slice(0, DISPLAY_NAME_MAX);
            const { error } = await supabaseBrowserClient.auth.updateUser({
                data: { display_name: displayName },
            });
            if (error) {
                throw error;
            }
            await refreshIdentity();
            notification.open?.({
                type: 'success',
                message: 'Profile updated',
                description: 'Your display name was saved.',
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to update profile';
            notification.open?.({
                type: 'error',
                message: 'Profile update failed',
                description: message,
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const reauthenticate = async (password: string) => {
        const email = identity?.email;
        if (!email) {
            throw new Error('No email on this account');
        }
        const { error } = await supabaseBrowserClient.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw error;
        }
    };

    const handleChangeEmail = async (values: EmailFormValues) => {
        setSavingEmail(true);
        try {
            await reauthenticate(values.currentPassword);
            const { error } = await supabaseBrowserClient.auth.updateUser({
                email: values.email.trim(),
            });
            if (error) {
                throw error;
            }
            emailForm.setFieldsValue({ currentPassword: '' });
            await refreshIdentity();
            notification.open?.({
                type: 'success',
                message: 'Email change requested',
                description:
                    'Check your inbox to confirm the new email (and the old one if Secure email change is enabled).',
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to change email';
            notification.open?.({
                type: 'error',
                message: 'Email change failed',
                description: message,
            });
        } finally {
            setSavingEmail(false);
        }
    };

    const handleChangePassword = async (values: PasswordFormValues) => {
        setSavingPassword(true);
        try {
            await reauthenticate(values.currentPassword);
            const { error } = await supabaseBrowserClient.auth.updateUser({
                password: values.newPassword,
            });
            if (error) {
                throw error;
            }
            passwordForm.resetFields();
            notification.open?.({
                type: 'success',
                message: 'Password updated',
                description: 'Your password was changed successfully.',
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to change password';
            notification.open?.({
                type: 'error',
                message: 'Password change failed',
                description: message,
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="gp-account-layout">
                <Text type="secondary" className="gp-account-status">
                    Loading account…
                </Text>
            </div>
        );
    }

    if (!identity?.id) {
        return (
            <div className="gp-account-layout">
                <div className="gp-account-status">
                    <Alert type="warning" showIcon message="Sign in to manage your account." />
                </div>
            </div>
        );
    }

    const primaryLabel = displayNameFrom(identity);
    const emailLabel = identity.email?.trim() || '';

    return (
        <div className="gp-account-layout">
            <div className="gp-account-identity">
                <Avatar size={44} className="gp-account-identity-avatar">
                    {initialsFrom(identity)}
                </Avatar>
                <div className="gp-account-identity-text">
                    <span className="gp-account-identity-name">{primaryLabel}</span>
                    {emailLabel ? (
                        <span className="gp-account-identity-email">{emailLabel}</span>
                    ) : null}
                </div>
            </div>

            <div className="gp-account-body">
                <nav className="gp-account-nav gp-scrollable" aria-label="Account sections">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeSection === item.key;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                className={`gp-account-nav-item${isActive ? ' is-active' : ''}`}
                                aria-current={isActive ? 'page' : undefined}
                                onClick={() => setActiveSection(item.key)}
                            >
                                <span className="gp-account-nav-icon" aria-hidden>
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="gp-account-pane gp-scrollable">
                    {activeSection === 'profile' ? (
                        <section className="gp-account-section" aria-labelledby="gp-account-profile-title">
                            <header className="gp-account-section-header">
                                <h3 id="gp-account-profile-title" className="gp-account-section-title">
                                    Profile
                                </h3>
                                <p className="gp-account-section-desc">
                                    Set how your name appears across Gemini Proxy.
                                </p>
                            </header>
                            <Form
                                form={profileForm}
                                layout="vertical"
                                className="gp-account-section-form"
                                onFinish={handleSaveProfile}
                                requiredMark={false}
                            >
                                <Form.Item
                                    name="displayName"
                                    label="Display name"
                                    rules={[
                                        {
                                            max: DISPLAY_NAME_MAX,
                                            message: `Max ${DISPLAY_NAME_MAX} characters`,
                                        },
                                    ]}
                                >
                                    <Input
                                        placeholder="Your name"
                                        maxLength={DISPLAY_NAME_MAX}
                                        showCount
                                    />
                                </Form.Item>
                                <div className="gp-account-section-actions">
                                    <Button type="primary" htmlType="submit" loading={savingProfile}>
                                        Save
                                    </Button>
                                </div>
                            </Form>
                        </section>
                    ) : null}

                    {activeSection === 'email' ? (
                        <section className="gp-account-section" aria-labelledby="gp-account-email-title">
                            <header className="gp-account-section-header">
                                <h3 id="gp-account-email-title" className="gp-account-section-title">
                                    Email
                                </h3>
                                <p className="gp-account-section-desc">
                                    Update the email on your account. You&apos;ll confirm the change
                                    via email before it takes effect.
                                </p>
                            </header>
                            <div className="gp-account-current-row">
                                <span className="gp-account-current-label">Current email</span>
                                <span className="gp-account-current-value">{emailLabel || '—'}</span>
                            </div>
                            <Form
                                form={emailForm}
                                layout="vertical"
                                className="gp-account-section-form"
                                onFinish={handleChangeEmail}
                                requiredMark={false}
                            >
                                <Form.Item
                                    name="email"
                                    label="New email"
                                    rules={[
                                        { required: true, message: 'Enter an email' },
                                        { type: 'email', message: 'Enter a valid email' },
                                    ]}
                                >
                                    <Input autoComplete="email" />
                                </Form.Item>
                                <Form.Item
                                    name="currentPassword"
                                    label="Current password"
                                    rules={[
                                        { required: true, message: 'Enter your current password' },
                                    ]}
                                >
                                    <Input.Password autoComplete="current-password" />
                                </Form.Item>
                                <p className="gp-account-section-hint">
                                    Confirmation emails may be sent to both your old and new address.
                                </p>
                                <div className="gp-account-section-actions">
                                    <Button type="primary" htmlType="submit" loading={savingEmail}>
                                        Update email
                                    </Button>
                                </div>
                            </Form>
                        </section>
                    ) : null}

                    {activeSection === 'security' ? (
                        <section
                            className="gp-account-section"
                            aria-labelledby="gp-account-security-title"
                        >
                            <header className="gp-account-section-header">
                                <h3
                                    id="gp-account-security-title"
                                    className="gp-account-section-title"
                                >
                                    Security
                                </h3>
                                <p className="gp-account-section-desc">
                                    Confirm with your current password, then choose a new one.
                                </p>
                            </header>
                            <Form
                                form={passwordForm}
                                layout="vertical"
                                className="gp-account-section-form"
                                onFinish={handleChangePassword}
                                requiredMark={false}
                            >
                                <Form.Item
                                    name="currentPassword"
                                    label="Current password"
                                    rules={[
                                        { required: true, message: 'Enter your current password' },
                                    ]}
                                >
                                    <Input.Password autoComplete="current-password" />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label="New password"
                                    rules={[
                                        { required: true, message: 'Enter a new password' },
                                        { min: 8, message: 'At least 8 characters' },
                                    ]}
                                >
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Confirm new password"
                                    dependencies={['newPassword']}
                                    rules={[
                                        { required: true, message: 'Confirm your new password' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (
                                                    !value ||
                                                    getFieldValue('newPassword') === value
                                                ) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(
                                                    new Error('Passwords do not match'),
                                                );
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                                <div className="gp-account-section-actions">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={savingPassword}
                                    >
                                        Update password
                                    </Button>
                                </div>
                            </Form>
                        </section>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
