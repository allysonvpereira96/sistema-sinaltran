import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DocumentosTab } from "../../_components/documentos-tab";
import { DependentesTab } from "../../_components/dependentes-tab";
import { FeriasTab } from "../../_components/ferias-tab";
import { AsoTab } from "../../_components/aso-tab";
import { TreinamentosTab } from "../../_components/treinamentos-tab";
import { AvaliacoesTab } from "../../_components/avaliacoes-tab";
import { OcorrenciasTab } from "../../_components/ocorrencias-tab";
import { ComentariosTab } from "../../_components/comentarios-tab";

export default async function EditarColaboradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colaborador = await getColaboradorById(id);
  if (!colaborador) notFound();

  const [obras, documentos, dependentes, ferias, aso, treinamentos, catalogo, avaliacoes, ocorrencias, comentarios] =
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
    <div className="space-y-2">
      <ColaboradorForm mode="edit" initialData={colaborador} obras={obras} />

      <div className="px-6 lg:px-8 max-w-[1100px] mx-auto w-full pb-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Documentos e registros</h2>
          <p className="text-sm text-muted-foreground">
            Anexos, dependentes, férias, ASO, treinamentos e anotações deste colaborador.
          </p>
        </div>

        <Tabs defaultValue="documentos">
          <TabsList className="flex-wrap">
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
            <TabsTrigger value="ferias">Férias</TabsTrigger>
            <TabsTrigger value="aso">ASO</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="pt-4">
            <DocumentosTab colaboradorId={id} documentos={documentos} />
          </TabsContent>
          <TabsContent value="dependentes" className="pt-4">
            <DependentesTab colaboradorId={id} dependentes={dependentes} />
          </TabsContent>
          <TabsContent value="ferias" className="pt-4">
            <FeriasTab colaboradorId={id} ferias={ferias} />
          </TabsContent>
          <TabsContent value="aso" className="pt-4">
            <AsoTab colaboradorId={id} aso={aso} />
          </TabsContent>
          <TabsContent value="treinamentos" className="pt-4">
            <TreinamentosTab colaboradorId={id} treinamentos={treinamentos} catalogo={catalogo} />
          </TabsContent>
          <TabsContent value="avaliacoes" className="pt-4">
            <AvaliacoesTab colaboradorId={id} avaliacoes={avaliacoes} />
          </TabsContent>
          <TabsContent value="ocorrencias" className="pt-4">
            <OcorrenciasTab colaboradorId={id} ocorrencias={ocorrencias} />
          </TabsContent>
          <TabsContent value="comentarios" className="pt-4">
            <ComentariosTab colaboradorId={id} comentarios={comentarios} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
