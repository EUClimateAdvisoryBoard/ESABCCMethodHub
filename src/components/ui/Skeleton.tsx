'use client';

// ---------------------------------------------------------------------------
// Skeleton — perceived-performance primitive. Renders a shimmering placeholder
// at the same dimensions as the real content, so layout never shifts when
// data arrives. Replace spinners everywhere except <400 ms unknown-layout
// actions (Doherty threshold).
//
// Variants:
//   <Skeleton.Line />           — single text line, 14 px
//   <Skeleton.Heading />        — heading line, 22 px
//   <Skeleton.Block h={120} />  — arbitrary rectangle
//   <Skeleton.Avatar size={32}/>— circle (user avatar / icon slot)
//   <Skeleton.Card />           — card-shaped composite (title + 2 lines + meta)
//
// All variants honour prefers-reduced-motion (no shimmer; static fill).
// ---------------------------------------------------------------------------

import { CSSProperties } from 'react';

type LineProps = { width?: string | number; className?: string };
type BlockProps = { width?: string | number; height?: string | number; className?: string; rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'pill' };
type AvatarProps = { size?: number; className?: string };

function px(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
}

function Line({ width = '100%', className = '' }: LineProps) {
  const style: CSSProperties = { width: px(width), height: 'var(--mh-text-sm)' };
  return <span aria-hidden="true" className={`mh-skeleton inline-block ${className}`} style={style} />;
}

function Heading({ width = '60%', className = '' }: LineProps) {
  const style: CSSProperties = { width: px(width), height: 'var(--mh-text-xl)' };
  return <span aria-hidden="true" className={`mh-skeleton inline-block ${className}`} style={style} />;
}

const RADIUS_VAR: Record<NonNullable<BlockProps['rounded']>, string> = {
  sm: 'var(--mh-radius-sm)',
  md: 'var(--mh-radius-md)',
  lg: 'var(--mh-radius-lg)',
  xl: 'var(--mh-radius-xl)',
  pill: 'var(--mh-radius-pill)',
};

function Block({ width = '100%', height = 80, className = '', rounded = 'md' }: BlockProps) {
  const style: CSSProperties = { width: px(width), height: px(height), borderRadius: RADIUS_VAR[rounded] };
  return <div aria-hidden="true" className={`mh-skeleton ${className}`} style={style} />;
}

function Avatar({ size = 32, className = '' }: AvatarProps) {
  const style: CSSProperties = { width: size, height: size, borderRadius: '50%' };
  return <span aria-hidden="true" className={`mh-skeleton inline-block ${className}`} style={style} />;
}

// Composite — citation-card / news-card / reference-row shape. Three-line
// layout matches the real card so swap-in is invisible (no CLS).
function Card({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className={`flex flex-col gap-2 p-4 rounded-lg border border-[var(--mh-border)] bg-[var(--mh-card)] ${className}`}
    >
      <Heading width="55%" />
      <Line width="92%" />
      <Line width="78%" />
      <div className="flex gap-2 pt-1">
        <Block width={56} height={16} rounded="pill" />
        <Block width={72} height={16} rounded="pill" />
      </div>
    </div>
  );
}

// Stack — N rows of <Card />, useful for list-page first paint.
function Stack({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}

export const Skeleton = { Line, Heading, Block, Avatar, Card, Stack };
export default Skeleton;
