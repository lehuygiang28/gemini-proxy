'use client';

import { Suspense } from 'react';

import { WelcomePage } from '@refinedev/core';

export default function IndexPage() {
    return (
        <Suspense>
            <WelcomePage />
        </Suspense>
    );
}
