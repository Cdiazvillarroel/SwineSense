'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Button primitive.
 *
 * Variants:
 *  - primary: gradient fill (orange→magenta), white text. Brand CTA.
 *  - secondary: solid dark card with border. For secondary actions.
 *  - ghost: transparent, hover-only fill.
 *  - outline: transparent with orange border. Emphasis without gradient.
 *  - destructive: critical red fill for irreversible actions.
 *
 * All buttons share the 8px border radius from the brand guidelines.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-sans font-semibold text-sm',
    'rounded-btn select-none',
    'transition-all duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:ring-2 focus-visible:ring-brand-orange/70 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-brand-gradient text-white shadow-glow-orange hover:brightness-110 active:brightness-95',
        secondary:
          'bg-surface-card text-ink-primary border border-surface-border hover:border-brand-orange/40 hover:bg-surface-elevated',
        ghost:
          'text-ink-secondary hover:text-ink-primary hover:bg-surface-card',
        outline:
          'border border-brand-orange text-brand-orange hover:bg-brand-orange/10',
        destructive:
          'bg-status-critical text-white hover:brightness-110',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };
