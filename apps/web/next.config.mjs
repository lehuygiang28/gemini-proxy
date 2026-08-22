import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@refinedev/antd', '@uiw/react-json-view'],
    output: 'standalone',
};

export default nextConfig;

initOpenNextCloudflareForDev();
