import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@refinedev/antd', '@uiw/react-json-view', '@gemini-proxy/pricing'],
    output: 'standalone',
};

export default withNextIntl(nextConfig);

initOpenNextCloudflareForDev();
