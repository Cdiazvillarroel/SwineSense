'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTransition } from 'react';
import {
  Battery,
  Radio,
  ChevronRight,
  ChevronLeft,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import type {
  DeviceListResult,
  DeviceListRow,
  SignalStatus,
} from '@/lib/db/devices';

const TYPE_LABELS: Record<string, string> = {
  ear_tag: 'Ear tag',
  env_probe: 'Env probe',
  silo_sensor: 'Silo sensor',
  water_flow: 'Water flow',
  camera: 'Camera',
  gateway: 'Gateway',
};

const TYPE_COLORS: Record<string, string> = {
  ear_tag: '#E85D26',
  env_probe: '#3B82F6',
  silo_sensor: '#D4A04A',
  water_flow: '#06B6D4',
  camera: '#A855F7',
  gateway: '#6B7280',
};

function batteryTone(b: number | null): string {
  if (b === null) return 'text-ink-muted';
  if (b < 15) return 'text-status-critical font-semibold';
  if (b < 30) return 'text-orange-400';
  if (b < 50) return 'text-amber-400';
  return 'text-ink-primary';
}

function batteryBarColor(b: number | null): string {
  if (b === null) return '#9E978C';
  if (b < 15) return '#FF453A';
  if (b < 30) return '#E85D26';
  if (b < 50) return '#FFD60A';
  return '#34C759';
}

function relativeTime(iso: string | null): {
  label: string;
  isStale: boolean;
} {
  if (!iso) return { label: '—', isStale: true };
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return { label: 'just now', isStale: false };
  if (min < 60) return { label: `${min}m ago`, isStale: false };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { label: `${hr}h ago`, isStale: hr >= 2 };
  const d = Math.floor(hr / 24);
  return { label: `${d}d ago`, isStale: true };
}

export function DevicesTable({ result }: { result: DeviceListResult }) {
  if (result.rows.length === 0) {
    return (
      <div className="rounded-md border border-surface-border bg-surface-card py-10 text-center text-sm text-ink-muted">
        No devices match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-surface-border">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.02]">
            <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-muted">
              <th className="px-3 py-2.5 font-medium">Serial</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Site</th>
              <th className="px-3 py-2.5 font-medium">Pen</th>
              <th className="px-3 py-2.5 font-medium">Linked</th>
              <th className="px-3 py-2.5 font-medium">Battery</th>
              <th className="px-3 py-2.5 font-medium">Signal</th>
              <th className="px-3 py-2.5 font-medium">Last seen</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((d) => (
              <Row key={d.id} device={d} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={result.page}
        totalPages={result.total_pages}
        total={result.total}
      />
    </div>
  );
}

function Row({ device }: { device: DeviceListRow }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const open = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('device', device.id);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const last = relativeTime(device.last_seen);
  const lowBattery =
    device.battery_status !== null && device.battery_status < 30;
  const signalIssue =
    device.signal_status === 'offline' || device.signal_status === 'degraded';

  return (
    <tr
      onClick={open}
      className={
        'cursor-pointer border-b border-surface-border transition-colors last:border-0 hover:bg-white/[0.03] ' +
        (isPending ? 'opacity-60' : '')
      }
    >
      <td className="px-3 py-2.5 font-mono text-xs text-ink-primary">
        {device.serial_number}
      </td>
      <td className="px-3 py-2.5">
        <span
          className="inline-flex items-center gap-1 text-xs"
          style={{ color: TYPE_COLORS[device.device_type] ?? '#9CA3AF' }}
        >
          <Radio className="h-3 w-3" />
          {TYPE_LABELS[device.device_type] ?? device.device_type}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-secondary">
        {device.site_name}
      </td>
      <td className="px-3 py-2.5 text-xs text-ink-secondary">
        {device.pen_name ?? '—'}
      </td>
      <td className="px-3 py-2.5 text-xs">
        {device.linked_animal_tag ? (
          <span className="font-mono text-ink-primary">
            {device.linked_animal_tag}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <BatteryCell battery={device.battery_status} />
      </td>
      <td className="px-3 py-2.5">
        <SignalBadge signal={device.signal_status} />
      </td>
      <td className="px-3 py-2.5 text-xs">
        <span
          className={
            'inline-flex items-center gap-1 ' +
            (last.isStale ? 'text-amber-400' : 'text-ink-secondary')
          }
        >
          {last.isStale && <AlertTriangle className="h-3 w-3" />}
          {last.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <ChevronRight className="ml-auto h-4 w-4 text-ink-muted" />
      </td>
    </tr>
  );
}

function BatteryCell({ battery }: { battery: number | null }) {
  if (battery === null) {
    return <span className="text-xs text-ink-muted">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <Battery className={'h-3.5 w-3.5 ' + batteryTone(battery)} />
      <span className={'text-xs tabular-nums ' + batteryTone(battery)}>
        {battery}%
      </span>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-card">
        <div
          className="h-full rounded-full"
          style={{
            width: `${battery}%`,
            backgroundColor: batteryBarColor(battery),
          }}
        />
      </div>
    </div>
  );
}

function SignalBadge({ signal }: { signal: SignalStatus | null }) {
  if (signal === 'online') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-status-success/40 bg-status-success/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-status-success">
        <Wifi className="h-3 w-3" />
        Online
      </span>
    );
  }
  if (signal === 'degraded') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-400">
        <Wifi className="h-3 w-3" />
        Degraded
      </span>
    );
  }
  if (signal === 'offline') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-status-critical/40 bg-status-critical/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-status-critical">
        <WifiOff className="h-3 w-3" />
        Offline
      </span>
    );
  }
  return <span className="text-[10px] text-ink-muted">—</span>;
}

function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const buildHref = (p: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(p));
    return `${pathname}?${next.toString()}`;
  };

  const start = (page - 1) * 50 + 1;
  const end = Math.min(page * 50, total);

  return (
    <div className="flex items-center justify-between text-xs text-ink-secondary">
      <p>
        {start}–{end} of {total} devices
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex items-center gap-1 rounded-btn border border-surface-border px-2 py-1 transition-colors hover:border-brand-orange/40 hover:text-brand-orange"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-btn border border-surface-border px-2 py-1 opacity-30">
            <ChevronLeft className="h-3 w-3" />
            Prev
          </span>
        )}
        <span className="px-2 tabular-nums text-ink-primary">
          {page} / {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex items-center gap-1 rounded-btn border border-surface-border px-2 py-1 transition-colors hover:border-brand-orange/40 hover:text-brand-orange"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-btn border border-surface-border px-2 py-1 opacity-30">
            Next
            <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
}
