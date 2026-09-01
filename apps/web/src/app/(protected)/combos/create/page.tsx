'use client';

import React from 'react';
import { Create, useForm } from '@refinedev/antd';
import { useGo, useList, useNotification, useTranslation } from '@refinedev/core';
import { Card, Form } from 'antd';
import { supabaseBrowserClient } from '@/utils/supabase/client';
import { ComboFormFields } from '@/features/combos/combo-form-fields';
import { comboSaveFieldError } from '@/features/combos/combo-save-error';
import type { UserSettings } from '@/features/settings/types';

export default function ComboCreatePage() {
    const { translate } = useTranslation();
    const go = useGo();
    const notification = useNotification();
    const { result } = useList<UserSettings>({
        resource: 'user_settings',
        pagination: { currentPage: 1, pageSize: 1 },
    });
    const globalStrategy = result?.data?.[0]?.combo_strategy ?? 'fallback';
    const { formProps, saveButtonProps, form } = useForm({
        resource: 'model_combos',
        action: 'create',
        redirect: 'list',
        defaultFormValues: {
            strategy: null,
            stick_after_successes: null,
            is_active: true,
            members: [],
            override_strategy: false,
        },
    });

    const handleFinish = async (values: {
        name: string;
        members: string[];
        strategy: string | null;
        stick_after_successes: number | null;
        is_active: boolean;
        override_strategy?: boolean;
    }) => {
        const { error } = await supabaseBrowserClient.rpc('save_model_combo', {
            p_id: null,
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

    return (
        <Create saveButtonProps={saveButtonProps} title={translate('combos.titles.create')}>
            <Card>
                <Form
                    {...formProps}
                    form={form}
                    layout="vertical"
                    onFinish={(values) => void handleFinish(values as never)}
                >
                    <ComboFormFields isCreate globalStrategy={String(globalStrategy)} />
                </Form>
            </Card>
        </Create>
    );
}
