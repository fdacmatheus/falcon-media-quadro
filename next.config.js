const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig; 