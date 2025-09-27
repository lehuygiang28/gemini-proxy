import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { authProviderServer } from '@providers/auth-provider/auth-provider.server';
import { CustomThemedLayoutV2 } from '@components/layout';

export default async function ProtectedAppLayout({ children }: { children: ReactNode }) {
    const { authenticated, redirectTo } = await authProviderServer.check();
    if (!authenticated) {
        redirect(redirectTo || '/login');
    }
    return <CustomThemedLayoutV2>{children}</CustomThemedLayoutV2>;
}
