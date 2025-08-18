import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { authProviderServer } from '@providers/auth-provider/auth-provider.server';
import { ThemedLayoutV2 } from '@refinedev/antd';
import { Header } from '@components/header';

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
    const { authenticated, redirectTo } = await authProviderServer.check();
    if (!authenticated) {
        redirect(redirectTo || '/login');
    }
    return <ThemedLayoutV2 Header={Header}>{children}</ThemedLayoutV2>;
}
