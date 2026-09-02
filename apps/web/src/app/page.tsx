import { headers } from 'next/headers';
import { LandingPage } from '@/components/landing';
import { originFromRequestHeaders } from '@/features/landing/landing-snippets';

export default async function IndexPage() {
    const origin = originFromRequestHeaders(await headers());
    return <LandingPage origin={origin} />;
}
