const removeImports = require('next-remove-imports')();

/** @type {import('next').NextConfig} */
const nextConfig = removeImports({
  reactStrictMode: true,
  experimental: {
    appDir: true,
    esmExternals: true,
  },
});

module.exports = nextConfig;
