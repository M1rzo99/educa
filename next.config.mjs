/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '*' },
            { protocol: 'http', hostname: '*' },
        ],
        domains: ['firebasestorage.googleapis.com'],
    },
}

export default nextConfig