import {
  BarChart3,
  Bell,
  CirclePlus,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', to: '/inventory', icon: Package },
  { label: 'Add / Import', to: '/add', icon: CirclePlus },
  { label: 'Alerts', to: '/alerts', icon: Bell },
  { label: 'Reports', to: '/reports', icon: BarChart3, adminOnly: true },
  { label: 'AI Insights', to: '/insights', icon: Sparkles, adminOnly: true },
  { label: 'Settings', to: '/settings', icon: Settings, adminOnly: true },
];
