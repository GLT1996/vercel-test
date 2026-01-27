import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Mock 'fs' for browser environment
      fs: './lib/empty-module.js',
    },
  },
};

export default nextConfig;
