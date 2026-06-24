import { listEpiCatalogo, listEpiCategorias, listEpiMarcas } from "@/lib/actions/epi";
import { CatalogoView } from "./_components/catalogo-view";

export const metadata = { title: "Catálogo de EPI · Almoxarifado" };

export default async function CatalogoEpiPage() {
  const [itens, categorias, marcas] = await Promise.all([
    listEpiCatalogo(),
    listEpiCategorias(),
    listEpiMarcas(),
  ]);
  return <CatalogoView itens={itens} categorias={categorias} marcas={marcas} />;
}
