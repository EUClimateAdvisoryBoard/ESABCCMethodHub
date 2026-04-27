'use client';

// ---------------------------------------------------------------------------
// Tooltip — shadcn-style wrapper around @radix-ui/react-tooltip. Used to
// replace the native `title=` attribute on buttons where explanation
// adds real value. Faster open / close than the 1-second browser title.
// ---------------------------------------------------------------------------

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className = '', sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-[80] rounded-sm bg-[#3D5265] text-white px-2 py-1 text-[11px] leading-tight shadow-md max-w-[280px] data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 ${className}`}
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent';

/** Convenience wrapper: <Tooltip content="…"><button /></Tooltip> */
export function Tooltip({
  content,
  children,
  side,
  open,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
}) {
  return (
    <TooltipRoot open={open} delayDuration={120}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </TooltipRoot>
  );
}
