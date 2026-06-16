import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (geração de PDF do orçamento) traz binários/wasm que
  // não devem ser empacotados pelo bundler — carregar do node_modules em runtime.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // PDFs de ficha (escaneados) podem passar do limite padrão de 1MB
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
