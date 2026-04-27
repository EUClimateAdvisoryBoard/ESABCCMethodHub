'use client';

// ---------------------------------------------------------------------------
// Button — shadcn-style variant-driven button. Keeps the workbench
// visually consistent without scattering className strings everywhere.
// ---------------------------------------------------------------------------

import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Variants now consume design-system tokens (--mh-status-*) so a button used
// anywhere in the app picks up theming, dark mode, and tone changes from
// globals.css automatically. Disabled state uses --mh-muted at 50% opacity.
const VARIANT: Record<ButtonVariant, string> = {
  primary:   'bg-[var(--mh-status-primary)] text-white hover:opacity-90 disabled:opacity-50',
  secondary: 'bg-[var(--mh-card)] text-[var(--mh-fg)] border border-[var(--mh-border)] hover:border-[var(--mh-status-primary)] disabled:opacity-50',
  ghost:     'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)] disabled:opacity-50',
  danger:    'bg-[var(--mh-status-danger)] text-white hover:opacity-90 disabled:opacity-50',
  link:      'text-[var(--mh-status-info)] hover:underline disabled:opacity-50',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1',
  md: 'px-3 py-1.5',
  lg: 'px-4 py-2',
};

const SIZE_FONT: Record<ButtonSize, string> = {
  sm: 'var(--mh-text-2xs)',
  md: 'var(--mh-text-xs)',
  lg: 'var(--mh-text-sm)',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', type = 'button', style, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`mh-focus mh-motion-fast inline-flex items-center justify-center gap-1.5 rounded-md font-semibold disabled:cursor-not-allowed ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      style={{ fontSize: SIZE_FONT[size], ...style }}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
