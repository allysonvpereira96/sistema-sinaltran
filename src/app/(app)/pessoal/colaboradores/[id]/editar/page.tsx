import { notFound } from "next/navigation";
import {
  getColaboradorById,
  listObrasResumo,
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

  const [obras, documentos, dependentes, ferias, aso, treinamentos, catalogoTreinamentos, avaliacoes, ocorrencias, comentarios] =
    await Promise.all([
      listObrasResumo(),
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
      obras={obras}
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
