"use server";

import { createClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

export type RelObraRow = {
  obra_id: string;
  numero: string;
  nome: string;
  cliente_nome: string | null;
  os_count: number;
  dias_equipe: number;
  km_total: number;
  cidades: string[];
  primeira: string | null;
  ultima: string | null;
};

export type RelColabRow = {
  colaborador_id: string;
  nome: string;
  cargo: string | null;
  dias: number;
  como_encarregado: number;
  como_motorista: number;
  obras: number;
};

export type RelFrotaRow = {
  veiculo_id: string;
  codigo: string;
  descricao: string;
  placa: string | null;
  km_total: number;
  dias: number;
  obras: number;
  motoristas: number;
};

export type RelatorioOS = {
  periodo: { inicio: string; fim: string };
  resumo: {
    os_count: number;
    km_total: number;
    colaboradores: number;
    veiculos: number;
    obras: number;
  };
  obras: RelObraRow[];
  colaboradores: RelColabRow[];
  frota: RelFrotaRow[];
};

type Embed<T> = T | T[] | null;
function one<T>(v: Embed<T>): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

type OSRaw = {
  id: string;
  data: string;
  obra_id: string | null;
  cidade: string | null;
  veiculo_id: string | null;
  encarregado_id: string | null;
  motorista_id: string | null;
  km_inicial: number | null;
  km_final: number | null;
  obra: Embed<{ numero: string; nome: string }>;
  cliente: Embed<{ razao_social: string; nome_fantasia: string | null }>;
  veiculo: Embed<{ codigo: string; descricao: string; placa: string | null }>;
  encarregado: Embed<{ nome_completo: string; cargo: string | null }>;
  motorista: Embed<{ nome_completo: string; cargo: string | null }>;
};

const SELECT = `
  id, data, obra_id, cidade, veiculo_id, encarregado_id, motorista_id, km_inicial, km_final,
  obra:obras(numero, nome),
  cliente:clientes(razao_social, nome_fantasia),
  veiculo:equipamentos(codigo, descricao, placa),
  encarregado:colaboradores!encarregado_id(nome_completo, cargo),
  motorista:colaboradores!motorista_id(nome_completo, cargo)
`;

function kmRodado(ini: number | null, fim: number | null): number {
  if (ini == null || fim == null) return 0;
  const d = Number(fim) - Number(ini);
  return d > 0 ? d : 0;
}

const vazio = (inicio: string, fim: string): RelatorioOS => ({
  periodo: { inicio, fim },
  resumo: { os_count: 0, km_total: 0, colaboradores: 0, veiculos: 0, obras: 0 },
  obras: [],
  colaboradores: [],
  frota: [],
});

export async function getRelatorioOS({
  inicio,
  fim,
}: {
  inicio: string;
  fim: string;
}): Promise<RelatorioOS> {
  if (!hasSupabase()) return vazio(inicio, fim);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ordens_servico")
    .select(SELECT)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data", { ascending: true });
  if (error) {
    console.error("[getRelatorioOS]", error.message);
    return vazio(inicio, fim);
  }

  const ordens = (data ?? []) as unknown as OSRaw[];
  if (ordens.length === 0) return vazio(inicio, fim);

  // Equipe CLT de todas as O.S do período.
  const osIds = ordens.map((o) => o.id);
  const { data: equipeData, error: eqErr } = await supabase
    .from("os_equipe")
    .select("os_id, colaborador_id, colaborador:colaboradores(nome_completo, cargo)")
    .in("os_id", osIds);
  if (eqErr) console.error("[getRelatorioOS] equipe", eqErr.message);

  const equipePorOS = new Map<string, string[]>();
  const nomeColab = new Map<string, { nome: string; cargo: string | null }>();
  for (const raw of equipeData ?? []) {
    const m = raw as unknown as {
      os_id: string;
      colaborador_id: string;
      colaborador: Embed<{ nome_completo: string; cargo: string | null }>;
    };
    const arr = equipePorOS.get(m.os_id) ?? [];
    arr.push(m.colaborador_id);
    equipePorOS.set(m.os_id, arr);
    const c = one(m.colaborador);
    if (c) nomeColab.set(m.colaborador_id, { nome: c.nome_completo, cargo: c.cargo });
  }

  // --- Agregadores ---
  const obrasMap = new Map<string, RelObraRow & { _cidades: Set<string> }>();
  const colabMap = new Map<
    string,
    RelColabRow & { _obras: Set<string> }
  >();
  const frotaMap = new Map<
    string,
    RelFrotaRow & { _obras: Set<string>; _motoristas: Set<string> }
  >();

  let kmTotalGeral = 0;

  for (const o of ordens) {
    const km = kmRodado(o.km_inicial, o.km_final);
    kmTotalGeral += km;

    const obra = one(o.obra);
    const cliente = one(o.cliente);
    const encarregado = one(o.encarregado);
    const motorista = one(o.motorista);
    const veiculo = one(o.veiculo);

    // Pessoas envolvidas nesta O.S (equipe CLT ∪ encarregado ∪ motorista)
    const pessoas = new Set<string>(equipePorOS.get(o.id) ?? []);
    if (o.encarregado_id) pessoas.add(o.encarregado_id);
    if (o.motorista_id) pessoas.add(o.motorista_id);
    if (encarregado && o.encarregado_id && !nomeColab.has(o.encarregado_id)) {
      nomeColab.set(o.encarregado_id, {
        nome: encarregado.nome_completo,
        cargo: encarregado.cargo,
      });
    }
    if (motorista && o.motorista_id && !nomeColab.has(o.motorista_id)) {
      nomeColab.set(o.motorista_id, {
        nome: motorista.nome_completo,
        cargo: motorista.cargo,
      });
    }

    // ----- Obras -----
    if (o.obra_id && obra) {
      let row = obrasMap.get(o.obra_id);
      if (!row) {
        row = {
          obra_id: o.obra_id,
          numero: obra.numero,
          nome: obra.nome,
          cliente_nome: cliente?.nome_fantasia ?? cliente?.razao_social ?? null,
          os_count: 0,
          dias_equipe: 0,
          km_total: 0,
          cidades: [],
          primeira: null,
          ultima: null,
          _cidades: new Set<string>(),
        };
        obrasMap.set(o.obra_id, row);
      }
      row.os_count += 1;
      row.dias_equipe += pessoas.size;
      row.km_total += km;
      if (o.cidade) row._cidades.add(o.cidade);
      if (!row.primeira || o.data < row.primeira) row.primeira = o.data;
      if (!row.ultima || o.data > row.ultima) row.ultima = o.data;
    }

    // ----- Colaboradores -----
    for (const cid of pessoas) {
      let row = colabMap.get(cid);
      if (!row) {
        const info = nomeColab.get(cid);
        row = {
          colaborador_id: cid,
          nome: info?.nome ?? "—",
          cargo: info?.cargo ?? null,
          dias: 0,
          como_encarregado: 0,
          como_motorista: 0,
          obras: 0,
          _obras: new Set<string>(),
        };
        colabMap.set(cid, row);
      }
      row.dias += 1;
      if (cid === o.encarregado_id) row.como_encarregado += 1;
      if (cid === o.motorista_id) row.como_motorista += 1;
      if (o.obra_id) row._obras.add(o.obra_id);
    }

    // ----- Frota -----
    if (o.veiculo_id && veiculo) {
      let row = frotaMap.get(o.veiculo_id);
      if (!row) {
        row = {
          veiculo_id: o.veiculo_id,
          codigo: veiculo.codigo,
          descricao: veiculo.descricao,
          placa: veiculo.placa,
          km_total: 0,
          dias: 0,
          obras: 0,
          motoristas: 0,
          _obras: new Set<string>(),
          _motoristas: new Set<string>(),
        };
        frotaMap.set(o.veiculo_id, row);
      }
      row.km_total += km;
      row.dias += 1;
      if (o.obra_id) row._obras.add(o.obra_id);
      if (o.motorista_id) row._motoristas.add(o.motorista_id);
    }
  }

  const obras = [...obrasMap.values()]
    .map(({ _cidades, ...r }) => ({ ...r, cidades: [..._cidades].sort() }))
    .sort((a, b) => b.os_count - a.os_count);

  const colaboradores = [...colabMap.values()]
    .map(({ _obras, ...r }) => ({ ...r, obras: _obras.size }))
    .sort((a, b) => b.dias - a.dias);

  const frota = [...frotaMap.values()]
    .map(({ _obras, _motoristas, ...r }) => ({
      ...r,
      obras: _obras.size,
      motoristas: _motoristas.size,
    }))
    .sort((a, b) => b.km_total - a.km_total);

  return {
    periodo: { inicio, fim },
    resumo: {
      os_count: ordens.length,
      km_total: kmTotalGeral,
      colaboradores: colaboradores.length,
      veiculos: frota.length,
      obras: obras.length,
    },
    obras,
    colaboradores,
    frota,
  };
}
