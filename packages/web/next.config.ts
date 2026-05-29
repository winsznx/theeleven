import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // StrictMode mounts every effect twice in dev, which force-loses the
  // Ballpit WebGL context between mounts and crashes Three.js. The fresh
  // canvas-per-mount in Ballpit.tsx already covers production; turning
  // StrictMode off prevents the dev HMR race on the same canvas node.
  reactStrictMode: false,
  // P22: Next.js standalone output for Railway. The /api routes (status,
  // facilitator/stake, frame/*) all run in the same Node container.
  output: "standalone",
  transpilePackages: [],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
