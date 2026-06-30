// Tipos e cálculo do vale-refeição (semanal, consolidado no mês).
// Módulo puro (sem "use server") para poder ser importado no client e no server.

export type VrConfig = {
  num_semanas: number;
  valor_dia_padrao_geral: number; // sugestão p/ quem ainda não tem padrão
  valor_dia_viagem: number;
  extra_almoco_janta: number;
  extra_lanche: number;
  extra_viagem: number;
};

export type VrSemana = {
  em_viagem: boolean;
  valor_dia: number;
  dias: number;
  faltas: number;
  extra_almoco_janta: number; // quantidade
  extra_lanche: number;
  extra_viagem: number;
};

export const VR_CONFIG_PADRAO: VrConfig = {
  num_semanas: 5,
  valor_dia_padrao_geral: 25,
  valor_dia_viagem: 35,
  extra_almoco_janta: 35,
  extra_lanche: 12,
  extra_viagem: 47,
};

export function semanaVazia(valorDia: number): VrSemana {
  return { em_viagem: false, valor_dia: valorDia, dias: 0, faltas: 0, extra_almoco_janta: 0, extra_lanche: 0, extra_viagem: 0 };
}

/** Saldo de uma semana: (dias − faltas) × valor/dia + extras (qtd × valor configurado). */
export function saldoSemana(s: VrSemana, cfg: VrConfig): number {
  const base = Math.max(0, s.dias - s.faltas) * s.valor_dia;
  const extras =
    s.extra_almoco_janta * cfg.extra_almoco_janta + s.extra_lanche * cfg.extra_lanche + s.extra_viagem * cfg.extra_viagem;
  return base + extras;
}

/** Total do mês = soma dos saldos semanais (nunca negativo). */
export function totalVrLinha(semanas: VrSemana[], cfg: VrConfig): number {
  return Math.max(0, semanas.reduce((s, sem) => s + saldoSemana(sem, cfg), 0));
}
