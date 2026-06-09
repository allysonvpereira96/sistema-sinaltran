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
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
};

export type NavSection = {
  title: string;
  items: NavItem[];
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
    items: [
      { label: "Orçamentos", href: "/comercial/orcamentos", icon: FileText },
    ],
  },
  {
    title: "Obras",
    items: [
      { label: "Obras", href: "/obras", icon: HardHat },
      { label: "Planejamento", href: "/obras/planejamento", icon: CalendarRange },
      { label: "Relatórios de obra", href: "/obras/relatorios", icon: ClipboardList },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Contas a receber", href: "/financeiro/receber", icon: Wallet },
      { label: "Contas a pagar", href: "/financeiro/pagar", icon: Receipt },
    ],
  },
  {
    title: "Produção",
    items: [
      { label: "Compras", href: "/producao/compras", icon: ShoppingCart },
      { label: "Almoxarifado", href: "/producao/almoxarifado", icon: PackageSearch },
      { label: "Produção", href: "/producao", icon: Factory },
    ],
  },
  {
    title: "Departamento Pessoal",
    items: [
      { label: "Colaboradores", href: "/pessoal/colaboradores", icon: Users },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { label: "Clientes", href: "/cadastros/clientes", icon: Briefcase },
      { label: "Fornecedores", href: "/cadastros/fornecedores", icon: Truck },
      { label: "Materiais", href: "/cadastros/materiais", icon: Boxes },
      { label: "Equipamentos", href: "/cadastros/equipamentos", icon: Wrench },
    ],
  },
  {
    title: "Gestão",
    items: [
      { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];
