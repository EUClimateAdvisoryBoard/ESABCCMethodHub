'use client';

// ---------------------------------------------------------------------------
// Dialog — shadcn-style wrapper around @radix-ui/react-dialog.
// Provides focus trap, escape-to-close, scroll lock and proper ARIA
// without us having to re-build those primitives by hand. Colours /
// spacing use the same design tokens as the rest of the module.
// ---------------------------------------------------------------------------

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef } from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 z-[70] bg-[#3D5265]/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

/**
 * Default dialog rendering — vertically centred on desktop, full-screen
 * sheet on phones (<768 px). Add `mh-sheet` to the existing Tailwind class
 * stack to flip into mobile-sheet behaviour. Pages that want a stricter
 * desktop modal on every viewport can pass `forceCentered`.
 */
export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { forceCentered?: boolean }
>(({ className = '', children, forceCentered = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={`fixed left-1/2 top-1/2 z-[71] w-[min(560px,calc(100%-2rem))] max-h-[min(90dvh,720px)] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-lg shadow-xl overflow-hidden outline-none flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 ${forceCentered ? '' : 'mh-sheet'} ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mh-sheet-header px-4 py-3 border-b border-[#E6E7E8] dark:border-[var(--mh-border)] bg-[#FBFBFA] dark:bg-[var(--mh-card)] ${className}`} {...props} />
);

export const DialogFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mh-sheet-footer px-4 py-3 border-t border-[#E6E7E8] dark:border-[var(--mh-border)] bg-[#FBFBFA] dark:bg-[var(--mh-card)] flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 ${className}`} {...props} />
);

export const DialogBody = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`mh-sheet-body flex-1 overflow-y-auto ${className}`} {...props} />
);

export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={`text-[15px] sm:text-[14px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)] ${className}`}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={`mt-1 font-mono text-[11px] sm:text-[10.5px] text-[#8A95A3] dark:text-[var(--mh-muted)] truncate ${className}`}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';
