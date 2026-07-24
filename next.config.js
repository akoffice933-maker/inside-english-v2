/** @type {import('next').NextConfig} */
const nextConfig = {
  // If exporting as static SPA for Capacitor iOS build:
  // output: 'export',
  // images: { unoptimized: true },

  reactStrictMode: true,
  poweredByHeader: false,
  
  // Custom headers to prevent security violations (OWASP best practice)
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
};

module.exports = nextConfig;
