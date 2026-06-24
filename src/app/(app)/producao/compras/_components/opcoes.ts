import { listObras } from "@/lib/actions/obras";
import { listColaboradores } from "@/lib/actions/colaboradores";
import { listFornecedores } from "@/lib/actions/fornecedores";
import { listMateriais } from "@/lib/actions/materiais";

export type ObraOption = {
  id: string;
  numero: string;
  nome: string;
  cidade: string | null;
};
export type ColaboradorOption = {
  id: string;
  nome_completo: string;
  cargo: string | null;
};
export type FornecedorOption = {
  id: string;
  nome: string;
  nome_fantasia: string | null;
};
export type MaterialOption = {
  id: string;
  codigo: string | null;
  descricao: string;
  unidade_medida: string;
  valor_referencia: number;
};

export type ComprasOpcoes = {
  obras: ObraOption[];
  colaboradores: ColaboradorOption[];
  fornecedores: FornecedorOption[];
  materiais: MaterialOption[];
};

/** Carrega as opções dos selects/autocompletes do módulo de Compras. */
export async function carregarOpcoesCompras(): Promise<ComprasOpcoes> {
  const [obras, colaboradores, fornecedores, materiais] = await Promise.all([
    listObras(),
    listColaboradores(),
    listFornecedores(),
    listMateriais(),
  ]);

  return {
    obras: obras.map((o) => ({
      id: o.id,
      numero: o.numero,
      nome: o.nome,
      cidade: o.cidade,
    })),
    colaboradores: colaboradores
      .filter((c) => c.status === "ativo")
      .map((c) => ({ id: c.id, nome_completo: c.nome_completo, cargo: c.cargo })),
    fornecedores: fornecedores
      .filter((f) => f.ativo)
      .map((f) => ({ id: f.id, nome: f.nome, nome_fantasia: f.nome_fantasia })),
    materiais: materiais
      .filter((m) => m.ativo)
      .map((m) => ({
        id: m.id,
        codigo: m.codigo,
        descricao: m.descricao,
        unidade_medida: m.unidade_medida,
        valor_referencia: m.valor_referencia,
      })),
  };
}
