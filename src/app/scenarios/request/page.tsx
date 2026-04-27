'use client';
import { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const COMMON_VARIABLES = [
  'Emissions|CO2', 'Emissions|CO2|Energy', 'Emissions|Kyoto Gases',
  'Primary Energy', 'Primary Energy|Coal', 'Primary Energy|Gas', 'Primary Energy|Oil',
  'Primary Energy|Renewable', 'Primary Energy|Nuclear',
  'Final Energy', 'Final Energy|Industry', 'Final Energy|Transportation', 'Final Energy|Residential and Commercial',
  'Secondary Energy|Electricity', 'Carbon Sequestration|CCS',
  'Temperature|Global Mean', 'Forcing', 'GDP|PPP', 'Population',
];

const COMMON_REGIONS = ['World', 'EU27', 'EU27+UK', 'Western Europe', 'Eastern Europe', 'Northern Europe', 'Southern Europe'];

interface OpenCall {
  id: string;
  title: string;
  description: string;
  deadline: string;
  variables: string[];
  regions: string[];
  formats: string[];
  contact: string;
  status: 'open' | 'closed' | 'processing';
  submissions: number;
  createdAt: string;
}

export default function ScenarioRequestPage() {
  return (
    <Suspense fallback={null}>
      <ScenarioRequestPageInner />
    </Suspense>
  );
}

function ScenarioRequestPageInner() {
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set(['Emissions|CO2', 'Primary Energy']));
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set(['EU27', 'World']));
  const [formats, setFormats] = useState({ csv: true, json: true, excel: true });
  const [contact, setContact] = useState('secretariat@esabcc.europa.eu');
  const [instructions, setInstructions] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [generatedKey, setGeneratedKey] = useState('');

  const [calls, setCalls] = useState<OpenCall[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('scenario-calls') || '[]'); } catch { return []; }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-open upload portal when navigated via shared link (?call=slug)
  useEffect(() => {
    const callSlug = searchParams.get('call');
    if (callSlug) setShowUpload(true);
  }, [searchParams]);

  const createCall = useCallback(() => {
    if (!title.trim() || !deadline) return;
    const call: OpenCall = {
      id: `call-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      deadline,
      variables: [...selectedVars],
      regions: [...selectedRegions],
      formats: Object.entries(formats).filter(([, v]) => v).map(([k]) => k),
      contact,
      status: 'open',
      submissions: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const next = [call, ...calls];
    setCalls(next);
    localStorage.setItem('scenario-calls', JSON.stringify(next));
    setShowPreview(true);
  }, [title, description, deadline, selectedVars, selectedRegions, formats, contact, calls]);

  const toggleVar = (v: string) => {
    setSelectedVars(prev => { const next = new Set(prev); next.has(v) ? next.delete(v) : next.add(v); return next; });
  };

  const toggleRegion = (r: string) => {
    setSelectedRegions(prev => { const next = new Set(prev); next.has(r) ? next.delete(r) : next.add(r); return next; });
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('callId', calls[0]?.id || 'manual');
      const res = await fetch('/api/scenario-upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus('success');
        setGeneratedKey(data.apiKey || '');
      } else {
        setUploadStatus('error');
      }
    } catch {
      setUploadStatus('error');
    }
  };

  const printCallDocument = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const fmts = Object.entries(formats).filter(([, v]) => v).map(([k]) => k.toUpperCase()).join(', ');
    w.document.write(`
      <html><head><title>Open Call - ${title}</title>
      <style>body{font-family:Segoe UI,Arial,sans-serif;max-width:700px;margin:40px auto;color:#3D5265;line-height:1.6}
      h1{color:#004B7F;border-bottom:3px solid #007B6C;padding-bottom:10px}h2{color:#004B7F;margin-top:25px}
      .badge{display:inline-block;background:#007B6C;color:white;padding:3px 10px;border-radius:4px;font-size:12px}
      table{width:100%;border-collapse:collapse;margin:15px 0}td,th{border:1px solid #E6E7E8;padding:8px;text-align:left;font-size:13px}
      th{background:#004B7F;color:white}.disclaimer{background:#F9FAFB;border:1px solid #E6E7E8;padding:15px;margin:20px 0;font-size:12px;border-radius:4px}
      </style></head><body>
      <div style="text-align:center;margin-bottom:30px">
        <h1 style="border:none;margin-bottom:5px">ESABCC</h1>
        <p style="color:#007B6C;font-size:14px">European Scientific Advisory Board on Climate Change</p>
      </div>
      <h1>Open Call for Scenario Data Submissions</h1>
      <p><span class="badge">Status: OPEN</span></p>
      <h2>Call Details</h2>
      <table>
        <tr><th>Title</th><td>${title}</td></tr>
        <tr><th>Deadline</th><td>${deadline}</td></tr>
        <tr><th>Contact</th><td>${contact}</td></tr>
      </table>
      ${description ? `<h2>Description</h2><p>${description}</p>` : ''}
      <h2>Required Variables</h2>
      <ul>${[...selectedVars].map(v => `<li><code>${v}</code></li>`).join('')}</ul>
      <h2>Required Regions</h2>
      <ul>${[...selectedRegions].map(r => `<li>${r}</li>`).join('')}</ul>
      <h2>Accepted Data Formats</h2><p>${fmts}</p>
      <h2>Data Format Guide</h2>
      <p>Submitted data must follow the IIASA scenario data format:</p>
      <table>
        <tr><th>Model</th><th>Scenario</th><th>Variable</th><th>Region</th><th>Unit</th><th>2020</th><th>2025</th><th>...</th><th>2100</th></tr>
        <tr><td>MyModel v1</td><td>NetZero</td><td>Emissions|CO2</td><td>EU27</td><td>Mt CO2/yr</td><td>3200</td><td>2800</td><td>...</td><td>-50</td></tr>
      </table>
      ${instructions ? `<h2>Additional Instructions</h2><p>${instructions}</p>` : ''}
      <div class="disclaimer">
        <strong>Disclaimer:</strong> Submitted data will be used for science-to-policy analysis by the ESABCC.
        There is no guarantee that submitted data will be used in any specific analysis or publication.
        No formal acknowledgment of data contribution is provided.
        By submitting data, you confirm that you have the rights to share this data for scientific analysis.
      </div>
      <p style="font-size:12px;color:#808285;text-align:center;margin-top:30px">
        For questions: ${contact}<br>ESABCC Method Hub — Scenario Data Request System
      </p>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6667AB] to-[#4B4C8A]">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8">
          <Link href="/scenarios" className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition mb-3">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>Back to Data &amp; Scenario Explorer
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Request New Scenario Data</h1>
          <p className="text-sm text-white/60 max-w-2xl">
            Create open calls for scenario data submissions. Modellers can submit data via file upload or API in IIASA-compatible format.
          </p>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Create New Call ─────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">Create New Open Call</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-tertiary-dark block mb-1">Call Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Open Scenario Call February 2026"
                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-tertiary-dark block mb-1">Deadline *</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary-dark block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe what data is needed, context, and how it will be used..."
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30" />
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary-dark block mb-2">Required Variables</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_VARIABLES.map(v => (
                <button key={v} onClick={() => toggleVar(v)}
                  className={`text-[11px] px-2 py-1 rounded font-medium transition ${
                    selectedVars.has(v) ? 'bg-accent-violet text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                  }`}>{v.split('|').pop()}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary-dark block mb-2">Required Regions</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_REGIONS.map(r => (
                <button key={r} onClick={() => toggleRegion(r)}
                  className={`text-[11px] px-2 py-1 rounded font-medium transition ${
                    selectedRegions.has(r) ? 'bg-primary text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                  }`}>{r}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="text-xs font-medium text-tertiary-dark">Accepted Formats:</label>
            {(['csv', 'json', 'excel'] as const).map(f => (
              <label key={f} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={formats[f]} onChange={() => setFormats(prev => ({ ...prev, [f]: !prev[f] }))}
                  className="rounded border-grey-300 text-accent-violet focus:ring-accent-violet" />
                {f.toUpperCase()}
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary-dark block mb-1">Contact Email</label>
            <input type="email" value={contact} onChange={e => setContact(e.target.value)}
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30" />
          </div>

          <div>
            <label className="text-xs font-medium text-tertiary-dark block mb-1">Additional Instructions</label>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder="Any extra requirements..."
              className="w-full border border-grey-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-violet/30" />
          </div>

          <div className="flex gap-3">
            <button onClick={createCall} disabled={!title.trim() || !deadline}
              className="px-4 py-2 bg-accent-violet text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 transition">
              Create Open Call
            </button>
            {calls.length > 0 && (
              <button onClick={printCallDocument}
                className="px-4 py-2 bg-grey-100 text-tertiary-dark text-sm font-medium rounded hover:bg-grey-200 transition">
                Download Call as PDF
              </button>
            )}
          </div>
        </section>

        {/* ── Upload Portal ──────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">Data Submission Portal</h2>
          <p className="text-xs text-tertiary">Upload scenario data in CSV, JSON, or Excel format following the IIASA standard.</p>

          <div className="border-2 border-dashed border-grey-300 rounded-lg p-8 text-center hover:border-accent-violet/50 transition cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}>
            <input ref={fileInputRef} type="file" accept=".csv,.json,.xlsx,.xls" className="hidden"
              onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />
            {uploadFile ? (
              <div>
                <p className="text-sm font-medium text-tertiary-dark">{uploadFile.name}</p>
                <p className="text-xs text-tertiary mt-1">{(uploadFile.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <svg className="mx-auto mb-2 text-grey-400" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-tertiary">Drop CSV, JSON, or Excel files here</p>
                <p className="text-xs text-grey-400 mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {uploadFile && (
            <button onClick={handleUpload} disabled={uploadStatus === 'uploading'}
              className="px-4 py-2 bg-secondary text-white text-sm font-medium rounded hover:bg-secondary-dark disabled:opacity-50 transition">
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Submit Data'}
            </button>
          )}

          {uploadStatus === 'success' && (
            <div className="bg-surface-green rounded-lg p-4">
              <p className="text-sm font-medium text-green-800">Data submitted successfully!</p>
              <p className="text-xs text-green-700 mt-1">API Key: <code className="bg-white px-2 py-0.5 rounded">{generatedKey}</code></p>
            </div>
          )}
        </section>

        {/* ── Active Calls ───────────────────────────────────────── */}
        {calls.length > 0 && (
          <section className="bg-white rounded-lg border border-grey-200 p-5 space-y-3">
            <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider">Active Open Calls</h2>
            {calls.map(call => (
              <div key={call.id} className="border border-grey-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-tertiary-dark">{call.title}</p>
                  <p className="text-[10px] text-tertiary">Deadline: {call.deadline} | Submissions: {call.submissions} | Created: {call.createdAt}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  call.status === 'open' ? 'bg-green-100 text-green-700' : call.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-grey-100 text-grey-500'
                }`}>{call.status}</span>
              </div>
            ))}
          </section>
        )}

        {/* ── Format Guide ───────────────────────────────────────── */}
        <details className="bg-white rounded-lg border border-grey-200">
          <summary className="px-5 py-3 cursor-pointer text-sm font-bold text-tertiary-dark hover:bg-grey-50 transition">
            Submission Format Guide
          </summary>
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-tertiary">Data must follow the IIASA scenario data format with these required columns:</p>
            <div className="bg-grey-50 rounded p-3 overflow-x-auto">
              <table className="text-xs w-full">
                <thead><tr className="text-left text-tertiary-dark border-b border-grey-200">
                  <th className="pb-1 pr-3">Model</th><th className="pb-1 pr-3">Scenario</th><th className="pb-1 pr-3">Variable</th>
                  <th className="pb-1 pr-3">Region</th><th className="pb-1 pr-3">Unit</th><th className="pb-1 pr-3">2020</th><th className="pb-1 pr-3">2025</th><th className="pb-1">...</th>
                </tr></thead>
                <tbody><tr className="text-tertiary">
                  <td className="pt-1 pr-3">GCAM 6.0</td><td className="pt-1 pr-3">SSP2-4.5</td><td className="pt-1 pr-3">Emissions|CO2</td>
                  <td className="pt-1 pr-3">EU27</td><td className="pt-1 pr-3">Mt CO2/yr</td><td className="pt-1 pr-3">2800</td><td className="pt-1 pr-3">2400</td><td className="pt-1">...</td>
                </tr></tbody>
              </table>
            </div>
            <p className="text-xs text-tertiary">Variable naming follows the IIASA convention with pipe (&apos;|&apos;) separators. Time steps should be in 5-year intervals (2020, 2025, ..., 2100). Contact: {contact}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
