'use client';

import { ChevronDown, LogOut, User } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Site } from '@/lib/types/domain';
import { cn } from '@/lib/utils/cn';

/**
 * Topbar.
 *
 * Contains the site switcher (left) and the user menu (right).
 * Site selection is persisted via URL search param `?site=<id>` so it
 * survives navigation and is shareable.
 *
 * Site selection uses optimistic local state so the UI updates
 * instantly while the server-side page re-renders in the background.
 */

interface TopbarProps {
  sites: Site[];
  currentSiteId: string | null;
  userEmail: string;
}

export function Topbar({ sites, currentSiteId, userEmail }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  // Optimistic local state — instant UI feedback, synced to the server
  // prop when navigation completes.
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(currentSiteId);

  useEffect(() => {
    setSelectedSiteId(currentSiteId);
  }, [currentSiteId]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) ?? null;

  function selectSite(siteId: string | null) {
    // 1. Update local UI immediately — user sees feedback with zero latency
    setSelectedSiteId(siteId);

    // 2. Build new URL preserving other params (metric, days, page, etc.)
    const params = new URLSearchParams(searchParams.toString());
    if (siteId) params.set('site', siteId);
    else params.delete('site');

    // 3. Fire navigation in the background — replace (not push) so filter
    //    changes don't pollute history. scroll: false keeps the viewport.
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-border bg-surface/80 px-6 backdrop-blur-sm">
      {/* Site switcher */}
      <div className="flex items-center gap-4">
        <SiteSwitcher
          sites={sites}
          selectedSite={selectedSite}
          onChange={selectSite}
          loading={isPending}
        />
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-btn px-3 py-1.5 text-sm text-ink-secondary hover:bg-surface-card hover:text-ink-primary"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">
            {userEmail.charAt(0).toUpperCase()}
          </span>
          <span className="hidden md:inline">{userEmail}</span>
          <ChevronDown className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-56 rounded-card border border-surface-border bg-surface-card p-1 shadow-card"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-sm text-ink-secondary hover:bg-surface-elevated hover:text-ink-primary">
              <User className="h-4 w-4" /> Profile
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-sm text-status-critical hover:bg-status-critical/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------- */
/*   SiteSwitcher (inlined for co-location — can be extracted later)       */
/* ----------------------------------------------------------------------- */

interface SiteSwitcherProps {
  sites: Site[];
  selectedSite: Site | null;
  onChange: (siteId: string | null) => void;
  loading?: boolean;
}

function SiteSwitcher({ sites, selectedSite, onChange, loading }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false);
  const selectedId = selectedSite?.id ?? null;

  re
