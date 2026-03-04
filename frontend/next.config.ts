import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Disabled because we added a server-side API route (/api/chat)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
