'use client';

/**
 * QR-code panel for a single ballot link.
 *
 * Renders a QR code (SVG) for the supplied URL plus action buttons to copy
 * the link and download the QR as a PNG. SVG is generated on the client
 * with the `qrcode` package — there is no server roundtrip, and the panel
 * shows a placeholder until generation finishes (one tick in practice).
 *
 * Used inline in the VoteAdmin token table so meeting organisers can
 * project the QR on a screen and let participants scan it with their
 * phones instead of copy-pasting a long URL.
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export default function BallotQrCode({
  url,
  caption,
}: {
  url: string;
  /** Optional small caption shown below the code (e.g. the link label). */
  caption?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: '#3D5265', light: '#FFFFFF' },
    })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not render QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* older browsers — silently ignore */
    }
  }

  async function downloadPng() {
    // Render a high-res PNG into an off-screen canvas via the qrcode lib
    // and trigger a download. Done lazily on click so we don't pay the
    // canvas cost up front.
    try {
      const canvas = canvasRef.current ?? document.createElement('canvas');
      await QRCode.toCanvas(canvas, url, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 1024,
        color: { dark: '#3D5265', light: '#FFFFFF' },
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ballot-qr-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not download QR code.');
    }
  }

  return (
    <div className="rounded-sm border border-[#E6E7E8] bg-white p-3 sm:p-4 max-w-sm">
      <div className="flex items-center justify-center bg-white rounded-sm">
        {error ? (
          <p className="text-[12px] text-[#B33A3A] py-8">{error}</p>
        ) : svg ? (
          <div
            className="w-full max-w-[280px] aspect-square"
            // The svg comes from our own QR lib — safe to inline.
            dangerouslySetInnerHTML={{ __html: svg }}
            aria-label="QR code for ballot link"
            role="img"
          />
        ) : (
          <div className="w-full max-w-[280px] aspect-square animate-pulse bg-[#F1F5F4] rounded-sm" />
        )}
      </div>
      {caption ? (
        <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-[#3D5265]/70">
          {caption}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={copyUrl}
          className="px-3 py-1.5 text-[12px] font-semibold text-[#00928F] border border-[#00928F]/40 rounded-sm hover:bg-[#E6F5F4]/60"
        >
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
        <button
          type="button"
          onClick={downloadPng}
          className="px-3 py-1.5 text-[12px] font-semibold text-[#3D5265] border border-[#E6E7E8] rounded-sm hover:border-[#3D5265]"
        >
          Download PNG
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}
