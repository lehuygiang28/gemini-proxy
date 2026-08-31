'use client';

import React, { useContext, useMemo } from 'react';
import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';
import { ColorModeContext } from '@contexts/color-mode';

export type JsonTreeViewerProps = {
    value: unknown;
    /** Collapse nodes deeper than this depth (0 = root expanded only). */
    collapsed?: number | boolean;
    maxHeight?: number | string;
    className?: string;
};

/**
 * Coerce arbitrary payload into an object JsonView can render.
 * Parses JSON strings; wraps primitives under `{ value }`.
 */
function coerceToViewValue(value: unknown): object {
    if (value !== null && typeof value === 'object') {
        return value as object;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                const parsed: unknown = JSON.parse(trimmed);
                if (parsed !== null && typeof parsed === 'object') {
                    return parsed as object;
                }
            } catch {
                // fall through — show as string value
            }
        }
        return { value };
    }
    return { value: value as string | number | boolean | null };
}

/**
 * Read-only JSON tree via @uiw/react-json-view — collapse, highlight, copy.
 */
export function JsonTreeViewer({
    value,
    collapsed = 1,
    maxHeight = 280,
    className,
}: JsonTreeViewerProps) {
    const { mode } = useContext(ColorModeContext);
    const viewValue = useMemo(() => coerceToViewValue(value), [value]);
    const theme = mode === 'light' ? lightTheme : darkTheme;

    return (
        <div
            className={`gp-panel-sunken gp-scrollable${className ? ` ${className}` : ''}`}
            style={{
                padding: 12,
                maxHeight,
                overflow: 'auto',
                fontSize: 12,
            }}
        >
            <JsonView
                value={viewValue}
                style={{
                    ...theme,
                    backgroundColor: 'transparent',
                    fontSize: 12,
                    fontFamily:
                        'var(--gp-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
                }}
                collapsed={collapsed}
                displayDataTypes={false}
                displayObjectSize
                enableClipboard
                indentWidth={16}
            />
        </div>
    );
}
