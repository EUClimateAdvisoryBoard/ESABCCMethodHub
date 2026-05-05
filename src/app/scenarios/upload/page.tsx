'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadResponse {
  success?: boolean;
  error?: string;
  details?: {
    missingColumns?: string[];
    noYearColumns?: string;
  };
  submission?: {
    id: string;
    apiKey: string;
    fileName: string;
    fileSize: number;
    callSlug: string;
    storagePath: string | null;
    publicUrl: string | null;
    storedInDatabase: boolean;
    message: string;
  };
}

function UploadPageInner() {
  const searchParams = useSearchParams();
  const callSlug = searchParams.get('call') || '';

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [modelName, setModelName] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [response, setResponse] = useState<UploadResponse | null>(null);
  const [shareUrl, setShareUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const base = `${window.location.origin}/scenarios/upload`;
    setShareUrl(callSlug ? `${base}?call=${encodeURIComponent(callSlug)}` : base);
  }, [callSlug]);

  const canSubmit =
    !!file && email.trim().length > 0 && consent && status !== 'uploading';

  const handleSubmit = useCallback(async () => {
    if (!file) return;
    setStatus('uploading');
    setResponse(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('callSlug', callSlug);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('institution', institution);
      formData.append('model', modelName);
      formData.append('scenario', scenarioName);
      formData.append('description', description);

      const res = await fetch('/api/scenario-upload', {
        method: 'POST',
        body: formData,
      });
      const data: UploadResponse = await res.json();
      setResponse(data);
      if (res.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setResponse({ error: 'Network error while uploading. Please try again.' });
      setStatus('error');
    }
  }, [file, callSlug, name, email, institution, modelName, scenarioName, description]);

  const copyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
  };

  const resetForm = () => {
    setFile(null);
    setStatus('idle');
    setResponse(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004B7F] to-[#6667AB]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
          <Link
            href="/scenarios"
            className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition mb-3">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            Back to Data &amp; Scenario Explorer
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Submit New Scenario Data
          </h1>
          <p className="text-sm text-white/80 max-w-2xl">
            Contribute mitigation, adaptation, or energy system scenario data to the
            ESABCC Secretariat. Upload a CSV, JSON, or Excel file in the IIASA
            scenario format — the Secretariat will review, screen, and analyse it.
          </p>
          {callSlug && (
            <p className="mt-3 inline-flex items-center gap-2 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              Open call: <span className="font-mono">{callSlug}</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Shareable URL */}
        <section className="bg-white rounded-lg border border-grey-200 p-4 sm:p-5">
          <h2 className="text-xs font-bold text-tertiary-dark uppercase tracking-wider mb-2">
            Shareable upload link
          </h2>
          <p className="text-xs text-tertiary mb-3">
            Send this URL to modellers and research groups. Anyone with the link can
            submit scenario data directly into the ESABCC database — no account
            required. Every submission is queued for Secretariat review.
          </p>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 block bg-grey-50 border border-grey-200 rounded px-3 py-2 text-xs text-primary break-all">
              {shareUrl || '…'}
            </code>
            <button
              onClick={copyShareUrl}
              className="px-3 py-2 rounded text-xs font-medium bg-primary text-white hover:bg-primary-dark transition">
              Copy link
            </button>
          </div>
        </section>

        {status === 'success' && response?.submission ? (
          <section className="bg-white rounded-lg border border-green-200 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <svg
                className="text-[#007B6C] flex-shrink-0"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <div>
                <h2 className="text-base font-bold text-tertiary-dark">
                  Submission received
                </h2>
                <p className="text-sm text-tertiary mt-1">{response.submission.message}</p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-grey-50 rounded p-3">
              <div>
                <dt className="font-bold text-tertiary-dark">Submission ID</dt>
                <dd className="font-mono text-tertiary break-all">
                  {response.submission.id}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-tertiary-dark">Status API key</dt>
                <dd className="font-mono text-tertiary break-all">
                  {response.submission.apiKey}
                </dd>
              </div>
              <div>
                <dt className="font-bold text-tertiary-dark">File</dt>
                <dd className="text-tertiary">
                  {response.submission.fileName} (
                  {(response.submission.fileSize / 1024).toFixed(1)} KB)
                </dd>
              </div>
              <div>
                <dt className="font-bold text-tertiary-dark">Stored in database</dt>
                <dd className="text-tertiary">
                  {response.submission.storedInDatabase ? 'Yes' : 'Metadata only (storage pending)'}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:bg-primary-dark transition">
                Submit another file
              </button>
              <Link
                href="/scenarios"
                className="px-4 py-2 rounded text-sm font-medium border border-grey-300 text-tertiary-dark hover:bg-grey-100 transition">
                Back to Data &amp; Scenario Explorer
              </Link>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">
              Upload scenario dataset
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Contact email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.eu"
                  required
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. PIK, IIASA, JRC"
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Model name
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. REMIND 3.2"
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Scenario name
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. NetZero-2050-HighElectrification"
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-tertiary-dark block mb-1">
                  Description / notes for reviewers
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this scenario represent? Key assumptions, scope, links to documentation."
                  className="w-full border border-grey-200 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)] rounded px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* File drop zone — taps open the picker on mobile (drag-drop is
                desktop-only). Drop handlers are no-ops on touch devices. */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload data file"
              className="border-2 border-dashed border-grey-300 dark:border-[var(--mh-border)] rounded-lg p-4 sm:p-8 text-center hover:border-primary/60 active:bg-grey-50 dark:active:bg-[var(--mh-bg)] transition cursor-pointer min-h-[140px] flex flex-col items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFile(e.target.files[0]);
                }}
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-tertiary-dark">{file.name}</p>
                  <p className="text-xs text-tertiary mt-1">
                    {(file.size / 1024).toFixed(1)} KB —{' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-accent-red hover:underline">
                      remove
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <svg
                    className="mx-auto mb-2 text-grey-400"
                    width="36"
                    height="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-tertiary">
                    Drop CSV, JSON, or Excel files here
                  </p>
                  <p className="text-xs text-grey-400 mt-1">
                    or click to browse (max 50 MB)
                  </p>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-tertiary-dark cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-grey-300 text-primary focus:ring-primary"
              />
              <span>
                I confirm I have the rights to share this data for non-commercial
                scientific advisory use by the ESABCC Secretariat, and that it may be
                screened, analysed, and referenced in the Advisory Board&apos;s
                assessments. All attributions will be maintained.
              </span>
            </label>

            {status === 'error' && response?.error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded p-3 text-xs text-accent-red">
                <strong>Upload failed:</strong> {response.error}
                {response.details?.missingColumns && (
                  <p className="mt-1">
                    Missing columns: {response.details.missingColumns.join(', ')}
                  </p>
                )}
                {response.details?.noYearColumns && (
                  <p className="mt-1">{response.details.noYearColumns}</p>
                )}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end gap-2">
              <Link
                href="/scenarios"
                className="text-center px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded text-sm font-medium text-tertiary dark:text-[var(--mh-muted)] hover:text-tertiary-dark active:bg-grey-100 dark:active:bg-[var(--mh-border)] transition flex items-center justify-center">
                Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded text-sm font-medium bg-primary text-white hover:bg-primary-dark active:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition">
                {status === 'uploading' ? 'Uploading…' : 'Submit to database'}
              </button>
            </div>
          </section>
        )}

        {/* Format guide */}
        <details className="bg-white rounded-lg border border-grey-200">
          <summary className="px-5 py-3 cursor-pointer text-sm font-bold text-tertiary-dark hover:bg-grey-50 transition">
            Submission format guide (IIASA compatible)
          </summary>
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-tertiary">
              Data must follow the IIASA scenario data format with these required
              columns and one column per reporting year:
            </p>
            <div className="bg-grey-50 rounded p-3 overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="text-left text-tertiary-dark border-b border-grey-200">
                    <th className="pb-1 pr-3">Model</th>
                    <th className="pb-1 pr-3">Scenario</th>
                    <th className="pb-1 pr-3">Variable</th>
                    <th className="pb-1 pr-3">Region</th>
                    <th className="pb-1 pr-3">Unit</th>
                    <th className="pb-1 pr-3">2020</th>
                    <th className="pb-1 pr-3">2025</th>
                    <th className="pb-1">…</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-tertiary">
                    <td className="pt-1 pr-3">REMIND 3.2</td>
                    <td className="pt-1 pr-3">NetZero-2050</td>
                    <td className="pt-1 pr-3">Emissions|CO2</td>
                    <td className="pt-1 pr-3">EU27</td>
                    <td className="pt-1 pr-3">Mt CO2/yr</td>
                    <td className="pt-1 pr-3">2800</td>
                    <td className="pt-1 pr-3">2400</td>
                    <td className="pt-1">…</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-tertiary">
              Variable names use the IIASA pipe (&apos;|&apos;) convention. Time steps should
              be in 5-year intervals (2020, 2025, …, 2100). For questions, contact{' '}
              <a
                href="mailto:secretariat@esabcc.europa.eu"
                className="text-primary hover:underline">
                secretariat@esabcc.europa.eu
              </a>
              .
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

export default function ScenarioUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-grey-50" />}>
      <UploadPageInner />
    </Suspense>
  );
}
