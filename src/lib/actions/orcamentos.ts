"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getEmpresaAtivaId } from "@/lib/actions/empresas";
import { EMPRESAS as MOCK_EMPRESAS, MATERIAIS as MOCK_MATERIAIS } from "@/lib/mocks/cadastros";
import type {
  OrcamentoInput,
  OrcamentoItemInput,
  OrcamentoListRow,
  OrcamentoDetalhe,
  OrcamentoStatus,
} from "@/lib/types/orcamento";

const BASE_PATH = "/comercial/orcamentos";

export type EmpresaResumo = {
  id: string;
  nome: string;
  razao_social: string;
  responsavel_padrao: string | null;
};

export type MaterialResumo = {
  id: string;
  codigo: string | null;
  descricao: string;
  unidade_medida: string | null;
  valor_referencia: number | null;
  valor_mao_obra: number | null;
};

const today = () => new Date().toISOString().slice(0, 10);

// ── Selects auxiliares para o formulário ────────────────────────────────────

/** Empresas emissoras (Sinaltran / Sinalshop) para o seletor do orçamento. */
export async function listEmpresas(): Promise<EmpresaResumo[]> {
  if (!hasSupabase()) {
    return MOCK_EMPRESAS.map((e) => ({
      id: e.id,
      nome: e.nome,
      razao_social: e.razao_social,
      responsavel_padrao: e.responsavel_padrao,
    }));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nome, razao_social, responsavel_padrao")
    .eq("ativa", true)
    .order("nome", { ascending: true });
  if (error) {
    console.error("[listEmpresas]", error.message);
    return [];
  }
  return (data ?? []) as EmpresaResumo[];
}

/** Catálogo de materiais (id + código + descrição) para vincular a itens. */
export async function listMateriaisResumo(): Promise<MaterialResumo[]> {
  if (!hasSupabase()) {
    return MOCK_MATERIAIS.map((m) => ({
      id: m.id,
      codigo: m.codigo,
      descricao: m.descricao,
      unidade_medida: m.unidade_medida,
      valor_referencia: m.valor_referencia,
      valor_mao_obra: 0,
    }));
  }
  const escopo = await getEmpresaAtivaId();
  const supabase = await createClient();
  let q = supabase
    .from("materiais")
    .select("id, codigo, descricao, unidade_medida, valor_referencia, valor_mao_obra")
    .eq("ativo", true)
    .order("descricao", { ascending: true });
  if (escopo) q = q.eq("empresa_id", escopo);
  const { data, error } = await q;
  if (error) {
    console.error("[listMateriaisResumo]", error.message);
    return [];
  }
  return (data ?? []) as MaterialResumo[];
}

// ── Numeração ───────────────────────────────────────────────────────────────

/** Próximo número sequencial no formato ORC-AAAA-NNNN para o ano corrente. */
export async function proximoNumero(): Promise<string> {
  const ano = new Date().getFullYear();
  const prefixo = `ORC-${ano}-`;
  if (!hasSupabase()) return `${prefixo}0001`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("numero")
    .like("numero", `${prefixo}%`);
  if (error) {
    console.error("[proximoNumero]", error.message);
    return `${prefixo}0001`;
  }
  let max = 0;
  for (const row of data ?? []) {
    const n = Number(String((row as { numero: string }).numero).slice(prefixo.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefixo}${String(max + 1).padStart(4, "0")}`;
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function listOrcamentos(): Promise<OrcamentoListRow[]> {
  if (!hasSupabase()) return [];
  const escopo = await getEmpresaAtivaId();
  const supabase = await createClient();
  let q = supabase
    .from("orcamentos")
    .select(
      "*, cliente:clientes(razao_social, nome_fantasia), empresa:empresas(nome), blocos:orcamento_blocos(tipo)",
    )
    .order("created_at", { ascending: false });
  if (escopo) q = q.eq("empresa_id", escopo);
  const { data, error } = await q;
  if (error) {
    console.error("[listOrcamentos]", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrcamentoListRow[];
}

export async function getOrcamento(id: string): Promise<OrcamentoDetalhe | null> {
  if (!id || !hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select(
      `*,
       cliente:clientes(id, razao_social, nome_fantasia, cnpj_cpf, responsavel),
       empresa:empresas(id, nome, razao_social, cnpj, endereco, cidade, estado, telefone, email, responsavel_padrao),
       itens:orcamento_itens(*),
       blocos:orcamento_blocos(*, empresa:empresas(nome, cnpj), itens:orcamento_itens(*))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getOrcamento]", error.message);
    return null;
  }
  if (!data) return null;
  const detalhe = data as unknown as OrcamentoDetalhe;
  // PostgREST não garante ordem do embed — ordenar por `ordem`.
  detalhe.itens = [...(detalhe.itens ?? [])].sort((a, b) => a.ordem - b.ordem);
  const ordemBloco: Record<string, number> = { servicos: 0, produtos: 1, sinalshop: 2 };
  detalhe.blocos = [...(detalhe.blocos ?? [])]
    .map((b) => ({ ...b, itens: [...(b.itens ?? [])].sort((a, c) => a.ordem - c.ordem) }))
    .sort((a, b) => (ordemBloco[a.tipo] ?? 9) - (ordemBloco[b.tipo] ?? 9));
  return detalhe;
}

// ── Escrita ─────────────────────────────────────────────────────────────────

/** Calcula totais por item + ordem (1-based) e o total geral do orçamento. */
function montarItens(itens: OrcamentoItemInput[]) {
  let valorTotal = 0;
  const linhas = itens.map((i, idx) => {
    const q = Number(i.quantidade) || 0;
    const mo = Number(i.valor_unit_mao_obra) || 0;
    const mat = Number(i.valor_unit_material) || 0;
    const totalMo = q * mo;
    const totalMat = q * mat;
    const total = totalMo + totalMat;
    valorTotal += total;
    return {
      secao: i.secao?.trim() || null,
      ordem: idx + 1,
      material_id: i.material_id || null,
      servico_id: i.servico_id || null,
      descricao: i.descricao.trim(),
      unidade_medida: i.unidade_medida || "UN",
      quantidade: q,
      valor_unit_mao_obra: mo,
      valor_unit_material: mat,
      valor_total_mao_obra: totalMo,
      valor_total_material: totalMat,
      valor_total: total,
      observacoes: i.observacoes || null,
    };
  });
  return { linhas, valorTotal };
}

function dadosOrcamento(input: OrcamentoInput, valorTotal: number) {
  return {
    empresa_id: input.empresa_id || null,
    cliente_id: input.cliente_id || null,
    responsavel: input.responsavel?.trim() || null,
    descricao: input.descricao?.trim() || null,
    endereco: input.endereco || null,
    cidade: input.cidade || null,
    estado: input.estado || null,
    engenheiro_responsavel: input.engenheiro_responsavel || null,
    crea_engenheiro: input.crea_engenheiro || null,
    prazo_execucao: input.prazo_execucao || null,
    condicoes_pagamento: input.condicoes_pagamento || null,
    status: input.status,
    data_envio: input.data_envio || null,
    data_validade: input.data_validade || null,
    data_aprovacao:
      input.status === "aprovado" ? today() : null,
    observacoes: input.observacoes || null,
    emite_nota_unica_servico: input.emite_nota_unica_servico ?? false,
    valor_total: valorTotal,
  };
}

function validar(input: OrcamentoInput): string | null {
  if (!input.empresa_id) return "Empresa emissora é obrigatória.";
  if (!input.cliente_id) return "Cliente é obrigatório.";
  if (!input.descricao?.trim()) return "Descrição é obrigatória.";
  if (!input.itens?.length) return "Adicione pelo menos um item.";
  if (input.itens.some((i) => !i.descricao?.trim()))
    return "Todos os itens precisam de descrição.";
  return null;
}

export async function createOrcamento(
  input: OrcamentoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };

  const { linhas, valorTotal } = montarItens(input.itens);

  if (!hasSupabase()) return { ok: true, id: `oc-${Date.now().toString(36)}` };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // Tenta inserir; em colisão de número (23505) regenera e tenta de novo.
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const numero =
      tentativa === 0 && input.numero?.trim()
        ? input.numero.trim()
        : await proximoNumero();

    const { data, error } = await supabase
      .from("orcamentos")
      .insert({
        ...dadosOrcamento(input, valorTotal),
        numero,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") continue; // número duplicado — regenera
      console.error("[createOrcamento]", error.message);
      return { ok: false, error: error.message };
    }

    const orcamentoId = (data as { id: string }).id;
    if (linhas.length) {
      const { error: itensErr } = await supabase
        .from("orcamento_itens")
        .insert(linhas.map((l) => ({ ...l, orcamento_id: orcamentoId })));
      if (itensErr) {
        console.error("[createOrcamento] itens", itensErr.message);
        // rollback do cabeçalho para não deixar órfão
        await supabase.from("orcamentos").delete().eq("id", orcamentoId);
        return { ok: false, error: itensErr.message };
      }
    }
    revalidatePath(BASE_PATH);
    return { ok: true, id: orcamentoId };
  }
  return { ok: false, error: "Não foi possível gerar um número único. Tente novamente." };
}

