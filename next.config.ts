import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (geração de PDF do orçamento) traz binários/wasm que
  // não devem ser empacotados pelo bundler — carregar do node_modules em runtime.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Server Actions que recebem arquivo (createOcorrenciaCaderno, ficha PDF…)
    // PDFs escaneados podem chegar facilmente a 10–15 MB. Upload em lote de
    // documentos do colaborador NÃO usa Server Action — vai direto ao Storage.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
