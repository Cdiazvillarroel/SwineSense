'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  MapPin,
  PawPrint,
  Radio,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils/cn';

/**
 * Sidebar.
 *
 * Fixed left nav, 240px wide, dark surface. Active route is highlighted
 * with the brand orange. Icons are from lucide-react per the brand guideline
 * of "simple, recognizable at small sizes".
 *
 * The "Alerts" item supports a badge (critical count) fed by the parent layout.
 */

interface SidebarProps {
  criticalAlertsCount?: number;
}

const navItems = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: Bell, badgeKey: 'critical' as const },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
  { href: '/sites', label: 'Sites', icon: MapPin },
  { href: '/animals', label: 'Animals', icon: PawPrint },
  { href: '/devices', label: 'Devices', icon: Radio },
  { href: '/ai-insights', label: 'AI Insights', icon: Sparkles },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ criticalAlertsCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-surface-border bg-surface-elevated"
      aria-label="Primary navigation"
    >
      <div className="flex h-16 items-center px-5 border-b border-surface-border">
        <Link href="/overview" aria-label="SwineSense home">
          <Logo size="sm" showTagline={false} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon, badgeKey }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            const badge = badgeKey === 'critical' ? criticalAlertsCount : 0;

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'group flex items-center gap-3 rounded-btn px-3 py-2 text-sm',
                    'transition-colors',
                    isActive
                      ? 'bg-brand-orange/10 text-brand-orange'
                      : 'text-ink-secondary hover:bg-surface-card hover:text-ink-primary',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-brand-orange' : 'text-ink-muted group-hover:text-ink-secondary',
                    )}
                  />
                  <span className="flex-1 font-medium">{label}</span>

                  {badge > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-status-critical px-1.5 text-[10px] font-bold text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-surface-border p-4">
        <p className="label-badge">Status</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-status-success animate-pulse-glow" />
          <span className="text-xs text-ink-secondary">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
