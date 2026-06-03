'use client';

import { useState } from 'react';
import { Reference, CSLItem, CSLName, CSLItemType, ITEM_TYPE_LABELS, FundingEntry, isEuFunder } from '@/lib/references/types';
import { buildCSLJson, fieldsForType } from '@/lib/references/citation-utils';
import { addReference, updateReference } from '@/lib/references/reference-service';
import { splitTags, combineTags, parseCommaList } from '@/lib/references/projects';

interface ReferenceFormProps {
  libraryId: string;
  editingRef?: Reference | null;
  onSaved: () => void;
  onCancel: () => void;
  /** Existing project names across the library, for autocomplete. */
  knownProjects?: string[];
  /** Pre-fill the project field when adding inside an active project view. */
  defaultProject?: string;
}

function formatFundingLine(f: FundingEntry): string {
  const awards = f.awards && f.awards.length > 0 ? f.awards.join(', ') : '';
  return [f.name, f.doi || '', awards].join(' | ').replace(/\s*\|\s*$/, '');
}

function parseDisplayedFunding(text: string): FundingEntry[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', doi = '', awards = ''] = line.split('|').map(s => s.trim());
      const e: FundingEntry = { name };
      if (doi) e.doi = doi;
      if (awards) e.awards = awards.split(',').map(a => a.trim()).filter(Boolean);
      return e;
    })
    .filter(f => f.name);
}

