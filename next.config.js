import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['via.placeholder.com'],
  },
  async rewrites() {
    return [
      // Redirecionar /api/videos/uploads para /uploads
      {
        source: '/api/videos/:path*',
        destination: '/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '@services': path.join(__dirname, 'src/services'),
      '@config': path.join(__dirname, 'src/config'),
    };
    return config;
  },
};

export default nextConfig; 