const removeImports = require('next-remove-imports')();

/** @type {import('next').NextConfig} */
const nextConfig = removeImports({
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  output: 'standalone',
});

module.exports = nextConfig;
