import {
  CalendarDays,
  ChartNoAxesColumn,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only admins see this entry. */
  adminOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendario", icon: CalendarDays },
      { href: "/timeline", label: "Timeline", icon: GitBranch },
    ],
  },
  {
    label: "Organización",
    items: [
      { href: "/participants", label: "Participantes", icon: Users },
      { href: "/teams", label: "Equipos", icon: UsersRound },
      { href: "/checkpoints", label: "Checkpoints", icon: ListChecks },
    ],
  },
  {
    label: "Evento",
    items: [
      { href: "/stats", label: "Estadísticas", icon: ChartNoAxesColumn },
      { href: "/settings", label: "Ajustes", icon: Settings },
    ],
  },
];
