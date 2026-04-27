'use client';
import { useEffect, useState } from 'react';

/**
 * Breakpoints kept in sync with Tailwind defaults so CSS classes and JS
 * agree. `mobile` is everything below 768px, `tablet` is 768–1023px, and
 * `desktop` is >=1024px. A touch device is detected via pointer media
 * query OR `ontouchstart`.
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export type DeviceKind = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  kind: DeviceKind;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  isPortrait: boolean;
  width: number;
  height: number;
  /** Browser user-agent string, empty during SSR. */
  ua: string;
  /** True when UA string looks like a mobile / tablet device. */
  isMobileUA: boolean;
  /** True until the first client-side effect runs. Avoids SSR/client mismatch. */
  hydrated: boolean;
}

const MOBILE_UA_RE = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

function readDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      kind: 'desktop',
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      isPortrait: false,
      width: 1280,
      height: 800,
      ua: '',
      isMobileUA: false,
      hydrated: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ua = navigator.userAgent || '';
  const isMobileUA = MOBILE_UA_RE.test(ua);
  const isTouch =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints || 0) > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches;

  // Use width as primary signal but respect mobile UA even on wide viewports
  // (e.g. landscape phones). Tablet kind is used for 768–1023 on any device.
  let kind: DeviceKind;
  if (w < BREAKPOINTS.mobile) kind = 'mobile';
  else if (w < BREAKPOINTS.tablet) kind = 'tablet';
  else kind = 'desktop';

  // If UA clearly says mobile (phone) but width is wide (e.g. rotated), still treat
  // small viewports as mobile. Conversely don't downgrade desktops.
  if (isMobileUA && w < BREAKPOINTS.mobile) kind = 'mobile';

  return {
    kind,
    isMobile: kind === 'mobile',
    isTablet: kind === 'tablet',
    isDesktop: kind === 'desktop',
    isTouch: Boolean(isTouch),
    isPortrait: h >= w,
    width: w,
    height: h,
    ua,
    isMobileUA,
    hydrated: true,
  };
}

/**
 * SSR-safe device detection hook. Returns sensible defaults during SSR and
 * updates on client mount + every resize / orientation change.
 */
export function useDevice(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>(() => readDevice());

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setDevice(readDevice()));
    };
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return device;
}

/** Shortcut hook for the common case. */
export function useIsMobile(): boolean {
  return useDevice().isMobile;
}
