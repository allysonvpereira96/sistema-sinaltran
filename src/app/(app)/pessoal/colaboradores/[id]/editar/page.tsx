import { notFound } from "next/navigation";
import {
  getColaboradorById,
  listCentrosCusto,
  listDocumentos,
  listDependentes,
  listEmergencias,
  listFerias,
  listPeriodosAquisitivos,
  listAso,
  listTreinamentos,
  listTreinamentosCatalogo,
  listAvaliacoes,
  listOcorrencias,
  listComentarios,
} from "@/lib/actions/colaboradores";
import { listEmpresas } from "@/lib/actions/orcamentos";
import { ColaboradorForm } from "../../_components/colaborador-form";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colaborador = await getColaboradorById(id);
  if (!colaborador) notFound();

  const [centrosCusto, empresas, documentos, dependentes, emergencias, ferias, periodosAq, aso, treinamentos, catalogoTreinamentos, avaliacoes, ocorrencias, comentarios] =
    await Promise.all([
      listCentrosCusto(),
      listEmpresas(),
      listDocumentos(id),
      listDependentes(id),
      listEmergencias(id),
      listFerias(id),
      listPeriodosAquisitivos(id),
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
      empresas={empresas}
      documentos={documentos}
      dependentes={dependentes}
      emergencias={emergencias}
      ferias={ferias}
      periodosAq={periodosAq}
      aso={aso}
      treinamentos={treinamentos}
      catalogoTreinamentos={catalogoTreinamentos}
      avaliacoes={avaliacoes}
      ocorrencias={ocorrencias}
      comentarios={comentarios}
    />
  );
}
