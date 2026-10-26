/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Next 15.1 only accepts an OBJECT for devIndicators — `false` (which hides
     the dev-mode lightning bolt) needs Next >= 15.2. Keeping it valid here
     avoids the "Expected object, received boolean" startup warning. */
  transpilePackages: ["@careerverse/ui", "@careerverse/shared", "@careerverse/database"],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;
