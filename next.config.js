/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  // Configures static export when running on GitHub Actions Pages deployment
  output: 'export',
  images: { 
    unoptimized: true 
  },

  // Handles nested routing when hosted on GitHub Pages subfolder (e.g. /inside-english-v2)
  basePath: basePath,
  assetPrefix: basePath,

  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
