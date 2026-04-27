/**
 * Report Reference Plan — shared type definitions.
 * -------------------------------------------------
 * A "report plan" is a pre-agreed bibliography for a Board report
 * chapter. It exists so several authors can work on the same chapter
 * in Word without stepping on each other's citations.
 *
 * Types here are the wire shape both the `client` (browser) and
 * `plan-store` (server) sides speak. Every DOCX export via
 * `word-export.ts` also reads from this shape. Keep it thin.
 */

// A single reference as it lives inside a report plan.  We keep the minimum
// metadata needed to render inline citations and a bibliography, matching the
// shape used by the shared custom-reference library (`CustomRef`) so we can
// import/export between the two without extra mapping.
export interface PlanReference {
  id: string;               // matches reference-library id (e.g. `doi-10.1038-s41558...`)
  doi?: string;
  title: string;
  authors: string;          // canonical "Family, G." or "Family, G.; Family2, G." string
  year: string;
  journal?: string;
  type?: string;            // CSL type ("article-journal", "report", ...)
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  fullCitation?: string;    // pre-formatted APA-ish string (optional)
}

// A headline / section in the report outline.
export interface ReportSection {
  id: string;               // local uuid
  title: string;            // "Introduction", "Methodology", ...
  description?: string;     // short note for the writer
  referenceIds: string[];   // ordered list of refs assigned to this section
}

export interface ReportPlan {
  id: string;
  name: string;
  description?: string;
  sections: ReportSection[];
  references: PlanReference[]; // local copies so the plan is self-contained
  createdAt: string;
  updatedAt: string;
}

// Default section outline used when creating a new plan.
export const DEFAULT_SECTIONS: { title: string; description: string }[] = [
  { title: 'Introduction',  description: 'Background, context, and research question.' },
  { title: 'Methodology',   description: 'Data, models, and analytical approach.' },
  { title: 'Results',       description: 'Main findings and quantitative output.' },
  { title: 'Discussion',    description: 'Interpretation and comparison with the literature.' },
  { title: 'Conclusion',    description: 'Key takeaways and policy implications.' },
];
