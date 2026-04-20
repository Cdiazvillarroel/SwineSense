import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Badge primitive.
 *
 * Uses Barlow Condensed uppercase per brand guidelines for "labels" type.
 * Semantic variants map to the functional alert palette.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'font-condensed font-bold uppercase',
    'text-[11px] tracking-label',
    'px-2 py-0.5 rounded-sm',
  ],
  {
    variants: {
      variant: {
        neutral: 'bg-surface-elevated text-ink-secondary border border-surface-border',
        info: 'bg-status-info/15 text-status-info border border-status-info/30',
        success: 'bg-status-success/15 text-status-success border border-status-success/30',
        warning: 'bg-status-warning/15 text-status-warning border border-status-warning/30',
        critical: 'bg-status-critical/15 text-status-critical border border-status-critical/30',
        brand: 'bg-brand-gradient text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
