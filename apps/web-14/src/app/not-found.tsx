'use client';

import { Suspense } from 'react';
import { Authenticated } from '@refinedev/core';
import { Button, Result } from 'antd';
import Link from 'next/link';

export default function NotFound() {
    return (
        <Suspense>
            <Authenticated key="not-found">
                <Result
                    status="404"
                    title="404"
                    subTitle="Sorry, the page you visited does not exist."
                    extra={
                        <Link href="/dashboard">
                            <Button type="primary">Back to Dashboard</Button>
                        </Link>
                    }
                />
            </Authenticated>
        </Suspense>
    );
}
