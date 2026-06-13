const removeImports = require('next-remove-imports')();

/** @type {import('next').NextConfig} */
const nextConfig = removeImports({
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  // Standalone output is used for the Docker image. The e2e tests build + run via
  // `next start`, which is incompatible with standalone, so they opt out via this flag.
  output: process.env.NEXT_DISABLE_STANDALONE === '1' ? undefined : 'standalone',
});

module.exports = nextConfig;
