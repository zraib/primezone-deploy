/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Environment variables
  env: {
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  },
  // Public runtime config for client-side access
  publicRuntimeConfig: {
    AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
    S3_CUSTOM_DOMAIN: process.env.NEXT_PUBLIC_S3_CUSTOM_DOMAIN,
  },
  // Image optimization for S3 images
  images: {
    domains: [
      's3.amazonaws.com',
      `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com`,
      `${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com`,
    ].filter(Boolean),
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // API configuration should be handled in individual API route files
  // Body parser and response limits are configured per route
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker files
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    
    // Copy PDF.js worker files
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]',
      },
    });
    
    return config;
  },
  // Output configuration for static export if needed
  output: 'standalone',
  // Disable x-powered-by header
  poweredByHeader: false,
  // Compression
  compress: true,
};

module.exports = nextConfig;
