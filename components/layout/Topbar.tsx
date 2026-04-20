'use client';

import { ChevronDown, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Site } from '@/lib/types/domain';
import { cn } from '@/lib/utils/cn';

/**
 * Topbar.
 *
 * Contains the site switcher (left) and the user menu (right).
 * Site selection is persisted via URL search param `?site=<id>` so it
 * survives navigation and is shareable.
 */

interface TopbarProps {
  sites: Site[];
  currentSiteId: string | null;
  userEmail: string;
}

export function Topbar({ sites, currentSiteId, userEmail }: TopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentSite =
    sites.find((s) => s.id === currentSiteId) ?? null;

  function selectSite(siteId: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (siteId) params.set('site', siteId);
    else params.delete('site');

    startTransition(() => {
      router.push(`${window.location.pathname}?${params.toString()}`);
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
          currentSite={currentSite}
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
  currentSite: Site | null;
  onChange: (siteId: string | null) => void;
  loading?: boolean;
}

function SiteSwitcher({ sites, currentSite, onChange, loading }: SiteSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-btn border border-surface-border bg-surface-card px-3 py-1.5 text-sm',
          'hover:border-brand-orange/40',
          loading && 'opacity-60',
        )}
      >
        <span className="label-badge">Site</span>
        <span className="font-semibold text-ink-primary">
          {currentSite?.name ?? 'All sites'}
        </span>
        <ChevronDown className="h-4 w-4 text-ink-muted" />
      </button>

      {open && (
        <div
          className="absolute left-0 mt-2 w-72 rounded-card border border-surface-border bg-surface-card p-1 shadow-card"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              'flex w-full items-center gap-2 rounded-btn px-3 py-2 text-sm hover:bg-surface-elevated',
              !currentSite && 'bg-surface-elevated',
            )}
          >
            <span className="h-2 w-2 rounded-full bg-brand-orange" />
            All sites
          </button>
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => {
                onChange(site.id);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-btn px-3 py-2 text-sm hover:bg-surface-elevated',
                currentSite?.id === site.id && 'bg-surface-elevated',
              )}
            >
              <span className="truncate text-ink-primary">{site.name}</span>
              <span className="text-xs text-ink-muted">{site.totalAnimals} animals</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
