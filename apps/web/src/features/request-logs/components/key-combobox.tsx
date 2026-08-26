import React, { useMemo } from 'react';
import { Select } from 'antd';
import { useList, useTranslation } from '@refinedev/core';
import type { Tables } from '@gemini-proxy/database';

type KeyRow = Pick<Tables<'api_keys'>, 'id' | 'name' | 'deleted_at'>;

export type KeyComboboxProps = {
    resource: 'api_keys' | 'proxy_api_keys';
    value?: string;
    onChange?: (value: string | undefined) => void;
    placeholder?: string;
    allowClear?: boolean;
};

/**
 * Searchable key picker: label is "name · shortId", value is UUID.
 * Includes soft-deleted keys so historical log filters still resolve.
 */
export function KeyCombobox({
    resource,
    value,
    onChange,
    placeholder,
    allowClear = true,
}: KeyComboboxProps) {
    const { translate } = useTranslation();
    const { result, query } = useList<KeyRow>({
        resource,
        pagination: { currentPage: 1, pageSize: 200 },
        sorters: [{ field: 'name', order: 'asc' }],
        meta: { select: 'id, name, deleted_at' },
    });

    const options = useMemo(() => {
        const keys = result?.data ?? [];
        const removedMark = translate('request_logs.identity.removedSuffix');
        return keys.map((key) => {
            const shortId = key.id.slice(0, 8);
            const removed = key.deleted_at ? removedMark : '';
            return {
                value: key.id,
                label: `${key.name} · ${shortId}${removed}`,
            };
        });
    }, [result?.data, translate]);

    return (
        <Select
            showSearch
            allowClear={allowClear}
            loading={query.isLoading}
            value={value}
            onChange={(next) => onChange?.(next ?? undefined)}
            options={options}
            optionFilterProp="label"
            placeholder={placeholder}
            style={{ width: '100%' }}
        />
    );
}
