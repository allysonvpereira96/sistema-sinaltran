import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  HardHat,
  CalendarRange,
  ClipboardList,
  Wallet,
  Receipt,
  ShoppingCart,
  PackageSearch,
  Factory,
  Users,
  BarChart3,
  Settings,
  Briefcase,
  Truck,
  Boxes,
  Wrench,
  CalendarClock,
  GraduationCap,
  ListChecks,
  UserCog,
  NotebookPen,
} from "lucide-react";
import type { ModuloKey } from "@/lib/types/usuario";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  /** Visível apenas para usuários master (role admin). */
  adminOnly?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /**
   * Módulo a que a seção pertence. Sem `key` = sempre visível (ex.: Operação /
   * Dashboard). Usado para filtrar a sidebar e bloquear rotas no proxy.
   */
  key?: ModuloKey;
};

export const navigation: NavSection[] = [
  {
    title: "Operação",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Comercial",
    key: "comercial",
    items: [
      { label: "Orçamentos", href: "/comercial/orcamentos", icon: FileText },
    ],
  },
  {
    title: "Obras",
    key: "obras",
    items: [
      { label: "Obras", href: "/obras", icon: HardHat },
      { label: "Ordens de Serviço", href: "/obras/ordens-servico", icon: FileText },
      { label: "Planejamento", href: "/obras/planejamento", icon: CalendarRange },
      { label: "Relatórios de obra", href: "/obras/relatorios", icon: ClipboardList },
    ],
  },
  {
    title: "Financeiro",
    key: "financeiro",
    items: [
      { label: "Contas a receber", href: "/financeiro/receber", icon: Wallet },
      { label: "Contas a pagar", href: "/financeiro/pagar", icon: Receipt },
    ],
  },
  {
    title: "Produção",
    key: "producao",
    items: [
      { label: "Compras", href: "/producao/compras", icon: ShoppingCart },
      { label: "Almoxarifado", href: "/producao/almoxarifado", icon: PackageSearch },
      { label: "Produção", href: "/producao", icon: Factory },
    ],
  },
  {
    title: "Departamento Pessoal",
    key: "pessoal",
    items: [
      { label: "Colaboradores", href: "/pessoal/colaboradores", icon: Users },
      { label: "Caderno Virtual", href: "/pessoal/caderno-virtual", icon: NotebookPen },
      { label: "Vencimentos", href: "/pessoal/vencimentos", icon: CalendarClock },
      { label: "Catálogo de treinamentos", href: "/pessoal/treinamentos-catalogo", icon: GraduationCap },
      { label: "Relatórios", href: "/pessoal/relatorios", icon: BarChart3 },
    ],
  },
  {
    title: "Cadastros",
    key: "cadastros",
    items: [
      { label: "Clientes", href: "/cadastros/clientes", icon: Briefcase },
      { label: "Fornecedores", href: "/cadastros/fornecedores", icon: Truck },
      { label: "Serviços", href: "/cadastros/servicos", icon: ListChecks },
      { label: "Materiais", href: "/cadastros/materiais", icon: Boxes },
      { label: "Equipamentos", href: "/cadastros/equipamentos", icon: Wrench },
    ],
  },
  {
    title: "Gestão",
    key: "gestao",
    items: [
      { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      {
        label: "Usuários",
        href: "/configuracoes/usuarios",
        icon: UserCog,
        adminOnly: true,
      },
    ],
  },
];

/**
 * Lista de módulos selecionáveis no cadastro de usuário (todas as seções com
 * `key`, na ordem da navegação). "Operação" fica de fora — é sempre liberada.
 */
export const MODULOS: { key: ModuloKey; label: string }[] = navigation
  .filter((s): s is NavSection & { key: ModuloKey } => Boolean(s.key))
  .map((s) => ({ key: s.key, label: s.title }));

/**
 * Descobre a que módulo uma rota pertence (match por prefixo de href → key da
 * seção). Retorna null para rotas sem módulo (ex.: /dashboard). Pega o match
 * mais específico (href mais longo) para evitar ambiguidade.
 */
export function moduloDaRota(pathname: string): ModuloKey | null {
  let melhor: { key: ModuloKey; len: number } | null = null;
  for (const section of navigation) {
    if (!section.key) continue;
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        if (!melhor || item.href.length > melhor.len) {
          melhor = { key: section.key, len: item.href.length };
        }
      }
    }
  }
  return melhor?.key ?? null;
}
