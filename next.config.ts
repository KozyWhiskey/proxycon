import type { NextConfig } from "next";
import os from "os";

function houseHosts() {
  const hosts = new Set<string>();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) hosts.add(net.address);
    }
  }
  return [...hosts];
}

const nextConfig: NextConfig = {
  distDir: process.env.PROXYCON_DIST_DIR || '.next',
  reactCompiler: true,
  allowedDevOrigins: houseHosts(),
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
