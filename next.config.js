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
    // Security headers are fully supported here
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            // Fixes Blocker #1: Replaces X-Frame-Options: DENY (which broke Telegram Mini App iframe embeds on Web/Desktop!)
            // with Content-Security-Policy frame-ancestors to securely permit trusted Telegram origins while guarding clickjacking.
            {
              key: 'Content-Security-Policy',
              value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
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
        // Fixes Vulnerability #3b: Explicit Aggressive Cache-Control for immutable static audio assets
        {
          source: '/audio/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ];
    },
  })
};

module.exports = nextConfig;
