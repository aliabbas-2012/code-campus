/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  env: {
    NEXT_PUBLIC_PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || '/pyodide/',
  },
};

module.exports = nextConfig;
