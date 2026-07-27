import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // typically disable in dev to avoid aggressive caching
});

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

export default withSerwist(nextConfig);
