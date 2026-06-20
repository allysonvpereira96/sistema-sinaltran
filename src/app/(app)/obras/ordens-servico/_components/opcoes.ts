import { listObras } from "@/lib/actions/obras";
import { listEquipamentos } from "@/lib/actions/equipamentos";
import { listColaboradores } from "@/lib/actions/colaboradores";
import type { ObraOption, VeiculoOption, ColaboradorOption } from "./os-form";

/** Carrega as opções dos selects do formulário de O.S. */
export async function carregarOpcoesOS(): Promise<{
  obras: ObraOption[];
  veiculos: VeiculoOption[];
  colaboradores: ColaboradorOption[];
}> {
  const [obras, equipamentos, colaboradores] = await Promise.all([
    listObras(),
    listEquipamentos(),
    listColaboradores(),
  ]);

  return {
    obras: obras.map((o) => ({
      id: o.id,
      numero: o.numero,
      nome: o.nome,
      cliente_id: o.cliente_id,
      cliente_nome: o.cliente?.nome_fantasia ?? o.cliente?.razao_social ?? null,
      cidade: o.cidade,
    })),
    veiculos: equipamentos
      .filter((e) => e.tipo === "veiculo")
      .map((e) => ({
        id: e.id,
        codigo: e.codigo,
        descricao: e.descricao,
        placa: e.placa,
      })),
    colaboradores: colaboradores
      .filter((c) => c.status === "ativo")
      .map((c) => ({
        id: c.id,
        nome_completo: c.nome_completo,
        cargo: c.cargo,
      })),
  };
}
