# Factsheet figure verification

These scripts preprocess each ESABCC report PDF in `esabcc-reports/` into
text, figure-caption and table dumps used to verify the figure data in
`src/data/fact-sheets-reports.ts`.

## Run

```bash
pip install pdfplumber
python3 scripts/factsheet-verify/preprocess_reports.py
python3 scripts/factsheet-verify/summarise_figures.py
```

Output goes to `scripts/factsheet-verify/extracted/` (gitignored).
Each PDF produces:

- `<stem>.text.txt` — full page-delimited plain text
- `<stem>.figures.json` — detected "Figure N: caption" lines with page
- `<stem>.tables.json` — detected "Table N: caption" lines + extracted
  table rows

## What we verified

For each of the 10 reports referenced by the factsheet builder, the
figures in `src/data/fact-sheets-reports.ts` were replaced with exact
numeric values traceable to a specific figure/table and page in the
source PDF. Each figure's `sourceNote` cites the exact page reference.

Two reports have no numeric figures in the source document:

- **Energy Infrastructure (2023)** — only schematic diagrams in the PDF;
  two figures were built from the single quantitative points in the
  report body (77% energy-sector share; EIB shadow cost of carbon).
- **Setting Climate Targets (2023)** — a 4-page initial-advice brief
  with narrative recommendations only; `figures: []`.
