import { forwardRef, type SVGProps } from 'react';

/**
 * Pig icon — custom SVG component that follows the lucide-react API
 * (stroke-based, 24x24 viewBox, currentColor, accepts className + size via props).
 *
 * Design: front-facing pig face — round head with two triangular ears
 * peeking from the top, an oval snout in the lower center with two
 * filled nostrils. Recognisable at 16px (h-4 w-4) in the sidebar.
 *
 * Usage:
 *   <Pig className="h-4 w-4 text-brand-orange" />
 */
export const Pig = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function Pig(props, ref) {
    const {
      width = 24,
      height = 24,
      strokeWidth = 2,
      ...rest
    } = props;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {/* Head — round face */}
        <circle cx="12" cy="13" r="7.5" />
        {/* Left ear — small triangle peeking from top */}
        <path d="M 7 6.5 L 6 3 L 10.5 5" />
        {/* Right ear — mirrored */}
        <path d="M 17 6.5 L 18 3 L 13.5 5" />
        {/* Snout — horizontal oval, lower-center */}
        <ellipse cx="12" cy="14.5" rx="3" ry="2" />
        {/* Nostrils — two filled dots inside the snout */}
        <circle cx="10.8" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
        <circle cx="13.2" cy="14.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    );
  },
);

Pig.displayName = 'Pig';
