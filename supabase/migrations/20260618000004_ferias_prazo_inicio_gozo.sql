-- ============================================================================
-- RH · Cálculo do "último dia para iniciar o gozo de férias" sem gerar dobra.
--
-- O CLT exige que as férias sejam concluídas dentro do período concessivo.
-- Logo, para iniciar sem gerar pagamento em dobro, o início deve respeitar:
--
--   prazo_inicio_gozo = concessivo_fim - (CEIL(dias_direito) - 1)
--
-- Quando o relatório da contabilidade informa explicitamente o `prazo_dobro`,
-- usamos ele (mais preciso, considera fins de semana/feriados da política
-- contábil). Quando não vem do relatório, calculamos pela fórmula acima —
-- aproximação aceitável para alertar o RH.
--
-- Mudanças:
--   1) Remove a parte "Férias" da view vw_colaborador_vencimentos (estava
--      pegando registros antigos da tabela de GOZOS — geravam datas tipo
--      2004, 2018, etc, que apareciam como vencidos na tela de Vencimentos).
--   2) Substitui a view vw_ferias_risco_dobra: agora retorna TODOS os
--      períodos aquisitivos (não só os que vieram com prazo do PDF) e
--      inclui `prazo_inicio_gozo` calculado.
-- ============================================================================

-- (1) View de vencimentos: só ASO + Treinamentos (férias migram para a view
--     dedicada de risco de dobra)
drop view if exists public.vw_colaborador_vencimentos;
create view public.vw_colaborador_vencimentos as
select
  'ASO'::text as tipo,
  a.id as registro_id,
  c.id as colaborador_id,
  c.nome_completo as colaborador,
  c.setor,
  coalesce(a.tipo_exame, 'periodico'::text) as descricao,
  a.vencimento,
  a.vencimento - current_date as dias_para_vencer
from public.colaborador_aso a
join public.colaboradores c on c.id = a.colaborador_id
where a.vencimento is not null
union all
select
  'Treinamento'::text as tipo,
  t.id as registro_id,
  c.id as colaborador_id,
  c.nome_completo as colaborador,
  c.setor,
  t.treinamento as descricao,
  t.vencimento,
  t.vencimento - current_date as dias_para_vencer
from public.colaborador_treinamentos t
join public.colaboradores c on c.id = t.colaborador_id
where t.vencimento is not null;

-- (2) View de férias em risco — inclui prazo calculado
drop view if exists public.vw_ferias_risco_dobra;
create view public.vw_ferias_risco_dobra as
select
  pa.id as registro_id,
  pa.colaborador_id,
  c.nome_completo as colaborador,
  c.matricula,
  c.cargo,
  c.setor,
  pa.aquisitivo_inicio,
  pa.aquisitivo_fim,
  pa.dias_direito,
  pa.concessivo_inicio,
  pa.concessivo_fim,
  pa.prazo_dobro,
  -- Prazo calculado: usa o do PDF quando existe, senão concessivo_fim - (CEIL(dias) - 1)
  coalesce(
    pa.prazo_dobro,
    case
      when pa.concessivo_fim is not null and pa.dias_direito > 0
      then (pa.concessivo_fim - (ceil(pa.dias_direito)::integer - 1))
      else null
    end
  ) as prazo_inicio_gozo,
  -- Indica se o prazo veio do PDF (true) ou foi calculado (false)
  (pa.prazo_dobro is not null) as prazo_oficial,
  (
    coalesce(
      pa.prazo_dobro,
      case
        when pa.concessivo_fim is not null and pa.dias_direito > 0
        then (pa.concessivo_fim - (ceil(pa.dias_direito)::integer - 1))
        else null
      end
    ) - current_date
  ) as dias_para_dobra
from public.colaborador_periodos_aquisitivos pa
join public.colaboradores c on c.id = pa.colaborador_id
where c.status <> 'desligado';
