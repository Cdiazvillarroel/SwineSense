'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  Building2,
  ChevronRight,
  Wind,
  Droplet,
  Thermometer,
  Activity,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ThiGauge } from '@/app/(app)/sites/thi-gauge';
import { THI_CATEGORY_COLOR, type ThiCategory } from '@/lib/weather';
import type { PenCardData, AlertSeverity } from '@/lib/db/pens';

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  Critical: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  High: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
  Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40',
};

const PEN_TYPE_COLORS: Record<string, string> = {
  farrowing: '#E85D26',
  gestation: '#C42368',
  grower: '#D4A04A',
  nursery: '#5B9B6B',
  finisher: '#A8D96C',
  boar: '#6B7280',
  isolation: '#FF453A',
};

function ammoniaTone(ppm: number | null): string {
  if (ppm === null) return 'text-ink-muted';
  if (ppm > 50) return 'text-rose-400 font-semibold';
  if (ppm > 25) return 'text-amber-400';
  return 'text-ink-primary';
}

function bodyTempTone(t: number | null): string {
  if (t === null) return 'text-ink-muted';
  if (t > 39.5) return 'text-rose-400 font-semibold';
  if (t > 39.0) return 'text-amber-400';
  return 'text-ink-primary';
}

export function PenCard({ pen }: { pen: PenCardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('pen', pen.id);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const thiCat: ThiCategory | null = pen.thi_category;
  const occupancyPct =
    pen.capacity && pen.capacity > 0
      ? Math.round(((pen.current_animals ?? 0) / pen.capacity) * 100)
      : 0;

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
      <CardContent className="p-4">
        {/* Header: name + pen_type pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-display text-base leading-tight">
                {pen.pen_name}
              </h3>
              <span
                className="rounded-full border px-1.5 py-0 text-[10px] uppercase tracking-wider"
                style={{
                  borderColor:
                    (PEN_TYPE_COLORS[pen.pen_type] ?? '#9CA3AF') + '60',
                  color: PEN_TYPE_COLORS[pen.pen_type] ?? '#9CA3AF',
                }}
              >
                {pen.pen_type}
              </span>
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{pen.site_name}</span>
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
        </div>

        {/* THI gauge */}
        <div className="mt-3 flex items-center justify-center">
          <ThiGauge value={pen.current_thi} size={140} />
        </div>

        {/* Readings strip */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-surface-border pt-3 text-center">
          <Reading
            icon={<Thermometer className="h-3 w-3" />}
            label="Temp"
            value={
              pen.current_temp !== null
                ? `${pen.current_temp.toFixed(1)}°`
                : '—'
            }
          />
          <Reading
            icon={<Droplet className="h-3 w-3" />}
            label="RH"
            value={
              pen.current_humidity !== null
                ? `${pen.current_humidity.toFixed(0)}%`
                : '—'
            }
          />
          <Reading
            icon={<Wind className="h-3 w-3" />}
            label="Vent"
            value={
              pen.current_ventilation !== null
                ? pen.current_ventilation.toFixed(0)
                : '—'
            }
          />
        </div>

        {/* NH3 + body temp + activity row */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[11px]">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              NH₃
            </p>
            <p className={'font-display tabular-nums ' + ammoniaTone(pen.current_ammonia)}>
              {pen.current_ammonia !== null
                ? pen.current_ammonia.toFixed(1)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              Avg body
            </p>
            <p className={'font-display tabular-nums ' + bodyTempTone(pen.avg_body_temp_24h)}>
              {pen.avg_body_temp_24h !== null
                ? `${pen.avg_body_temp_24h.toFixed(1)}°`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ink-muted">
              <Activity className="mr-0.5 inline h-2.5 w-2.5" />
              Activity
            </p>
            <p className="font-display tabular-nums text-ink-primary">
              {pen.avg_activity_24h !== null
                ? pen.avg_activity_24h.toFixed(0)
                : '—'}
            </p>
          </div>
        </div>

        {/* THI sparkline 24h */}
        <div className="mt-2 h-8 w-full">
          {pen.thi_series_24h.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pen.thi_series_24h}>
                <defs>
                  <linearGradient
                    id={`thi-pen-grad-${pen.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={
                        thiCat ? THI_CATEGORY_COLOR[thiCat] : '#9E978C'
                      }
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor={
                        thiCat ? THI_CATEGORY_COLOR[thiCat] : '#9E978C'
                      }
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="avg"
                  stroke={thiCat ? THI_CATEGORY_COLOR[thiCat] : '#9E978C'}
                  strokeWidth={1.5}
                  fill={`url(#thi-pen-grad-${pen.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-ink-muted">
              no data
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 grid grid-cols-3 gap-1 border-t border-surface-border pt-2 text-center text-[10px]">
          <div>
            <p className="font-display text-sm tabular-nums text-ink-primary">
              {pen.animals_active}
              {pen.capacity && (
                <span className="text-ink-muted">/{pen.capacity}</span>
              )}
            </p>
            <p className="uppercase tracking-wider text-ink-muted">
              Animals {occupancyPct ? `(${occupancyPct}%)` : ''}
            </p>
          </div>
          <div>
            <p
              className={
                'font-display text-sm tabular-nums ' +
                (pen.devices_total > 0 &&
                pen.devices_online / pen.devices_total < 0.95
                  ? 'text-amber-400'
                  : 'text-ink-primary')
              }
            >
              {pen.devices_online}/{pen.devices_total}
            </p>
            <p className="uppercase tracking-wider text-ink-muted">Online</p>
          </div>
          <div>
            {pen.open_alerts > 0 && pen.highest_severity ? (
              <>
                <span
                  className={
                    'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] ' +
                    SEVERITY_BADGE[pen.highest_severity]
                  }
                >
                  <span className="font-semibold tabular-nums">
                    {pen.open_alerts}
                  </span>
                </span>
                <p className="mt-0.5 uppercase tracking-wider text-ink-muted">
                  Alerts
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-sm tabular-nums text-ink-primary">
                  0
                </p>
                <p className="uppercase tracking-wider text-ink-muted">
                  Alerts
                </p>
              </>
            )}
          </div>
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
