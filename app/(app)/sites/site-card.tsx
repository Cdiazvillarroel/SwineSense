'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Building2, ChevronRight, MapPin, Wind, Droplet, Thermometer } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ThiGauge } from './thi-gauge';
import {
  THI_CATEGORY_COLOR,
  type ThiCategory,
} from '@/lib/weather';
import type { SiteCardData, AlertSeverity } from '@/lib/db/sites';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

function ammoniaTone(ppm: number | null): {
  className: string;
  status: 'ok' | 'warning' | 'danger';
} {
  if (ppm === null) return { className: 'text-ink-muted', status: 'ok' };
  if (ppm > 50)
    return { className: 'text-rose-400 font-semibold', status: 'danger' };
  if (ppm > 25) return { className: 'text-amber-400', status: 'warning' };
  return { className: 'text-ink-primary', status: 'ok' };
}

export function SiteCard({ site }: { site: SiteCardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('site', site.id);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const ammonia = ammoniaTone(site.current_ammonia);
  const thiCat: ThiCategory | null = site.thi_category;

  return (
    <Card
      onClick={open}
      className={
        'cursor-pointer transition-all duration-150 hover:border-brand-orange/40 hover:shadow-lg ' +
        (isPending ? 'opacity-60' : '') +
        (thiCat === 'emergency'
          ? ' ring-1 ring-rose-500/30'
          : thiCat === 'danger'
            ? ' ring-1 ring-orange-500/20'
            : '')
      }
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-brand-orange" />
              <h3 className="truncate font-display text-lg leading-tight">
                {site.site_name}
              </h3>
            </div>
            {site.location_address && (
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{site.location_address}</span>
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
        </div>

        {/* THI gauge centerpiece */}
        <div className="mt-4 flex items-center justify-center">
          <ThiGauge value={site.current_thi} size={170} />
        </div>

        {/* Readings strip */}
        <div className="mt-2 grid grid-cols-3 gap-2 border-t border-surface-border pt-3 text-center">
          <Reading
            icon={<Thermometer className="h-3 w-3" />}
            label="Temp"
            value={
              site.current_temp !== null
                ? `${site.current_temp.toFixed(1)}°`
                : '—'
            }
          />
          <Reading
            icon={<Droplet className="h-3 w-3" />}
            label="Humidity"
            value={
              site.current_humidity !== null
                ? `${site.current_humidity.toFixed(0)}%`
                : '—'
            }
          />
          <Reading
            icon={<Wind className="h-3 w-3" />}
            label="Vent"
            value={
              site.current_ventilation !== null
                ? site.current_ventilation.toFixed(0)
                : '—'
            }
          />
        </div>

        {/* Ammonia row + 24h sparkline */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              NH₃ · Ammonia
            </p>
            <p
              className={
                'font-display text-base tabular-nums ' + ammonia.className
              }
            >
              {site.current_ammonia !== null
                ? `${site.current_ammonia.toFixed(1)}`
                : '—'}
              <span className="ml-1 text-[10px] font-normal text-ink-secondary">
                ppm
              </span>
            </p>
          </div>
          <div className="h-10 w-32">
            {site.thi_series_24h.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={site.thi_series_24h}>
                  <defs>
                    <linearGradient
                      id={`thi-grad-${site.id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={
                          thiCat
                            ? THI_CATEGORY_COLOR[thiCat]
                            : '#9E978C'
                        }
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="100%"
                        stopColor={
                          thiCat
                            ? THI_CATEGORY_COLOR[thiCat]
                            : '#9E978C'
                        }
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="avg"
                    stroke={
                      thiCat ? THI_CATEGORY_COLOR[thiCat] : '#9E978C'
                    }
                    strokeWidth={1.5}
                    fill={`url(#thi-grad-${site.id})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-ink-muted">
                no data
              </div>
            )}
          </div>
        </div>

        {/* Footer counts */}
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-surface-border pt-3 text-center">
          <FooterStat label="Animals" value={site.animals_count} />
          <FooterStat label="Pens" value={site.pens_count} />
          <FooterStat
            label="Online"
            value={`${site.devices_online}/${site.devices_total}`}
            tone={
              site.devices_total > 0 &&
              site.devices_online / site.devices_total >= 0.95
                ? 'ok'
                : 'warn'
            }
          />
          {site.open_alerts > 0 && site.highest_severity ? (
            <div>
              <span
                className={
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] ' +
                  SEVERITY_BADGE[site.highest_severity]
                }
              >
                <span className="font-semibold tabular-nums">
                  {site.open_alerts}
                </span>
              </span>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
                Alerts
              </p>
            </div>
          ) : (
            <FooterStat label="Alerts" value={0} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Reading({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-ink-muted">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-display text-sm tabular-nums text-ink-primary">
        {value}
      </p>
    </div>
  );
}

function FooterStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <div>
      <p
        className={
          'font-display text-base tabular-nums ' +
          (tone === 'warn' ? 'text-amber-400' : 'text-ink-primary')
        }
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
        {label}
      </p>
    </div>
  );
}
