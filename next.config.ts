import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dashboard.olympusscans.com',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'dashboard.olympusbiblioteca.com',
        pathname: '/storage/**',
      },
    ],
  },
  webpack: (config) => {
    // Evita que módulos de providers sean evaluados antes de sus dependencias
    config.optimization = {
      ...config.optimization,
      moduleIds: 'named',
    };
    return config;
  },
};

export default nextConfig;
