'use client';

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';

interface Phase {
  id: string;
  number: string;
  label: string;
  kicker: string;
  blurb: string;
  accent: string;
}

const PHASES: Phase[] = [
  {
    id: 'inception',
    number: '01',
    label: 'Inception',
    kicker: 'Why we are doing this',
    blurb:
      'Frame the question, name the sponsors, agree on what success looks like before any work starts.',
    accent: '#00928F',
  },
  {
    id: 'scoping',
    number: '02',
    label: 'Scoping',
    kicker: 'What is in, what is out',
    blurb:
      'Set boundaries, sources, audiences and the timeline. Lock the scope so the team has something to push against.',
    accent: '#1E88A8',
  },
  {
    id: 'analysis-drafting',
    number: '03',
    label: 'Analysis & Drafting',
    kicker: 'Build the evidence',
    blurb:
      'Gather, model, interpret and write. The longest phase — where the substance of the output takes shape.',
    accent: '#3D5265',
  },
  {
    id: 'production-outreach',
    number: '04',
    label: 'Production & Outreach',
    kicker: 'Ship it, share it',
    blurb:
      'Layout, review, sign-off, publication, and the deliberate communications push that follows.',
    accent: '#E87722',
  },
  {
    id: 'evaluation',
    number: '05',
    label: 'Evaluation',
    kicker: 'What did we learn',
    blurb:
      'Look back honestly: impact, gaps, what to keep, what to retire. Feeds directly into the next inception.',
    accent: '#B05814',
  },
];

const STORAGE_PREFIX = 'methodhub:strategy-phase-notes:';

function PhaseNotes({ phase }: { phase: Phase }) {
  const storageKey = `${STORAGE_PREFIX}${phase.id}`;
  const [notes, setNotes] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) setNotes(stored);
    } catch {
      // localStorage may be unavailable (privacy modes); ignore
    }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, notes);
      setSavedAt(Date.now());
    } catch {
      // ignore
    }
  }, [notes, hydrated, storageKey]);

  const charCount = notes.length;
  const savedLabel = useMemo(() => {
    if (!hydrated) return '';
    if (charCount === 0) return 'Empty — start typing to add your notes';
    if (savedAt === null) return 'Saved to this browser';
    return 'Saved locally';
  }, [hydrated, charCount, savedAt]);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor={`notes-${phase.id}`}
          className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold"
          style={{ color: phase.accent }}
        >
          Your notes
        </label>
        <span className="font-mono text-[10px] tracking-[0.08em] text-[#8A95A3]">
          {hydrated ? `${charCount} chars` : ''}
        </span>
      </div>
      <textarea
        id={`notes-${phase.id}`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={`What does ${phase.label.toLowerCase()} look like for your project? Add objectives, owners, deliverables, open questions…`}
        rows={5}
        className="w-full resize-y bg-[#FBFBFA] border border-[#E6E7E8] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 rounded-sm px-3 py-2.5 text-[13px] leading-relaxed text-[#3D5265] placeholder:text-[#8A95A3]/80 transition"
        style={{ ['--accent' as string]: phase.accent }}
      />
      <p className="mt-1.5 text-[10.5px] text-[#3D5265]/55 font-mono tracking-[0.06em]">
        {savedLabel}
      </p>
    </div>
  );
}

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  return (
    <article
      id={phase.id}
      className="scroll-mt-24 relative bg-white border border-[#E6E7E8] rounded-sm p-5 sm:p-6 shadow-[0_1px_0_rgba(61,82,101,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(61,82,101,0.18)] transition"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm"
        style={{ backgroundColor: phase.accent }}
      />
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center font-mono text-[14px] sm:text-[15px] font-bold tabular-nums"
          style={{
            backgroundColor: `${phase.accent}14`,
            color: phase.accent,
            border: `1px solid ${phase.accent}40`,
          }}
        >
          {phase.number}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold"
            style={{ color: phase.accent }}
          >
            Phase {index + 1} · {phase.kicker}
          </p>
          <h2 className="mt-1 text-[20px] sm:text-[22px] font-bold text-[#3D5265] leading-snug">
            {phase.label}
          </h2>
          <p className="mt-2 text-[13.5px] sm:text-[14px] text-[#3D5265]/80 leading-relaxed max-w-3xl">
            {phase.blurb}
          </p>
        </div>
      </div>
      <PhaseNotes phase={phase} />
    </article>
  );
}

function PhaseTimeline() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-0 right-0 top-[27px] h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, #00928F 0%, #1E88A8 25%, #3D5265 50%, #E87722 75%, #B05814 100%)',
        }}
      />
      <ol className="relative grid grid-cols-5 gap-2 sm:gap-4">
        {PHASES.map((phase) => (
          <li key={phase.id} className="flex flex-col items-center text-center">
            <a
              href={`#${phase.id}`}
              className="group flex flex-col items-center"
              aria-label={`Jump to ${phase.label}`}
            >
              <span
                className="w-[54px] h-[54px] rounded-full grid place-items-center bg-white border-2 font-mono text-[13px] font-bold tabular-nums shadow-sm group-hover:shadow-md transition group-hover:-translate-y-0.5"
                style={{ borderColor: phase.accent, color: phase.accent }}
              >
                {phase.number}
              </span>
              <span className="mt-2 text-[11px] sm:text-[12.5px] font-semibold text-[#3D5265] leading-tight max-w-[110px] group-hover:text-[#00928F] transition">
                {phase.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function StrategyDocsPage() {
  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title="Strategy & Framework"
        subtitle={
          <>
            The Secretariat runs every strategic output through{' '}
            <strong className="text-[#3D5265]">five phases</strong>. Use the canvas below
            to map your own project against them — your notes save automatically to this
            browser so you can come back to them.
          </>
        }
      />

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="relative overflow-hidden rounded-sm border border-[#E6E7E8] bg-gradient-to-br from-[#FBFBFA] via-white to-[#F5FAFA] px-4 sm:px-8 py-6 sm:py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-[0.07]"
            style={{
              background:
                'radial-gradient(circle, #00928F 0%, transparent 70%)',
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-[0.06]"
            style={{
              background:
                'radial-gradient(circle, #E87722 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#00928F] font-semibold">
              The five phases
            </p>
            <h2 className="mt-1 text-[18px] sm:text-[20px] font-bold text-[#3D5265]">
              From idea to evaluation
            </h2>
            <div className="mt-6 sm:mt-8">
              <PhaseTimeline />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        <div className="space-y-5 sm:space-y-6">
          {PHASES.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} />
          ))}
        </div>

        <p className="mt-8 text-[11.5px] text-[#3D5265]/55 leading-relaxed max-w-3xl border-t border-[#E6E7E8] pt-4">
          Notes are stored only in your browser&rsquo;s local storage. Clearing site data
          will erase them; nothing is sent to a server.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
