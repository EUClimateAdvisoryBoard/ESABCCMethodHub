'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { REPORTS, ReportData, ReportFigure } from '@/data/fact-sheets-reports';
import { ESABCC } from '@/lib/esabcc-palette';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut, Pie, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend,
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WidgetType = 'short-summary' | 'long-summary' | 'key-findings' | 'recommendations' | 'figure';

interface Widget {
  id: string;
  type: WidgetType;
  figureId?: string;
  size: 'small' | 'medium' | 'large';
  orientation: 'horizontal' | 'vertical';
  /** When true (figure widgets only), render the chart-only crop and move
   *  the Source/Notes image to the dedicated Notes section at the end of
   *  the factsheet, marked with a superscript indicator. */
  deferNotes?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ESABCC_WEBSITE = 'https://climate-advisory-board.europa.eu';
const ESABCC_ADDRESS = 'Kongens Nytorv 6, 1050 Copenhagen K, Denmark';
const ESABCC_FOUNDATION = 'Established under Article 3 of the European Climate Law (Regulation (EU) 2021/1119)';
const ESABCC_INDEPENDENCE = 'The Board provides independent scientific advice on EU climate policy measures, existing and proposed Union measures, climate targets, and indicative greenhouse gas budgets.';

/* ------------------------------------------------------------------ */
/*  ESABCC official logo (SVG)                                         */
/* ------------------------------------------------------------------ */

function ESABCCLogo({ className = '', white = false }: { className?: string; white?: boolean }) {
  const fill = white ? '#fff' : '#004B7F';
  return (
    <svg viewBox="0 0 320 50" className={className} aria-label="ESABCC logo">
      <rect x="0" y="0" width="50" height="50" rx="4" fill={fill} />
      <g transform="translate(8, 8)">
        <circle cx="17" cy="17" r="14" fill="none" stroke={white ? '#004B7F' : '#fff'} strokeWidth="2" />
        <path d="M10 12 h14 M10 17 h10 M10 22 h14" stroke={white ? '#004B7F' : '#fff'} strokeWidth="2" strokeLinecap="round" />
      </g>
      <text x="60" y="22" fill={fill} fontSize="13" fontWeight="700" fontFamily="'Segoe UI',Roboto,Arial,sans-serif">
        European Scientific Advisory Board
      </text>
      <text x="60" y="40" fill={fill} fontSize="13" fontWeight="400" fontFamily="'Segoe UI',Roboto,Arial,sans-serif">
        on Climate Change
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Utility: unique ID                                                 */
/* ------------------------------------------------------------------ */

let _wid = 0;
function wid() { return `w-${Date.now()}-${++_wid}`; }

/* ------------------------------------------------------------------ */
/*  FigureChart — renders a Chart.js figure inside a widget            */
/* ------------------------------------------------------------------ */

function FigureChart({
  figure,
  height,
  deferNotes = false,
  noteMarker,
}: {
  figure: ReportFigure;
  height: number;
  deferNotes?: boolean;
  noteMarker?: string;
}) {
  // If the figure has an imageSrc (PDF screenshot) we render the image
  // directly; this preserves the original ESABCC chart exactly.
  if (figure.imageSrc) {
    const src = deferNotes && figure.imageSrcChart ? figure.imageSrcChart : figure.imageSrc;
    return (
      <div>
        <p className="text-[10px] font-semibold text-[#3D5265] mb-1 leading-tight print-text">
          {figure.title}
          {deferNotes && noteMarker && (
            <sup className="text-[#00928F] ml-0.5 font-bold print-text" aria-label="See notes at end">
              {noteMarker}
            </sup>
          )}
        </p>
        <div style={{ maxHeight: height }} className="bg-white overflow-hidden flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={figure.title}
            className="w-full h-auto object-contain"
            style={{ maxHeight: height }}
          />
        </div>
        {deferNotes ? (
          <p className="text-[8px] text-[#00928F] mt-1 italic print-text">
            <sup className="font-bold">{noteMarker}</sup> Please find notes at the end of this factsheet.
          </p>
        ) : (
          <p className="text-[8px] text-[#3D5265]/60 mt-1 italic print-text">Source: {figure.sourceNote}</p>
        )}
      </div>
    );
  }

  if (!figure.chartType || !figure.data) return null;

  const opts: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 9 } } },
      tooltip: { enabled: true },
    },
    scales: figure.chartType === 'radar' || figure.chartType === 'doughnut' || figure.chartType === 'pie'
      ? undefined
      : {
          x: { ticks: { font: { size: 8 } }, grid: { display: false } },
          y: { ticks: { font: { size: 8 } }, grid: { color: '#E6E7E820' } },
        },
  };

  const Chart = { bar: Bar, line: Line, doughnut: Doughnut, pie: Pie, radar: Radar }[figure.chartType];

  return (
    <div>
      <p className="text-[9px] font-semibold text-[#3D5265] mb-1 leading-tight print-text">{figure.title}</p>
      <div style={{ height }}>
        <Chart data={figure.data as any} options={opts} />
      </div>
      <p className="text-[7px] text-[#3D5265]/60 mt-1 italic print-text">Source: {figure.sourceNote}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  WidgetRenderer — renders any widget on the canvas                  */
/* ------------------------------------------------------------------ */

function WidgetRenderer({
  widget, report, onRemove, onResize, onOrientation, onDeferNotes, noteMarker, dragHandleProps,
}: {
  widget: Widget;
  report: ReportData;
  onRemove: () => void;
  onResize: (s: Widget['size']) => void;
  onOrientation: (o: Widget['orientation']) => void;
  onDeferNotes: (defer: boolean) => void;
  noteMarker?: string;
  dragHandleProps: { onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void };
}) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-2',
    large: 'col-span-3',
  };
  const figHeights = { small: 220, medium: 360, large: 560 };

  const figure = widget.figureId ? report.figures.find(f => f.id === widget.figureId) : null;

  return (
    <div
      className={`${sizeClasses[widget.size]} group relative bg-white border border-[#E6E7E8] rounded p-3 print:border-[#ddd] print:shadow-none transition-shadow hover:shadow-md`}
      draggable
      onDragStart={dragHandleProps.onDragStart}
      onDragOver={dragHandleProps.onDragOver}
      onDrop={dragHandleProps.onDrop}
    >
      {/* Controls — hidden in print */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10">
        {['small', 'medium', 'large'].map(s => (
          <button
            key={s}
            onClick={() => onResize(s as Widget['size'])}
            className={`w-5 h-5 rounded text-[8px] font-bold border ${
              widget.size === s ? 'bg-[#004B7F] text-white border-[#004B7F]' : 'bg-white text-[#3D5265] border-[#ccc] hover:border-[#004B7F]'
            }`}
          >
            {s[0].toUpperCase()}
          </button>
        ))}
        {widget.type === 'figure' && (
          <>
            <button
              onClick={() => onOrientation(widget.orientation === 'horizontal' ? 'vertical' : 'horizontal')}
              className="w-5 h-5 rounded text-[8px] font-bold bg-white text-[#3D5265] border border-[#ccc] hover:border-[#004B7F]"
              title="Toggle orientation"
            >
              {widget.orientation === 'horizontal' ? 'H' : 'V'}
            </button>
            <button
              onClick={() => onDeferNotes(!widget.deferNotes)}
              className={`w-5 h-5 rounded text-[9px] font-bold border ${
                widget.deferNotes
                  ? 'bg-[#00928F] text-white border-[#00928F]'
                  : 'bg-white text-[#3D5265] border-[#ccc] hover:border-[#00928F]'
              }`}
              title={widget.deferNotes ? 'Inline notes with figure' : 'Move notes to end of factsheet'}
            >
              *
            </button>
          </>
        )}
        <button
          onClick={onRemove}
          className="w-5 h-5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-200 hover:bg-red-100"
        >
          ×
        </button>
      </div>

      {/* Content */}
      {widget.type === 'short-summary' && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#00928F] mb-1 print-text">Summary</p>
          <p className="text-[10px] text-[#3D5265] leading-relaxed print-text">{report.shortSummary}</p>
        </div>
      )}
      {widget.type === 'long-summary' && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#00928F] mb-1 print-text">Detailed Summary</p>
          <p className="text-[10px] text-[#3D5265] leading-relaxed print-text">{report.longSummary}</p>
        </div>
      )}
      {widget.type === 'key-findings' && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#00928F] mb-1 print-text">Key Findings</p>
          <ul className="space-y-0.5">
            {report.keyFindings.map((f, i) => (
              <li key={i} className="text-[9px] text-[#3D5265] leading-snug flex gap-1 print-text">
                <span className="text-[#00928F] font-bold shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {widget.type === 'recommendations' && (
        <div>
          <p className="text-[8px] font-bold uppercase tracking-wider text-[#00928F] mb-1 print-text">Recommendations</p>
          <ol className="space-y-0.5 list-none">
            {report.recommendations.map((r, i) => (
              <li key={i} className="text-[9px] text-[#3D5265] leading-snug flex gap-1.5 print-text">
                <span className="text-[#00928F] font-bold shrink-0 tabular-nums">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ol>
          <p className="text-[7px] text-[#3D5265]/60 mt-1 italic print-text">
            Source: {report.shortTitle} — executive summary. {report.url}
          </p>
        </div>
      )}
      {widget.type === 'figure' && figure && (
        <FigureChart
          figure={figure}
          height={figHeights[widget.size]}
          deferNotes={!!widget.deferNotes && !!figure.imageSrcNotes}
          noteMarker={noteMarker}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  WidgetPalette — sidebar with draggable widget options              */
/* ------------------------------------------------------------------ */

function WidgetPalette({
  report,
  onAdd,
}: {
  report: ReportData;
  onAdd: (type: WidgetType, figureId?: string) => void;
}) {
  const [selectedFigureId, setSelectedFigureId] = useState<string>('');

  const textItems: { label: string; desc: string; type: WidgetType; icon: string }[] = [
    { label: 'Short Summary', desc: 'Brief overview paragraph', type: 'short-summary', icon: '📄' },
    { label: 'Detailed Summary', desc: 'Full summary text', type: 'long-summary', icon: '📋' },
    { label: 'Key Findings', desc: 'Bullet-point highlights', type: 'key-findings', icon: '🔑' },
    { label: 'Recommendations', desc: `${report.recommendations.length} exec-summary recommendations`, type: 'recommendations', icon: '✅' },
  ];

  return (
    <div className="print:hidden">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#00928F] mb-3">Widget Palette</p>
      <p className="text-[10px] text-[#3D5265]/60 mb-3">Click to add a widget to the canvas.</p>
      <div className="space-y-2">
        {textItems.map((item) => (
          <button
            key={item.type}
            onClick={() => onAdd(item.type)}
            className="w-full text-left p-2.5 rounded border border-[#E6E7E8] bg-white hover:border-[#00928F] hover:shadow-sm transition group"
          >
            <div className="flex items-start gap-2">
              <span className="text-[14px] shrink-0 mt-0.5">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#3D5265] group-hover:text-[#00928F] transition leading-tight truncate">
                  {item.label}
                </p>
                <p className="text-[9px] text-[#3D5265]/50 mt-0.5">{item.desc}</p>
              </div>
            </div>
          </button>
        ))}

        {report.figures.length > 0 && (
          <div className="p-2.5 rounded border border-[#E6E7E8] bg-white space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-[14px] shrink-0 mt-0.5">📊</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#3D5265] leading-tight">Figure</p>
                <p className="text-[9px] text-[#3D5265]/50 mt-0.5">
                  {report.figures.length} figures from the report
                </p>
              </div>
            </div>
            <select
              value={selectedFigureId}
              onChange={(e) => setSelectedFigureId(e.target.value)}
              className="w-full text-[10px] p-1.5 rounded border border-[#E6E7E8] bg-white text-[#3D5265] focus:outline-none focus:border-[#00928F]"
            >
              <option value="">Select a figure…</option>
              {report.figures.map((f) => {
                const label = f.figureNumber
                  ? `Fig ${f.figureNumber}${f.pageRef ? ` (${f.pageRef})` : ''} — ${f.title.replace(/^Figure\s+\d+\.\s*/i, '')}`
                  : f.title;
                return (
                  <option key={f.id} value={f.id}>
                    {label.length > 110 ? label.slice(0, 107) + '…' : label}
                  </option>
                );
              })}
            </select>
            <button
              disabled={!selectedFigureId}
              onClick={() => {
                if (!selectedFigureId) return;
                onAdd('figure', selectedFigureId);
              }}
              className="w-full text-[10px] font-semibold py-1.5 rounded bg-[#004B7F] text-white hover:bg-[#00928F] transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add figure to canvas
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FactSheetCanvas — the A4 preview with header, body, footer         */
/* ------------------------------------------------------------------ */

function FactSheetCanvas({
  report,
  widgets,
  onRemove,
  onResize,
  onOrientation,
  onDeferNotes,
  onReorder,
}: {
  report: ReportData;
  widgets: Widget[];
  onRemove: (id: string) => void;
  onResize: (id: string, s: Widget['size']) => void;
  onOrientation: (id: string, o: Widget['orientation']) => void;
  onDeferNotes: (id: string, defer: boolean) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}) {
  const dragFrom = useRef<number | null>(null);

  // Build the list of deferred-notes figures in the order they appear on the
  // canvas so we can number the * markers consistently and render them in
  // the same order at the end of the factsheet.
  const deferredEntries = widgets
    .map((w) => {
      if (w.type !== 'figure' || !w.deferNotes || !w.figureId) return null;
      const fig = report.figures.find((f) => f.id === w.figureId);
      if (!fig || !fig.imageSrcNotes) return null;
      return { widgetId: w.id, figure: fig };
    })
    .filter((x): x is { widgetId: string; figure: ReportFigure } => x !== null);
  const markerByWidget = new Map<string, string>();
  deferredEntries.forEach((e, i) => markerByWidget.set(e.widgetId, `*${i + 1}`));

  return (
    <div
      id="fact-sheet-canvas"
      className="bg-white shadow-lg border border-[#E6E7E8] mx-auto print:shadow-none print:border-none"
      style={{ width: 794, minHeight: 1123, maxWidth: '100%', position: 'relative' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-8 pt-6 pb-4 border-b-2" style={{ borderColor: report.accentColor }}>
        <ESABCCLogo className="h-[38px] w-auto" />
      </div>

      {/* ── Title block (always present) ────────────────────────── */}
      <div className="relative px-8 py-5 overflow-hidden" style={{ background: `linear-gradient(135deg, ${report.accentColor}12, ${report.accentColor}06)` }}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: `repeating-linear-gradient(45deg, ${report.accentColor}, ${report.accentColor} 1px, transparent 1px, transparent 12px)`,
          }}
        />
        <div className="relative z-10">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 print-text" style={{ color: report.accentColor }}>
            ESABCC Report Fact Sheet
          </p>
          <h1 className="text-[16px] font-bold text-[#3D5265] leading-tight mb-2 print-text">
            {report.title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-[#3D5265]/70">
            <span className="print-text">Published: {new Date(report.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <a
              href={report.url}
              className="text-[#004B7F] underline underline-offset-2 print-text"
              target="_blank"
              rel="noopener noreferrer"
            >
              {ESABCC_WEBSITE.replace('https://', '')}
            </a>
          </div>
        </div>
      </div>

      {/* ── Widget content area ─────────────────────────────────── */}
      <div className="px-8 py-4">
        {widgets.length === 0 ? (
          <div className="py-12 text-center text-[#3D5265]/30 text-[13px] print:hidden border-2 border-dashed border-[#E6E7E8] rounded-lg">
            Click widgets from the palette to add them here
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {widgets.map((w, idx) => (
              <WidgetRenderer
                key={w.id}
                widget={w}
                report={report}
                onRemove={() => onRemove(w.id)}
                onResize={(s) => onResize(w.id, s)}
                onOrientation={(o) => onOrientation(w.id, o)}
                onDeferNotes={(d) => onDeferNotes(w.id, d)}
                noteMarker={markerByWidget.get(w.id)}
                dragHandleProps={{
                  onDragStart: () => { dragFrom.current = idx; },
                  onDragOver: (e) => { e.preventDefault(); },
                  onDrop: () => {
                    if (dragFrom.current !== null && dragFrom.current !== idx) {
                      onReorder(dragFrom.current, idx);
                    }
                    dragFrom.current = null;
                  },
                }}
              />
            ))}
          </div>
        )}

        {deferredEntries.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#E6E7E8]">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#00928F] mb-2 print-text">
              Notes
            </p>
            <div className="space-y-2">
              {deferredEntries.map((e, i) => (
                <div key={e.widgetId} className="flex gap-2 items-start">
                  <span className="text-[8px] font-bold text-[#00928F] shrink-0 mt-1 print-text">
                    *{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-semibold text-[#3D5265] mb-0.5 print-text">
                      Figure {e.figure.figureNumber}
                      {e.figure.pageRef ? ` (${e.figure.pageRef})` : ''}
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.figure.imageSrcNotes}
                      alt={`Notes for ${e.figure.title}`}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer (always present) ─────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-8 py-3 border-t"
        style={{ borderColor: report.accentColor + '40', background: '#FAFBFC' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[7px] font-bold text-[#3D5265] mb-0.5 print-text">
              European Scientific Advisory Board on Climate Change
            </p>
            <p className="text-[6.5px] text-[#3D5265]/60 leading-snug print-text">
              {ESABCC_FOUNDATION}
            </p>
            <p className="text-[6.5px] text-[#3D5265]/60 leading-snug mt-0.5 print-text">
              {ESABCC_INDEPENDENCE}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[7px] text-[#004B7F] font-semibold print-text">{ESABCC_WEBSITE.replace('https://', '')}</p>
            <p className="text-[6.5px] text-[#3D5265]/50 print-text">{ESABCC_ADDRESS}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ReportSelector — step 1: choose a report                           */
/* ------------------------------------------------------------------ */

function ReportSelector({ onSelect }: { onSelect: (r: ReportData) => void }) {
  const sorted = [...REPORTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-10">
      <h2 className="text-[20px] font-bold text-[#3D5265] mb-2">Step 1 — Choose a report</h2>
      <p className="text-[13px] text-[#3D5265]/60 mb-8">
        Select an ESABCC report to create a fact sheet. All metadata, summaries and figures are pre-loaded.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map(r => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className="text-left p-5 rounded border border-[#E6E7E8] bg-white hover:border-[#00928F] hover:shadow-md transition group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: r.accentColor }}
              />
              <span className="text-[10px] text-[#3D5265]/50 font-medium">{r.year}</span>
            </div>
            <h3 className="text-[14px] font-bold text-[#3D5265] group-hover:text-[#00928F] transition leading-snug mb-2">
              {r.shortTitle}
            </h3>
            <p className="text-[11px] text-[#3D5265]/60 leading-relaxed line-clamp-3">
              {r.shortSummary}
            </p>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-[#3D5265]/40">
              <span>{r.figures.length} figure{r.figures.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{r.keyFindings.length} key findings</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Print styles (injected once)                                       */
/* ------------------------------------------------------------------ */

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body * { visibility: hidden; }
        #fact-sheet-canvas, #fact-sheet-canvas * { visibility: visible; }
        #fact-sheet-canvas {
          position: fixed;
          left: 0; top: 0;
          width: 210mm; min-height: 297mm;
          margin: 0; padding: 0;
          box-shadow: none !important;
          border: none !important;
        }
        .print-text { color: #3D5265 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: A4 portrait; margin: 0; }
      }
    `}</style>
  );
}

/* ================================================================== */
/*  Main page component                                                */
/* ================================================================== */

export default function FactSheetsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);

  const addWidget = useCallback((type: WidgetType, figureId?: string) => {
    setWidgets(prev => [
      ...prev,
      { id: wid(), type, figureId, size: type === 'figure' ? 'large' : 'large', orientation: 'horizontal' },
    ]);
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const resizeWidget = useCallback((id: string, size: Widget['size']) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
  }, []);

  const orientWidget = useCallback((id: string, orientation: Widget['orientation']) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, orientation } : w));
  }, []);

  const setDeferNotes = useCallback((id: string, deferNotes: boolean) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, deferNotes } : w));
  }, []);

  const reorderWidgets = useCallback((from: number, to: number) => {
    setWidgets(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleSelectReport = useCallback((r: ReportData) => {
    setSelectedReport(r);
    setWidgets([]);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedReport(null);
    setWidgets([]);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F6F7] text-[#3D5265]">
      <PrintStyles />
      <div className="print:hidden">
        <SiteHeader />
      </div>

      {/* Hero */}
      <div className="print:hidden border-b border-[#E6E7E8] bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase font-semibold text-[#6B7280] bg-[#F5F6F7] border border-[#D1D5DB] rounded-sm">
              Beta
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[28px] font-bold text-[#3D5265]">
            Fact Sheet Builder
          </h1>
          <p className="mt-2 text-[13px] text-[#3D5265]/60 max-w-2xl">
            Create professional one-page fact sheets from ESABCC reports. Choose a report, add widgets, and download as high-quality PDF.
          </p>
        </div>
      </div>

      {/* Content */}
      {!selectedReport ? (
        <ReportSelector onSelect={handleSelectReport} />
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          {/* Toolbar */}
          <div className="print:hidden flex items-center justify-between mb-5 bg-white border border-[#E6E7E8] rounded px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="text-[12px] text-[#3D5265] hover:text-[#00928F] transition flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Change report
              </button>
              <span className="text-[#E6E7E8]">|</span>
              <span className="text-[13px] font-semibold text-[#3D5265]">{selectedReport.shortTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#3D5265]/50">{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</span>
              <button
                onClick={handlePrint}
                className="px-4 py-2 text-[12px] font-semibold text-white bg-[#004B7F] hover:bg-[#003A63] rounded transition"
              >
                Download PDF
              </button>
            </div>
          </div>

          {/* Builder layout: sidebar + canvas */}
          <div className="flex gap-5">
            {/* Sidebar */}
            <div className="w-[240px] shrink-0 print:hidden">
              <div className="sticky top-[80px] max-h-[calc(100vh-100px)] overflow-y-auto bg-white border border-[#E6E7E8] rounded p-4">
                <WidgetPalette report={selectedReport} onAdd={addWidget} />
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-w-0 overflow-x-auto">
              <FactSheetCanvas
                report={selectedReport}
                widgets={widgets}
                onRemove={removeWidget}
                onResize={resizeWidget}
                onOrientation={orientWidget}
                onDeferNotes={setDeferNotes}
                onReorder={reorderWidgets}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