export default function ReferenceForm({ libraryId, editingRef, onSaved, onCancel, knownProjects = [], defaultProject = '' }: ReferenceFormProps) {
  const csl = editingRef?.csl_json;
  // Project tags ("project:<report>") are kept out of the free-tags field and
  // edited in their own input, so the report context stays a first-class idea.
  const initialTags = splitTags(editingRef?.tags);
  // When adding inside an active project view, seed that report so new
  // literature is filed under it by default.
  const initialProjects = editingRef ? initialTags.projects : (defaultProject ? [defaultProject] : []);

  const [itemType, setItemType] = useState<CSLItemType>(csl?.type || 'article-journal');
  const [title, setTitle] = useState(csl?.title || '');
  const [authorsText, setAuthorsText] = useState(
    csl?.author?.map(a => a.literal || `${a.family}, ${a.given || ''}`).join('\n') || ''
  );
  const [year, setYear] = useState(csl?.issued?.['date-parts']?.[0]?.[0]?.toString() || '');
  const [doi, setDoi] = useState(csl?.DOI || '');
  const [containerTitle, setContainerTitle] = useState(csl?.['container-title'] || '');
  const [volume, setVolume] = useState(csl?.volume || '');
  const [issue, setIssue] = useState(csl?.issue || '');
  const [page, setPage] = useState(csl?.page || '');
  const [publisher, setPublisher] = useState(csl?.publisher || '');
  const [url, setUrl] = useState(csl?.URL || '');
  const [abstract, setAbstract] = useState(csl?.abstract || '');
  const [tagsText, setTagsText] = useState(initialTags.plain.join(', '));
  const [projectsText, setProjectsText] = useState(initialProjects.join(', '));
  const [notes, setNotes] = useState(editingRef?.notes || '');
  // ── Type-specific fields ──
  const [institution, setInstitution] = useState(
    // Reports/webpages — when no separate publisher is set, the publisher
    // is conventionally the issuing institution.
    csl?.publisher || ''
  );
  const [accessed, setAccessed] = useState(() => {
    const dp = csl?.accessed?.['date-parts']?.[0];
    if (!dp || dp.length === 0) return '';
    const [y, m, d] = dp;
    if (!y) return '';
    if (!m) return String(y);
    return `${y}-${String(m).padStart(2, '0')}${d ? `-${String(d).padStart(2, '0')}` : ''}`;
  });
  const [legislationCode, setLegislationCode] = useState(csl?.number || '');
  const [fundingText, setFundingText] = useState(() =>
    (csl?.funder || []).map(formatFundingLine).join('\n')
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fields = fieldsForType(itemType);

  const parseFunding = (text: string): FundingEntry[] => {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name = '', doi = '', awards = ''] = line.split('|').map(s => s.trim());
        const entry: FundingEntry = { name };
        if (doi) entry.doi = doi;
        if (awards) entry.awards = awards.split(',').map(a => a.trim()).filter(Boolean);
        return entry;
      })
      .filter(f => f.name);
  };

  const parseAuthors = (text: string): CSLName[] => {
    return text.split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(/,\s*/);
      if (parts.length >= 2) return { family: parts[0], given: parts[1] };
      const words = line.trim().split(/\s+/);
      if (words.length >= 2) return { family: words[words.length - 1], given: words.slice(0, -1).join(' ') };
      return { family: line.trim() };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSaving(true);

    try {
      const authors = parseAuthors(authorsText);
      const funding = parseFunding(fundingText);
      const cslJson = buildCSLJson({
        item_type: itemType,
        title: title.trim(),
        authors,
        year: year ? parseInt(year, 10) : null,
        doi: fields.doi ? doi.trim() : '',
        container_title: fields.container ? containerTitle.trim() : '',
        volume: fields.volume ? volume.trim() : '',
        issue: fields.issue ? issue.trim() : '',
        page: fields.page ? page.trim() : '',
        publisher: fields.publisher ? publisher.trim() : '',
        url: fields.url ? url.trim() : '',
        abstract: abstract.trim(),
        institution: fields.institution ? institution.trim() : '',
        accessed: fields.accessed ? accessed.trim() : '',
        legislation_code: fields.legislationCode ? legislationCode.trim() : '',
        funding,
      });

      const tags = combineTags(parseCommaList(tagsText), parseCommaList(projectsText));

      if (editingRef) {
        cslJson.id = editingRef.citation_key || editingRef.id;
        await updateReference(editingRef.id, {
          csl_json: cslJson,
          title: cslJson.title,
          authors: cslJson.author || [],
          year: cslJson.issued?.['date-parts']?.[0]?.[0],
          doi: cslJson.DOI,
          abstract: cslJson.abstract,
          container_title: cslJson['container-title'],
          tags,
          notes: notes.trim() || undefined,
          funding: cslJson.funder || [],
        });
      } else {
        await addReference(libraryId, cslJson, tags, notes.trim() || undefined);
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save reference');
    } finally {
      setSaving(false);
    }
  };

  const commonTypes: CSLItemType[] = [
    'article-journal', 'book', 'chapter', 'paper-conference',
    'report', 'thesis', 'webpage', 'legislation', 'dataset',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-tertiary-dark">
          {editingRef ? 'Edit Reference' : 'Add Reference Manually'}
        </h2>
        <button type="button" onClick={onCancel} className="text-tertiary hover:text-tertiary-dark text-xl">&times;</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-accent-red">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">Type</label>
          <select value={itemType} onChange={e => setItemType(e.target.value as CSLItemType)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark">
            {commonTypes.map(t => <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
            placeholder="Title of the work" required />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">Authors (one per line: Last, First)</label>
          <textarea value={authorsText} onChange={e => setAuthorsText(e.target.value)} rows={3}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark font-mono text-sm"
            placeholder={"Smith, John\nMüller, Anna"} />
        </div>

        <div>
          <label className="block text-sm text-tertiary mb-1">Year</label>
          <input type="number" value={year} onChange={e => setYear(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
            placeholder="2024" />
        </div>

        {fields.doi && (
          <div>
            <label className="block text-sm text-tertiary mb-1">DOI</label>
            <input value={doi} onChange={e => setDoi(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
              placeholder="10.1038/..." />
          </div>
        )}

        {fields.legislationCode && (
          <div className="col-span-2">
            <label className="block text-sm text-tertiary mb-1">{fields.legislationCodeLabel}</label>
            <input value={legislationCode} onChange={e => setLegislationCode(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
              placeholder="2021/1119" />
          </div>
        )}

        {fields.container && (
          <div className="col-span-2">
            <label className="block text-sm text-tertiary mb-1">{fields.containerLabel}</label>
            <input value={containerTitle} onChange={e => setContainerTitle(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
          </div>
        )}

        {fields.volume && (
          <div>
            <label className="block text-sm text-tertiary mb-1">Volume</label>
            <input value={volume} onChange={e => setVolume(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
          </div>
        )}
        {fields.issue && (
          <div>
            <label className="block text-sm text-tertiary mb-1">Issue</label>
            <input value={issue} onChange={e => setIssue(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
          </div>
        )}
        {fields.page && (
          <div>
            <label className="block text-sm text-tertiary mb-1">Pages</label>
            <input value={page} onChange={e => setPage(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
              placeholder="234-245" />
          </div>
        )}
        {fields.publisher && (
          <div>
            <label className="block text-sm text-tertiary mb-1">{fields.publisherLabel}</label>
            <input value={publisher} onChange={e => setPublisher(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
          </div>
        )}
        {fields.institution && (
          <div className="col-span-2">
            <label className="block text-sm text-tertiary mb-1">Institution / Issuing Organisation</label>
            <input value={institution} onChange={e => setInstitution(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
              placeholder="e.g. European Environment Agency" />
          </div>
        )}

        {fields.url && (
          <div className="col-span-2">
            <label className="block text-sm text-tertiary mb-1">URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
              placeholder="https://…" />
          </div>
        )}

        {fields.accessed && (
          <div>
            <label className="block text-sm text-tertiary mb-1">Accessed (date)</label>
            <input type="date" value={accessed} onChange={e => setAccessed(e.target.value)}
              className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
          </div>
        )}

        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">Abstract</label>
          <textarea value={abstract} onChange={e => setAbstract(e.target.value)} rows={4}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark text-sm" />
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">
            Funding{' '}
            <span className="text-[10px] text-tertiary">
              (one per line: <code>Name | DOI prefix | award1, award2</code>; auto-filled from DOI)
            </span>
          </label>
          <textarea value={fundingText} onChange={e => setFundingText(e.target.value)} rows={2}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark font-mono text-xs"
            placeholder="European Commission | 10.13039/501100000780 | 101081244" />
          {parseDisplayedFunding(fundingText).some(isEuFunder) && (
            <p className="mt-1 text-[10px] text-[#007B6C] font-semibold">EU-funded</p>
          )}
        </div>

        <div className="col-span-2">
          <label className="block text-sm text-tertiary mb-1">
            Report / Project{' '}
            <span className="text-[10px] text-tertiary">
              (comma-separated — the report this reference is used in, e.g. <code>Policy Gap 2.0</code>)
            </span>
          </label>
          <input value={projectsText} onChange={e => setProjectsText(e.target.value)}
            list="reference-form-known-projects"
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
            placeholder="Policy Gap 2.0" />
          <datalist id="reference-form-known-projects">
            {knownProjects.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-sm text-tertiary mb-1">Tags (comma-separated)</label>
          <input value={tagsText} onChange={e => setTagsText(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark"
            placeholder="climate, EU, emissions" />
        </div>
        <div>
          <label className="block text-sm text-tertiary mb-1">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-tertiary-dark" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-grey-200">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 bg-grey-200 hover:bg-grey-200 text-tertiary-dark rounded">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50">
          {saving ? 'Saving...' : editingRef ? 'Update' : 'Add Reference'}
        </button>
      </div>
    </form>
  );
}
