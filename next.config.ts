import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    instrumentationHook: true,
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
