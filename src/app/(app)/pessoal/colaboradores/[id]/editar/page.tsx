import { notFound } from "next/navigation";
import {
  getColaboradorById,
  listCentrosCusto,
  listDocumentos,
  listDependentes,
  listFerias,
  listAso,
  listTreinamentos,
  listTreinamentosCatalogo,
  listAvaliacoes,
  listOcorrencias,
  listComentarios,
} from "@/lib/actions/colaboradores";
import { ColaboradorForm } from "../../_components/colaborador-form";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colaborador = await getColaboradorById(id);
  if (!colaborador) notFound();

  const [centrosCusto, documentos, dependentes, ferias, aso, treinamentos, catalogoTreinamentos, avaliacoes, ocorrencias, comentarios] =
    await Promise.all([
      listCentrosCusto(),
      listDocumentos(id),
      listDependentes(id),
      listFerias(id),
      listAso(id),
      listTreinamentos(id),
      listTreinamentosCatalogo(),
      listAvaliacoes(id),
      listOcorrencias(id),
      listComentarios(id),
    ]);

  return (
    <ColaboradorForm
      mode="edit"
      initialData={colaborador}
      centrosCusto={centrosCusto}
      documentos={documentos}
      dependentes={dependentes}
      ferias={ferias}
      aso={aso}
      treinamentos={treinamentos}
      catalogoTreinamentos={catalogoTreinamentos}
      avaliacoes={avaliacoes}
      ocorrencias={ocorrencias}
      comentarios={comentarios}
    />
  );
}
