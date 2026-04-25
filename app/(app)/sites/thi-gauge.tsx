'use client';

import {
  THI_CATEGORY_COLOR,
  THI_CATEGORY_LABEL,
  getThiCategory,
  type ThiCategory,
} from '@/lib/weather';

interface Props {
  value: number | null;
  size?: number;
  showLabel?: boolean;
  compact?: boolean;
}

const MIN_THI = 60;
const MAX_THI = 95;

// THI threshold breakpoints map to angles on a semicircle (0..180°)
const breakpoints: { thi: number; category: ThiCategory }[] = [
  { thi: 60, category: 'comfort' },
  { thi: 74, category: 'alert' },
  { thi: 79, category: 'danger' },
  { thi: 84, category: 'emergency' },
  { thi: 95, category: 'emergency' },
];

function thiToAngle(thi: number): number {
  const clamped = Math.max(MIN_THI, Math.min(MAX_THI, thi));
  return ((clamped - MIN_THI) / (MAX_THI - MIN_THI)) * 180;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const start = polarToCartesian(cx, cy, r, a0);
  const end = polarToCartesian(cx, cy, r, a1);
  const largeArc = a1 - a0 <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function ThiGauge({
  value,
  size = 160,
  showLabel = true,
  compact = false,
}: Props) {
  const w = size;
  const h = compact ? size * 0.6 : size * 0.7;
  const cx = w / 2;
  const cy = compact ? h * 0.95 : h * 0.92;
  const r = w * 0.42;
  const strokeW = w * 0.08;

  const category = value !== null ? getThiCategory(value) : null;
  const valueAngle = value !== null ? thiToAngle(value) : null;

  // Build colored arc segments between consecutive breakpoints
  const segments = [];
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const a0 = thiToAngle(breakpoints[i]!.thi);
    const a1 = thiToAngle(breakpoints[i + 1]!.thi);
    if (a1 - a0 < 0.5) continue;
    segments.push({
      a0,
      a1,
      color: THI_CATEGORY_COLOR[breakpoints[i + 1]!.category],
    });
  }

  const tip = valueAngle !== null
    ? polarToCartesian(cx, cy, r, valueAngle)
    : null;

  return (
    <div className="flex flex-col items-center" style={{ width: w }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Track */}
        <path
          d={arcPath(cx, cy, r, 0, 180)}
          fill="none"
          stroke="#2C323C"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {/* Colored segments */}
        {segments.map((s, i) => (
          <path
            key={i}
            d={arcPath(cx, cy, r, s.a0, s.a1)}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeOpacity={
              category &&
              THI_CATEGORY_COLOR[category] === s.color
                ? 1
                : 0.35
            }
            strokeLinecap="round"
          />
        ))}
        {/* Needle */}
        {tip && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke="#EAE6DE"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={4} fill="#EAE6DE" />
          </>
        )}
      </svg>
      {showLabel && (
        <div className="-mt-2 text-center">
          <div
            className="font-display text-2xl tabular-nums leading-tight"
            style={{
              color: category
                ? THI_CATEGORY_COLOR[category]
                : '#9E978C',
            }}
          >
            {value !== null ? value.toFixed(1) : '—'}
          </div>
          {category && (
            <div
              className="text-[10px] uppercase tracking-wider"
              style={{ color: THI_CATEGORY_COLOR[category] }}
            >
              {THI_CATEGORY_LABEL[category]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
