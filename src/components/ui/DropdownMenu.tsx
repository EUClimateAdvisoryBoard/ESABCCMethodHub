'use client';

// ---------------------------------------------------------------------------
// DropdownMenu — shadcn-style wrapper around
// @radix-ui/react-dropdown-menu. Keyboard nav, focus return, proper
// a11y — replaces the hand-rolled click-outside dropdowns that
// scatter across the workbench.
// ---------------------------------------------------------------------------

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { forwardRef } from 'react';

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export const DropdownMenuContent = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className = '', sideOffset = 4, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-[70] min-w-[220px] max-w-[360px] bg-white border border-[#E6E7E8] rounded-sm shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuLabel = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className = '', ...props }, ref) => (
  <DropdownPrimitive.Label
    ref={ref}
    className={`px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA] font-mono text-[10px] tracking-[0.12em] uppercase text-[#8A95A3] ${className}`}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuItem = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>
>(({ className = '', ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={`px-3 py-2 text-[12px] text-[#3D5265] outline-none data-[highlighted]:bg-[#F3F4F6] data-[state=checked]:bg-[#00928F]/10 cursor-pointer ${className}`}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className = '', ...props }, ref) => (
  <DropdownPrimitive.Separator
    ref={ref}
    className={`h-px bg-[#E6E7E8] ${className}`}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';
