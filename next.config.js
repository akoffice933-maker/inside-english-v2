/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Static export (output: 'export') is only for the GitHub Pages demo build
// and the Capacitor/iOS shell — BOTH of which strip out app/api and
// middleware.ts entirely. The default `next build` (used by Vercel for the
// real server deployment with API routes + middleware) must NOT use it.
// Set BUILD_TARGET=static explicitly to opt into static export.
const isStaticBuild = process.env.BUILD_TARGET === 'static';

const nextConfig = {
  ...(isStaticBuild
    ? {
        output: 'export',
        images: { unoptimized: true },
        basePath: basePath,
        assetPrefix: basePath,
      }
    : {}),

  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
