/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevent double-mount canvas reinitializations in development
  webpack: (config) => {
    // Konva uses canvas module if in node, but we're browser-first
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
