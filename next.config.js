const removeImports = require('next-remove-imports')();

/** @type {import('next').NextConfig} */
const nextConfig = removeImports({
  reactStrictMode: true,
  experimental: {
    appDir: true,
    esmExternals: true,
  },
  output: 'standalone',
});

module.exports = nextConfig;
