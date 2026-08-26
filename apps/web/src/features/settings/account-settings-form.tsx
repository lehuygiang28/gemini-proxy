'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Avatar, Button, Form, Input, Typography } from 'antd';
import { useGetIdentity, useNotification, useTranslation } from '@refinedev/core';
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

function initialsFrom(identity?: Identity | null): string {
    const source = identity?.name?.trim() || identity?.email?.trim() || '?';
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

function displayNameFrom(identity: Identity | null | undefined, fallback: string): string {
    const name = identity?.name?.trim();
    const email = identity?.email?.trim();
    if (name && email && name.toLowerCase() !== email.toLowerCase()) {
        return name;
    }
    if (email) {
        return email.split('@')[0] || fallback;
    }
    return name || fallback;
}

/**
 * Account profile + security — Supabase Auth updateUser / signInWithPassword.
 * Clerk-inspired split layout: left nav + active section pane.
 */
export function AccountSettingsForm() {
    const { translate } = useTranslation();
    const [activeSection, setActiveSection] = useState<AccountSection>('profile');
    const [profileForm] = Form.useForm<ProfileFormValues>();
    const [emailForm] = Form.useForm<EmailFormValues>();
    const [passwordForm] = Form.useForm<PasswordFormValues>();
    const { data: identity, isLoading, refetch } = useGetIdentity<Identity>();
    const notification = useNotification();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const navItems: readonly NavItem[] = useMemo(
        () => [
            { key: 'profile', label: translate('account.profile'), icon: <UserOutlined /> },
            { key: 'email', label: translate('account.email'), icon: <MailOutlined /> },
            { key: 'security', label: translate('account.security'), icon: <LockOutlined /> },
        ],
        [translate],
    );

    useEffect(() => {
        if (!identity) {
            return;
        }
        profileForm.setFieldsValue({
            displayName: identity.name && identity.name !== identity.email ? identity.name : '',
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
                message: translate('account.profileUpdated'),
                description: translate('account.profileUpdatedDesc'),
            });
        } catch (error: unknown) {
            notification.open?.({
                type: 'error',
                message: translate('account.profileFailed'),
                description: translate('common.genericError'),
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const reauthenticate = async (password: string) => {
        const email = identity?.email;
        if (!email) {
            throw new Error(translate('account.noEmail'));
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
                message: translate('account.emailRequested'),
                description: translate('account.emailRequestedDesc'),
            });
        } catch (error: unknown) {
            const noEmail = translate('account.noEmail');
            const description =
                error instanceof Error && error.message === noEmail
                    ? noEmail
                    : translate('common.genericError');
            notification.open?.({
                type: 'error',
                message: translate('account.emailFailed'),
                description,
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
                message: translate('account.passwordUpdated'),
                description: translate('account.passwordUpdatedDesc'),
            });
        } catch (error: unknown) {
            const noEmail = translate('account.noEmail');
            const description =
                error instanceof Error && error.message === noEmail
                    ? noEmail
                    : translate('common.genericError');
            notification.open?.({
                type: 'error',
                message: translate('account.passwordFailed'),
                description,
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="gp-account-layout">
                <Text type="secondary" className="gp-account-status">
                    {translate('account.loading')}
                </Text>
            </div>
        );
    }

    if (!identity?.id) {
        return (
            <div className="gp-account-layout">
                <div className="gp-account-status">
                    <Alert type="warning" showIcon message={translate('account.signInRequired')} />
                </div>
            </div>
        );
    }

    const primaryLabel = displayNameFrom(identity, translate('account.title'));
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
                <nav
                    className="gp-account-nav gp-scrollable"
                    aria-label={translate('account.sectionsAria')}
                >
                    {navItems.map((item) => {
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
                        <section
                            className="gp-account-section"
                            aria-labelledby="gp-account-profile-title"
                        >
                            <header className="gp-account-section-header">
                                <h3
                                    id="gp-account-profile-title"
                                    className="gp-account-section-title"
                                >
                                    {translate('account.profile')}
                                </h3>
                                <p className="gp-account-section-desc">
                                    {translate('account.profileDesc')}
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
                                    label={translate('account.displayName')}
                                    rules={[
                                        {
                                            max: DISPLAY_NAME_MAX,
                                            message: translate('account.maxChars', {
                                                max: DISPLAY_NAME_MAX,
                                            }),
                                        },
                                    ]}
                                >
                                    <Input
                                        placeholder={translate('account.displayNamePlaceholder')}
                                        maxLength={DISPLAY_NAME_MAX}
                                        showCount
                                    />
                                </Form.Item>
                                <div className="gp-account-section-actions">
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={savingProfile}
                                    >
                                        {translate('buttons.save')}
                                    </Button>
                                </div>
                            </Form>
                        </section>
                    ) : null}

                    {activeSection === 'email' ? (
                        <section
                            className="gp-account-section"
                            aria-labelledby="gp-account-email-title"
                        >
                            <header className="gp-account-section-header">
                                <h3
                                    id="gp-account-email-title"
                                    className="gp-account-section-title"
                                >
                                    {translate('account.email')}
                                </h3>
                                <p className="gp-account-section-desc">
                                    {translate('account.emailDesc')}
                                </p>
                            </header>
                            <div className="gp-account-current-row">
                                <span className="gp-account-current-label">
                                    {translate('account.currentEmail')}
                                </span>
                                <span className="gp-account-current-value">
                                    {emailLabel || translate('common.na')}
                                </span>
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
                                    label={translate('account.newEmail')}
                                    rules={[
                                        {
                                            required: true,
                                            message: translate('account.enterEmail'),
                                        },
                                        { type: 'email', message: translate('account.validEmail') },
                                    ]}
                                >
                                    <Input autoComplete="email" />
                                </Form.Item>
                                <Form.Item
                                    name="currentPassword"
                                    label={translate('account.currentPassword')}
                                    rules={[
                                        {
                                            required: true,
                                            message: translate('account.enterCurrentPassword'),
                                        },
                                    ]}
                                >
                                    <Input.Password autoComplete="current-password" />
                                </Form.Item>
                                <p className="gp-account-section-hint">
                                    {translate('account.emailHint')}
                                </p>
                                <div className="gp-account-section-actions">
                                    <Button type="primary" htmlType="submit" loading={savingEmail}>
                                        {translate('account.updateEmail')}
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
                                    {translate('account.security')}
                                </h3>
                                <p className="gp-account-section-desc">
                                    {translate('account.securityDesc')}
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
                                    label={translate('account.currentPassword')}
                                    rules={[
                                        {
                                            required: true,
                                            message: translate('account.enterCurrentPassword'),
                                        },
                                    ]}
                                >
                                    <Input.Password autoComplete="current-password" />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label={translate('account.newPassword')}
                                    rules={[
                                        {
                                            required: true,
                                            message: translate('account.enterNewPassword'),
                                        },
                                        { min: 8, message: translate('account.minPassword') },
                                    ]}
                                >
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label={translate('account.confirmPassword')}
                                    dependencies={['newPassword']}
                                    rules={[
                                        {
                                            required: true,
                                            message: translate('account.confirmRequired'),
                                        },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (
                                                    !value ||
                                                    getFieldValue('newPassword') === value
                                                ) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(
                                                    new Error(translate('account.mismatch')),
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
                                        {translate('account.updatePassword')}
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
