import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cards.scryfall.io',
      },
    ],
  },
};

export default nextConfig;
