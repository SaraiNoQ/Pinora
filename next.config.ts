import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  env: {
    PORT: "3000",
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig; 
