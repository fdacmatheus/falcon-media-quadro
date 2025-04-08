/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000']
    },
  },
  async headers() {
    return [
      {
        source: '/api/videos/:path*',
        headers: [
          {
            key: 'Accept-Ranges',
            value: 'bytes'
          }
        ],
      },
    ];
  }
};

module.exports = nextConfig; 