export async function updateOrcamento(
  id: string,
  input: OrcamentoInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const erro = validar(input);
  if (erro) return { ok: false, error: erro };

  const { linhas, valorTotal } = montarItens(input.itens);

  if (!hasSupabase()) return { ok: true };

  const supabase = await createClient();

  // Orçamentos unificados (importados do Omie) têm blocos: o formulário legado
  // não os edita. Nesse caso atualiza só o cabeçalho (inclui o flag de NFS única)
  // e PRESERVA itens/total/blocos — não reescreve.
  const { count: nBlocos } = await supabase
    .from("orcamento_blocos")
    .select("id", { count: "exact", head: true })
    .eq("orcamento_id", id);
  const temBlocos = (nBlocos ?? 0) > 0;

  const header = dadosOrcamento(input, valorTotal);
  if (temBlocos) delete (header as { valor_total?: number }).valor_total;

  const { error } = await supabase.from("orcamentos").update(header).eq("id", id);
  if (error) {
    console.error("[updateOrcamento]", error.message);
    return { ok: false, error: error.message };
  }

  if (temBlocos) {
    revalidatePath(BASE_PATH);
    revalidatePath(`${BASE_PATH}/${id}`);
    revalidatePath(`${BASE_PATH}/${id}/editar`);
    return { ok: true };
  }

  // Substitui os itens (delete + re-insert) — mais simples que diff incremental.
  const { error: delErr } = await supabase
    .from("orcamento_itens")
    .delete()
    .eq("orcamento_id", id);
  if (delErr) {
    console.error("[updateOrcamento] del itens", delErr.message);
    return { ok: false, error: delErr.message };
  }
  if (linhas.length) {
    const { error: insErr } = await supabase
      .from("orcamento_itens")
      .insert(linhas.map((l) => ({ ...l, orcamento_id: id })));
    if (insErr) {
      console.error("[updateOrcamento] ins itens", insErr.message);
      return { ok: false, error: insErr.message };
    }
  }

  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  revalidatePath(`${BASE_PATH}/${id}/editar`);
  return { ok: true };
}

export async function setOrcamentoStatus(
  id: string,
  status: OrcamentoStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase
    .from("orcamentos")
    .update({
      status,
      ...(status === "aprovado" ? { data_aprovacao: today() } : {}),
    })
    .eq("id", id);
  if (error) {
    console.error("[setOrcamentoStatus]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  revalidatePath(`${BASE_PATH}/${id}`);
  return { ok: true };
}

export async function deleteOrcamento(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasSupabase()) return { ok: true };
  const supabase = await createClient();
  // orcamento_itens tem ON DELETE CASCADE — basta apagar o cabeçalho.
  const { error } = await supabase.from("orcamentos").delete().eq("id", id);
  if (error) {
    console.error("[deleteOrcamento]", error.message);
    return { ok: false, error: error.message };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

