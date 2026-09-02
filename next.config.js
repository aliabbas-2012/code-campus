/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  env: {
    NEXT_PUBLIC_PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || 'https://cdn.jsdelivr.net/pyodide/v314.0.6/full/',
  },
};

module.exports = nextConfig;
