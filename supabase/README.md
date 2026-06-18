# Supabase · Sinaltran

Migrations da base do sistema, organizadas por etapa.

## Estrutura

```
migrations/
├── 20260609000001_init.sql         # Tipos, helpers, profiles, RLS base
├── 20260609000002_cadastros.sql    # Unidades, Clientes, Fornecedores,
│                                    # Materiais, Equipamentos, Tipos de
│                                    # mão de obra, Categorias e Centros
│                                    # de custo + seed inicial
├── 20260609000003_operacional.sql  # Orçamentos, Obras, Medições,
│                                    # Compras, Contas a pagar e
│                                    # Colaboradores
└── 20260618000001_user_modulos.sql # Coluna profiles.modulos (acesso por
                                     # módulo). RODAR NO SQL EDITOR — é DDL.
```

> **Atenção:** `20260618000001_user_modulos.sql` precisa ser aplicada manualmente
> no **SQL Editor** do Supabase antes de usar a tela de Usuários
> (`/configuracoes/usuarios`). Sem a coluna `modulos`, o cadastro de acessos
> falha. Criar/redefinir senha de usuário exige a service role key
> (`SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY`) disponível em runtime.

## Como aplicar (quando o Supabase estiver conectado)

```bash
# Instalar a CLI (uma vez)
npm i -g supabase

# Linkar o projeto
supabase link --project-ref <PROJECT_REF>

# Aplicar as migrations
supabase db push
```

> Alternativa rápida sem CLI: copiar o conteúdo de cada migration na
> ordem e rodar no **SQL Editor** do Supabase.

## Modelo de dados (visão geral)

```
                ┌──────────┐
                │ clientes │
                └────┬─────┘
                     │
                     ▼
┌──────────┐    ┌──────────────┐    ┌──────────┐
│ unidades │ ─► │ orçamentos   │ ─► │  obras   │
└────┬─────┘    └──────────────┘    └────┬─────┘
     │                                   │
     │                                   ├──► medições (contas a receber)
     │                                   ├──► compras  ──► compra_itens
     │                                   ├──► contas_pagar
     │                                   └──► colaboradores (alocação)
     ▼
materiais / equipamentos / tipos_mao_obra
```

- **clientes** — contratantes (prefeituras, DNIT, construtoras)
- **unidades** — filiais / empresas operacionais da Sinaltran
- **orçamentos → obras** — fluxo comercial: proposta aprovada vira obra
- **medições** — contas a receber por obra
- **compras + contas_pagar** — ciclo de pagamento
- **materiais** — tinta, esferas, placas, colunas, tachas, semáforos
- **equipamentos** — caminhões, máquinas de pintura, ferramentas
