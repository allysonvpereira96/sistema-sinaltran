import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // PDFs de ficha (escaneados) podem passar do limite padrão de 1MB
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
