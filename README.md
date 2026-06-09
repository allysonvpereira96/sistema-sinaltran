# Sistema Sinaltran

Plataforma interna de gestão da Sinaltran — operação, fiscalização e
administração em um único sistema.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix + Lucide)
- **Supabase** (Auth + Postgres) via `@supabase/ssr`
- Deploy: **Vercel**

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── login/                # Autenticação
│   └── dashboard/            # Painel pós-login (placeholder)
├── components/ui/            # Componentes shadcn/ui
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Cliente para o navegador
│   │   ├── server.ts         # Cliente para Server Components / Actions
│   │   └── proxy.ts          # Refresh de sessão por request
│   └── utils.ts
└── proxy.ts                  # Protege rotas privadas (Next 16 Proxy)
```

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie o arquivo de variáveis e preencha com as chaves do Supabase:
   ```bash
   cp .env.local.example .env.local
   ```
   Variáveis necessárias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Suba o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse [http://localhost:3000](http://localhost:3000).

> Enquanto o Supabase não estiver configurado, o proxy deixa o acesso
> livre e o formulário de login mostra um aviso. Assim que as variáveis
> forem preenchidas, a autenticação por e-mail/senha é ativada
> automaticamente.

## Próximos passos

- [ ] Conectar Supabase (banco + autenticação)
- [ ] Modelar tabelas iniciais (usuários, perfis, módulos)
- [ ] Definir módulos do sistema (Operações, Administrativo, Relatórios)
- [ ] Configurar deploy contínuo na Vercel
