'use client';

import { ErrorComponent } from '@refinedev/antd';
import { Authenticated } from '@refinedev/core';
import { Suspense } from 'react';

export default function GlobalError() {
    return (
        <Suspense>
            <Authenticated key="error">
                <ErrorComponent />
            </Authenticated>
        </Suspense>
    );
}
