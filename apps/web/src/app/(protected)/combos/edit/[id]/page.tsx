'use client';

import React from 'react';
import { Edit, useForm } from '@refinedev/antd';
import { useGo, useList, useNotification, useTranslation } from '@refinedev/core';
import { Card, Form, Spin } from 'antd';
import { supabaseBrowserClient } from '@/utils/supabase/client';
import { ComboFormFields } from '@/features/combos/combo-form-fields';
import { comboSaveFieldError } from '@/features/combos/combo-save-error';
import type { UserSettings } from '@/features/settings/types';

type ComboQuery = {
    id: string;
    name: string;
    strategy: string | null;
    stick_after_successes: number | null;
    is_active: boolean;
    model_combo_members?: Array<{ position: number; canonical_model: string }>;
};

export default function ComboEditPage() {
    const { translate } = useTranslation();
    const go = useGo();
    const notification = useNotification();
    const { result } = useList<UserSettings>({
        resource: 'user_settings',
        pagination: { currentPage: 1, pageSize: 1 },
    });
    const globalStrategy = result?.data?.[0]?.combo_strategy ?? 'fallback';
    const { formProps, saveButtonProps, query, form, formLoading } = useForm<ComboQuery>({
        resource: 'model_combos',
        action: 'edit',
        redirect: 'list',
        meta: {
            select: '*, model_combo_members(*)',
        },
    });
    const record = query?.data?.data;
    const members = [...(record?.model_combo_members ?? [])]
        .sort((left, right) => left.position - right.position)
        .map((member) => member.canonical_model);
    const formKey = `${record?.id ?? 'new'}:${record?.name ?? ''}:${members.join(',')}`;

    const handleFinish = async (values: {
        name: string;
        members: string[];
        strategy: string | null;
        stick_after_successes: number | null;
        is_active: boolean;
        override_strategy?: boolean;
    }) => {
        if (!record?.id) {
            return;
        }
        const { error } = await supabaseBrowserClient.rpc('save_model_combo', {
            p_id: record.id,
            p_name: values.name,
            p_strategy: values.override_strategy ? values.strategy : null,
            p_stick_after_successes: values.override_strategy ? values.stick_after_successes : null,
            p_is_active: values.is_active,
            p_members: values.members,
        });
        if (error) {
            const fieldError = comboSaveFieldError(error.message);
            if (fieldError) {
                form.setFields([
                    {
                        name: fieldError.field,
                        errors: [translate(fieldError.messageKey)],
                    },
                ]);
            } else {
                notification.open({
                    type: 'error',
                    message: translate('combos.saveFailed'),
                });
            }
            throw error;
        }
        go({ to: '/combos' });
    };

    if (formLoading && !record) {
        return <Spin />;
    }

    return (
        <Edit saveButtonProps={saveButtonProps} title={translate('combos.titles.edit')}>
            <Card>
                <Form
                    {...formProps}
                    form={form}
                    key={formKey}
                    layout="vertical"
                    initialValues={{
                        name: record?.name,
                        members,
                        strategy: record?.strategy,
                        stick_after_successes: record?.stick_after_successes,
                        is_active: record?.is_active ?? true,
                        override_strategy: record?.strategy != null,
                    }}
                    onFinish={(values) => void handleFinish(values as never)}
                >
                    <ComboFormFields isCreate={false} globalStrategy={String(globalStrategy)} />
                </Form>
            </Card>
        </Edit>
    );
}
