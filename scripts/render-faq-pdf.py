#!/usr/bin/env python3
"""
Render docs/FAQ-NON-TECHNICAL.md into a styled PDF for distribution.

Output: ESABCC-MethodHub-FAQ-non-technical.pdf at the repo root.

This is intentionally a build-time utility, not a CI step — non-
technical stakeholders will consume the PDF, not the Markdown source,
and updates happen in small bursts, so running it by hand after
substantive FAQ edits is fine.

Usage:
    python3 scripts/render-faq-pdf.py

Dependencies:
    pip install markdown weasyprint
"""
from __future__ import annotations

from pathlib import Path
import markdown as md
from weasyprint import HTML, CSS

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "FAQ-NON-TECHNICAL.md"
OUT = ROOT / "ESABCC-MethodHub-FAQ-non-technical.pdf"

CSS_STRING = r"""
@page {
  size: A4;
  margin: 20mm 18mm 22mm 18mm;
  @bottom-center {
    content: "ESABCC Secretariat MethodHub · FAQ for non-technical staff · page " counter(page) " of " counter(pages);
    font-family: "Inter", sans-serif;
    font-size: 8pt;
    color: #8A95A3;
  }
  @top-right {
    content: "Internal · CCE5";
    font-family: "JetBrains Mono", monospace;
    font-size: 7.5pt;
    letter-spacing: 0.1em;
    color: #658E8C;
  }
}
@page :first {
  @top-right { content: ""; }
  @bottom-center { content: ""; }
}

html { font-family: "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif; }
body { color: #2C3E4D; font-size: 10.5pt; line-height: 1.55; }

h1 {
  color: #3D5265;
  font-size: 22pt;
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin: 0 0 0.4em;
  border-bottom: 2pt solid #00928F;
  padding-bottom: 0.3em;
  page-break-before: avoid;
}
h2 {
  color: #3D5265;
  font-size: 14pt;
  margin: 1.4em 0 0.3em;
  padding-top: 0.3em;
  page-break-before: always;
}
h2:first-of-type, h1 + h2 { page-break-before: avoid; }
h2::before {
  content: "";
  display: block;
  width: 2.4em;
  height: 2pt;
  background: #00928F;
  margin-bottom: 0.5em;
}
h3 {
  color: #3D5265;
  font-size: 11.8pt;
  margin: 1.3em 0 0.25em;
  page-break-after: avoid;
}

p { margin: 0 0 0.7em; }
ul, ol { margin: 0 0 0.9em 1.2em; padding: 0; }
ul li, ol li { margin: 0.2em 0; }

em { color: #5B6B7B; }
strong { color: #3D5265; }

hr { border: none; border-top: 0.5pt solid #E6E7E8; margin: 1.2em 0; }

code {
  font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: #F6F7F8;
  border: 0.5pt solid #E6E7E8;
  border-radius: 2pt;
  padding: 0.08em 0.35em;
  color: #2C3E4D;
}

blockquote {
  border-left: 2.4pt solid #00928F;
  margin: 0.8em 0;
  padding: 0.6em 0.9em;
  background: #E6F4F3;
  color: #3D5265;
  border-radius: 0 3pt 3pt 0;
  font-size: 10pt;
}

/* Cover page — the first block before any <h2> becomes the cover */
.cover {
  min-height: 26cm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  page-break-after: always;
}
.cover .kicker {
  font-family: "JetBrains Mono", monospace;
  font-size: 9pt;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #658E8C;
  margin-bottom: 0.8em;
}
.cover h1 {
  font-size: 30pt;
  border: none;
  padding: 0;
  margin: 0 0 0.4em;
  letter-spacing: -0.02em;
}
.cover .lede {
  font-size: 13pt;
  color: #5B6B7B;
  max-width: 28em;
  line-height: 1.45;
  margin: 0.6em 0 2em;
}
.cover .stewards {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 0.5pt solid #E6E7E8;
  font-size: 9.5pt;
  color: #5B6B7B;
  line-height: 1.6;
}
.cover .stewards strong { color: #3D5265; }

.cover-teal { color: #00928F; }
"""

COVER_HTML = """
<section class="cover">
  <p class="kicker">Internal · ESABCC Secretariat · CCE5</p>
  <h1>MethodHub — FAQ<br/><span class="cover-teal">for non-technical staff</span></h1>
  <p class="lede">A plain-language guide to what MethodHub is, how it is built, how it protects user data, and what is asked of the EEA. Every term of jargon unpacked as it first appears. No prior software knowledge assumed.</p>
  <div class="stewards">
    <p><strong>Code stewards</strong> &middot; CCE5 (EEA unit)</p>
    <p><strong>Hosting target</strong> &middot; EEA infrastructure, EU region</p>
    <p><strong>Primary user</strong> &middot; the ESABCC Secretariat</p>
    <p><strong>Contact</strong> &middot; Sebastian Franz &lt;sebastian.franz@esabcc.europa.eu&gt;</p>
  </div>
</section>
"""

def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"FAQ source not found: {SRC}")

    raw = SRC.read_text(encoding="utf-8")
    # Strip YAML front-matter if present (MkDocs-style).
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        if len(parts) >= 3:
            raw = parts[2].lstrip()

    html_body = md.markdown(
        raw,
        extensions=["extra", "toc", "sane_lists"],
    )

    html_doc = (
        '<!doctype html><html lang="en"><head><meta charset="utf-8">'
        "<title>ESABCC MethodHub — FAQ for non-technical staff</title>"
        f"<style>{CSS_STRING}</style></head><body>"
        f"{COVER_HTML}{html_body}"
        "</body></html>"
    )

    HTML(string=html_doc, base_url=str(ROOT)).write_pdf(
        str(OUT),
        stylesheets=[CSS(string=CSS_STRING)],
    )
    kb = OUT.stat().st_size // 1024
    print(f"Wrote {OUT.relative_to(ROOT)} ({kb} KB)")


if __name__ == "__main__":
    main()
