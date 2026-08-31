/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  env: {
    NEXT_PUBLIC_PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
  },
};

module.exports = nextConfig;
