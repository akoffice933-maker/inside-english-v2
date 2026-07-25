/** @type {import('next').NextConfig} */

// Fixes Critical Vulnerability: Dynamic conditional compilation.
// Enables full SSR/Server mode (standard for Vercel/Docker) by default,
// but switches to Static SPA Export mode (output: 'export') ONLY when explicitly requested (for Capacitor/GitHub Pages).
const isExport = process.env.NEXT_OUTPUT_EXPORT === 'true';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Conditionally apply Static HTML Export configurations
  ...(isExport ? {
    output: 'export',
    images: { 
      unoptimized: true 
    },
    basePath: basePath,
    assetPrefix: basePath,
  } : {
    // Normal Server SSR Mode Configurations:
    // Security headers are fully supported here (they throw warnings in raw static export)
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            }
          ],
        },
      ];
    },
  })
};

module.exports = nextConfig;
