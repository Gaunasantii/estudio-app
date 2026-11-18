import type { SVGProps } from 'react';

interface FokusIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Isotipo minimalista de Fokus:
 * Un anillo/lente de enfoque concéntrico con marcas de precisión y núcleo focal.
 */
export function FokusIcon({ size = 24, className = '', ...props }: FokusIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {/* Anillo exterior del lente segmentado con efecto de enfoque */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="10 4.14"
      />
      {/* Anillo interior de apertura */}
      <circle
        cx="12"
        cy="12"
        r="5.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeOpacity="0.85"
      />
      {/* Punto central de enfoque */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

interface FokusLogoProps {
  collapsed?: boolean;
  iconClassName?: string;
  badgeClassName?: string;
  textClassName?: string;
  className?: string;
}

export function FokusLogo({
  collapsed = false,
  iconClassName = 'w-5 h-5',
  badgeClassName = 'w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xs',
  textClassName = 'text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100',
  className = '',
}: FokusLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <span
        className={`inline-flex items-center justify-center shrink-0 transition-all duration-300 ${badgeClassName}`}
      >
        <FokusIcon className={iconClassName} />
      </span>
      {!collapsed && <span className={`truncate ${textClassName}`}>Fokus</span>}
    </span>
  );
}

export default FokusLogo;
