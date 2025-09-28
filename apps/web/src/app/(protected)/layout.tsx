import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { authProviderServer } from '@providers/auth-provider/auth-provider.server';
import { CustomThemedLayout } from '@components/layout/theme-layout';

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
    const { authenticated, redirectTo } = await authProviderServer.check();

    if (!authenticated) {
        redirect(redirectTo || '/login');
    }

    return <CustomThemedLayout>{children}</CustomThemedLayout>;
}
