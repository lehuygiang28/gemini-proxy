'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';
import { swrConfig } from '@/lib/swr-config';

interface SWRProviderProps {
    children: ReactNode;
}

export const SWRProvider: React.FC<SWRProviderProps> = ({ children }) => {
    return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
};
