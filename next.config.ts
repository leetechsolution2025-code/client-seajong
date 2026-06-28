import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    RESTART_TIMESTAMP: "2026-05-01T14:18:00"
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;
