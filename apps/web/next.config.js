/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Hide the dev-mode lightning-bolt indicator (boolean support needs Next >= 15.2) */
  devIndicators: false,
  transpilePackages: ["@careerverse/ui", "@careerverse/shared", "@careerverse/database"],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
