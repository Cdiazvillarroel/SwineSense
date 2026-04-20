import { cn } from '@/lib/utils/cn';

/**
 * SwineSense logo.
 *
 * Per the Brand Manual:
 *  - SWINE: gradient orange (#E85D26) → magenta (#C42368)
 *  - SENSE: ink primary (#EAE6DE)
 *  - Tagline: ink secondary with 4px letter-spacing (approximated as tracking-label)
 *  - 3px orange accent line separates logo from tagline
 *
 * Sizes map to brand minimums: 'sm' = 120px digital minimum.
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { text: 'text-xl', tagline: 'text-[9px]', accent: 'w-8 h-[2px]' },
  md: { text: 'text-3xl', tagline: 'text-[11px]', accent: 'w-12 h-[3px]' },
  lg: { text: 'text-5xl', tagline: 'text-sm', accent: 'w-16 h-[3px]' },
} as const;

export function Logo({ size = 'md', showTagline = true, className }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn('inline-flex flex-col items-start', className)}>
      <span className={cn('font-display leading-none tracking-tight', s.text)}>
        <span className="gradient-text">SWINE</span>
        <span className="text-ink-primary">SENSE</span>
      </span>

      {showTagline && (
        <>
          <span
            aria-hidden
            className={cn('mt-1.5 mb-1 bg-brand-orange rounded-sm', s.accent)}
          />
          <span
            className={cn(
              'font-condensed font-bold uppercase text-ink-secondary tracking-label',
              s.tagline,
            )}
          >
            AI Farm Operations Assistant
          </span>
        </>
      )}
    </div>
  );
}
