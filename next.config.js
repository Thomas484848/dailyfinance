/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static2.finnhub.io',
      },
      {
        protocol: 'https',
        hostname: 'finnhub.io',
      },
      {
        protocol: 'https',
        hostname: 'financialmodelingprep.com',
      },
      {
        protocol: 'https',
        hostname: 'www.financialmodelingprep.com',
      },
    ],
  },
};

module.exports = nextConfig;

