/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  env: {
    NEXT_PUBLIC_PYODIDE_CDN_URL: process.env.NEXT_PUBLIC_PYODIDE_CDN_URL || '/pyodide/',
  },
  // Next's dev server blocks cross-origin requests to dev-only assets/endpoints by
  // default (DNS-rebinding protection) — that's what causes a 403 when opening the
  // app from a LAN IP like http://192.168.x.x:3007 instead of localhost. Add any
  // hostnames you access the dev server from (no scheme/port) via ALLOWED_DEV_ORIGINS
  // in .env.local, comma-separated, e.g. ALLOWED_DEV_ORIGINS=192.168.0.146
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

module.exports = nextConfig;
