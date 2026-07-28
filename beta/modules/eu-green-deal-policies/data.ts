/**
 * EU Green Deal Policy Tracker (beta module M·39) — data.
 *
 * Baseline: ETC CE Report 2024/8 "Investment needs and gaps for the
 * sustainability transition in Europe" (Eionet, Oct 2024), Annex 2 —
 * "Adopted, ongoing, and planned EGDSF legislative initiatives per
 * environmental policy area" (snapshot April 2024), the source behind the
 * report's Figure 1.2. Updated to July 2026 with adopted-act references,
 * EUR-Lex and EP legislative-train links, and the 2025-26
 * simplification/omnibus agenda (which acts have been reopened).
 *
 * AI-researched (one Sonnet agent per policy area) and AI-fact-checked
 * (one adversarial verifier per area); per-entry verification status is
 * recorded in `verification` — treat "unverified" entries with care.
 * Generated 2026-07-28 — do not hand-edit counts.
 */

export type PolicyArea = 'climate-energy' | 'transport' | 'ce-industry' | 'pollution-chemicals' | 'biodiversity';
export type Group2024 = 'adopted' | 'ongoing' | 'planned';
export type Timing2024 = 'on-time' | 'delayed' | 'na';
export type StatusNow = 'adopted' | 'ongoing' | 'planned' | 'withdrawn' | 'shelved';
export type Verification = 'verified' | 'corrected' | 'unverified';
export type AmendmentStatus = 'proposed' | 'provisional-agreement' | 'adopted';

export interface SourceLink { title: string; url: string }

export interface Reopening {
  pkg: string;
  what: string;
  ref?: string;
  status: AmendmentStatus;
  date?: string;
  url: string;
}

export interface Initiative {
  id: string;
  name: string;
  /** Policy areas as in Annex 2 (first = primary; >1 = double-counted in the figure, as in the original). */
  areas: PolicyArea[];
  /** Annex 2 snapshot, April 2024 */
  group2024: Group2024;
  timing2024?: Timing2024;
  /** Reference as printed in Annex 2; absent for planned initiatives that had none. */
  ref2024?: string;
  /** Status July 2026 */
  statusNow: StatusNow;
  actRef?: string;
  actDate?: string;
  eurlexUrl?: string;
  legTrainUrl?: string;
  summaryNow: string;
  reopened: boolean;
  reopenedBy?: Reopening[];
  sources: SourceLink[];
  verification: Verification;
  checkNotes?: string;
}

export interface OmnibusPackage {
  name: string;
  ref?: string;
  date: string;
  status: 'proposed' | 'provisional-agreement' | 'partially-adopted' | 'adopted';
  summary: string;
  actsReopened?: string[];
  sources: SourceLink[];
}

export const AREA_ORDER: PolicyArea[] = ["climate-energy","transport","ce-industry","pollution-chemicals","biodiversity"];
export const AREA_LABELS: Record<PolicyArea, string> = {
  "climate-energy": "Climate and energy",
  "transport": "Transport",
  "ce-industry": "CE and industry",
  "pollution-chemicals": "Pollution and chemicals",
  "biodiversity": "Biodiversity, ecosystems, agriculture"
};

export const INITIATIVES: Initiative[] = [
  {
    "id": "cbam",
    "name": "Carbon Border Adjustment Mechanism (CBAM)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/956",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/956",
    "actDate": "2023-05-10",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956",
    "summaryNow": "CBAM Reg. 2023/956 in force since Oct 2023 (definitive regime applying from Jan 2026). Amended under Omnibus I simplification: trilogue agreement 18 June 2025, EP adopted 10 Sept 2025, Council adopted 29 Sept 2025, published as Reg. (EU) 2025/2083 (OJ 17 Oct 2025, applying 20 Oct 2025), introducing a 50-tonnes/year cumulative de-minimis mass exemption (replacing the EUR150-per-consignment rule) and other procedural simplifications ahead of the 2026 compliance phase. ADDED: on 17 December 2025 the Commission separately tabled a proposal to extend CBAM's scope to roughly 180 additional downstream steel- and aluminium-intensive products (e.g. fasteners, machinery, vehicle parts, domestic appliances) plus anti-circumvention measures, targeting application from 1 January 2028; the Council reached a general-approach negotiating position on 12 June 2026, with the file still in the ordinary legislative procedure as of July 2026.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Omnibus I simplification package",
        "what": "Simplifies CBAM with a new 50t/year cumulative de-minimis mass threshold and streamlined authorisation/reporting rules.",
        "ref": "Reg. (EU) 2025/2083",
        "status": "adopted",
        "date": "2025-10",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2083"
      },
      {
        "pkg": "CBAM downstream scope extension",
        "what": "Proposal to amend Reg. (EU) 2023/956 to extend CBAM scope to ~180 additional downstream steel- and aluminium-intensive products and introduce anti-circumvention measures, targeting application from 1 January 2028.",
        "ref": "COM(2025) [exact sub-number not confirmed], tabled 17 December 2025",
        "status": "proposed",
        "date": "2026-06",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-issues-cbam-operational-rules-and-proposes-downstream-extension-of-the-cbam-scope"
      }
    ],
    "sources": [
      {
        "title": "CBAM Simplification Regulation Officially Adopted by the EU - SGS",
        "url": "https://www.sgs.com/en/news/2025/11/cbam-simplification-regulation-officially-adopted-by-the-eu"
      },
      {
        "title": "EU adopts simplifications of CBAM rules ahead of the compliance phase starting in 2026 - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-adopts-simplifications-cbam-rules-ahead-compliance-phase-starting-2026"
      },
      {
        "title": "CBAM: Council signs off simplification to the EU carbon leakage instrument - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/09/29/cbam-council-signs-off-simplification-to-the-eu-carbon-leakage-instrument/"
      },
      {
        "title": "EU Adopts CBAM Simplification Regulation: 10 Key Amendments - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/10/eu-adopts-cbam-simplification-regulation-10-key-amendments-and-challenges-ahead"
      },
      {
        "title": "European Commission Issues CBAM Operational Rules and Proposes Downstream Extension of the CBAM Scope - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-issues-cbam-operational-rules-and-proposes-downstream-extension-of-the-cbam-scope"
      },
      {
        "title": "Council position on proposed CBAM expansion: what businesses need to know - PwC",
        "url": "https://www.pwc.be/en/news-publications/news/2026/council-position-on-proposed-cbam-expansion.html"
      }
    ],
    "verification": "corrected",
    "checkNotes": "ADDED MISSING REOPENING (focus item 6). Reg. (EU) 2025/2083 CBAM simplification re-confirmed (32025R2083 OK in celex_report; consistent with omnibus.json's Omnibus I entry). Newly added: Commission proposal (17 Dec 2025) to extend CBAM to ~180 downstream steel/aluminium products (target application 1 Jan 2028); Council general-approach position reached 12 Jun 2026 - confirmed via WebSearch (Mayer Brown, PwC) but the exact COM sub-number could not be pinned down via a directly fetchable EUR-Lex/OEIL record this session, so it is left unconfirmed in the ref field rather than guessed.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "gas-demand-reduction",
    "name": "Coordinated demand-reduction measures for gas",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2022/1369",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2022/1369",
    "actDate": "2022-08",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2022/1369/oj/eng",
    "summaryNow": "Reg. 2022/1369 (as extended by Reg. (EU) 2023/706) lapsed on 31 March 2024 and was not further prolonged as binding law. On 25 March 2024 the Council instead adopted a non-binding Recommendation continuing coordinated gas-demand reduction; the Commission reported an 18% demand cut (Aug 2022-Dec 2023, ~101 bcm saved). No legislative act reopening Reg. 2022/1369 itself found as of July 2026.",
    "reopened": false,
    "sources": [
      {
        "title": "Coordinated demand-reduction measures for gas - EUR-Lex summary",
        "url": "https://eur-lex.europa.eu/EN/legal-content/summary/coordinated-demand-reduction-measures-for-gas.html"
      },
      {
        "title": "Regulation - 2022/1369 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2022/1369/oj/eng"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32022R1369 OK). Not listed among actsReopened in any omnibus.json package. Annex-2 fidelity OK (ref2024 matches p.112).",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "ets-main",
    "name": "Emissions Trading System (ETS) (main) - incl. maritime, buildings and transport",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2023/959",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2023/959",
    "actDate": "2023-05-10",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959",
    "summaryNow": "ETS Directive 2023/959 (incl. ETS2 for buildings/road transport, in force) remains the main act. Co-legislators politically agreed in Nov 2025, alongside the Climate Law 2040-target package, to postpone the ETS2 launch by one year to 2028; HOWEVER the exact EUR-Lex act formally amending Dir. 2003/87/EC's Chapter IVa start-date provision could not be confirmed - Reg. (EU) 2026/667 (adopted March 2026) only amends Reg. (EU) 2021/1119 per its own official title (see reopenedBy caveat below). Separately, on 17 July 2026 the Commission tabled COM(2026)616, a broader targeted revision of Dir. 2003/87/EC for Phase 5 (2031-2040): recalibrated cap, new Industrial Decarbonisation Bank/Investment Booster, revised free allocation, expanded sectoral coverage (incl. municipal waste incineration) and a DACCS/Bio-CCS removals pathway; this proposal explicitly excludes ETS2 from its scope. Not yet adopted; EP/Council positions due end 2026, trilogues targeted Q1 2027.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "ETS2 launch postponement (2027->2028)",
        "what": "Co-legislators politically agreed, during the 2040 Climate Law negotiations (Council general approach 5 Nov 2025, EP position 13 Nov 2025, final texts adopted Feb-Mar 2026), to delay the ETS2 (buildings/road transport) start by one year to 2028. CORRECTION: this is NOT confirmed to be enacted via Reg. (EU) 2026/667 amending Dir. 2003/87/EC as the original entry claimed. The CELEX record for 32026R0667 gives its official title as 'amending Regulation (EU) 2021/1119 as regards the setting of a Union intermediate climate target for 2040' only - no mention of Directive 2003/87/EC - and a law-firm analysis (Sioufas & Associates) states explicitly that Reg. 2026/667 does not amend the ETS Directive. Several secondary sources describe the postponement as implementable 'without amending the ETS Directive' (e.g. via the Auctioning Regulation, a Commission-level instrument), and COM(2026)616 explicitly places ETS2 outside its own scope. No EUR-Lex act directly amending Dir. 2003/87/EC's Chapter IVa start date was identified as of July 2026 - the same gap is independently flagged in omnibus.json's own 'ETS2 (buildings and road transport) one-year postponement to 2028' package entry.",
        "ref": "Politically agreed via the 2040 Climate Law negotiations; no confirmed EUR-Lex act amending Dir. 2003/87/EC identified",
        "status": "proposed",
        "date": "2025-11/2026-03",
        "url": "https://icapcarbonaction.com/en/news/eu-officially-adopts-2040-climate-target-postpones-ets-2-one-year"
      },
      {
        "pkg": "ETS Directive revision (Phase 5)",
        "what": "Targeted revision of Directive 2003/87/EC for 2031-2040: cap recalibration, new funding mechanisms, revised free allocation, expanded scope, removals pathway. ETS2 explicitly out of scope of this proposal.",
        "ref": "COM(2026)616",
        "status": "proposed",
        "date": "2026-07",
        "url": "https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en"
      }
    ],
    "sources": [
      {
        "title": "EU officially adopts the 2040 climate target, postpones ETS 2 by one year - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-officially-adopts-2040-climate-target-postpones-ets-2-one-year"
      },
      {
        "title": "Plenary approved 2040 Climate Target, ETS2 postponed until 2028 - EU Perspectives",
        "url": "https://euperspectives.eu/2026/02/plenary-approved-2040-climate-target-ets2-postponed-until-2028/"
      },
      {
        "title": "EU-ETS: the main modifications suggested by the European Commission - Clyde & Co",
        "url": "https://www.clydeco.com/en/insights/2026/07/eu-ets-a-targeted-revision-proposed-by-the-eur-1"
      },
      {
        "title": "Update of the EU emissions trading system (EU ETS) - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-update-of-the-eu-emissions-trading-system-(eu-ets)?sid=9701"
      },
      {
        "title": "Regulation (EU) 2026/667: The revised European Climate Law - Sioufas & Associates",
        "url": "https://www.sioufaslaw.gr/regulation-eu-2026-667-the-revised-european-climate-law/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "MAJOR CORRECTION (focus item 2). Verified via direct CELEX XML lookup that Reg. (EU) 2026/667's official title is 'amending Regulation (EU) 2021/1119...' with no reference to Directive 2003/87/EC, and via a law-firm source that explicitly states the Regulation does not amend the ETS Directive. The original entry's claim of an 'Article 2' ETS2 postponement inside that Regulation is unsupported and has been softened/caveated; the postponement itself (political fact) is retained since multiple independent press sources confirm it. COM(2026)616 entry cross-checked and consistent with omnibus.json's independently-compiled ETS Phase-5 package.",
    "areas": [
      "climate-energy",
      "transport"
    ]
  },
  {
    "id": "ets-aviation",
    "name": "ETS aviation revision",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2023/958",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2023/958",
    "actDate": "2023-05",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0958",
    "summaryNow": "Directive (EU) 2023/958 (aviation ETS phase-out of free allowances / CORSIA alignment) remains in force. On 17 July 2026 the Commission published a comprehensive EU ETS revision, COM(2026) 616, amending Directive 2003/87/EC for Phase 5 (2031-2040); this proposal (confirmed to exist, tabled 17.7.2026) is described in Commission/legal-adviser summaries and independently in omnibus.json as reshaping the aviation-ETS framework too (extending scope, revising business-flight rules, redesigning the reserved-allowance mechanism for sustainable aviation fuel, removing free allocation for aviation from 2026), following a mandatory 2026 CORSIA-effectiveness review that found CORSIA coverage still under the 70% legal threshold.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "EU ETS revision (Phase 5 / 2031-2040)",
        "what": "Proposal amending Directive 2003/87/EC and Decision (EU) 2015/1814, including aviation-ETS scope, business-flight rules and the SAF reserved-allowance mechanism, following the 2026 CORSIA effectiveness assessment",
        "ref": "COM(2026) 616",
        "status": "proposed",
        "date": "2026-07-17",
        "url": "https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en"
      }
    ],
    "sources": [
      {
        "title": "EU-ETS: the main modifications suggested by the European Commission - Clyde & Co",
        "url": "https://www.clydeco.com/en/insights/2026/07/eu-ets-a-targeted-revision-proposed-by-the-eur-1"
      },
      {
        "title": "Unpacking the EU ETS Reform - 17th July 2026 Analysis",
        "url": "https://blog.alliedoffsets.com/unpacking-the-eu-ets-reform-17th-july-2026-analysis"
      },
      {
        "title": "EU Commission publishes EU ETS review proposal - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-commission-publishes-eu-ets-review-proposal"
      },
      {
        "title": "Revision of the EU emissions trading system | Think Tank | European Parliament",
        "url": "https://www.europarl.europa.eu/thinktank/en/document/EPRS_BRI(2026)782615"
      },
      {
        "title": "EU ETS Revision 2026: What the July Proposal Will Look Like",
        "url": "https://www.opis.com/blog/eu-ets-revision-2026-what-the-july-proposal-will-look-like/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023L0958 confirmed OK in celex_report. COM(2026)616 cross-checked against omnibus.json's independently-sourced 'ETS Directive targeted revision (Phase 5)' package entry -- consistent. No changes made.",
    "areas": [
      "climate-energy",
      "transport"
    ]
  },
  {
    "id": "ets-msr",
    "name": "ETS Market Stability Reserve",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/852",
    "statusNow": "adopted",
    "actRef": "Decision (EU) 2023/852",
    "actDate": "2023-04-19",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023D0852",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-additional-sector",
    "summaryNow": "CORRECTED: the act is Decision (EU) 2023/852 (CELEX 32023D0852, signed 19 April 2023, OJ L 110), amending MSR Decision (EU) 2015/1814 as regards the amount of allowances to be placed in the market stability reserve until 2030 (24% intake rate, 400m-allowance invalidation threshold); it remains in force. Note: Annex 2 (April 2024, p.112) itself prints this as 'Reg. (EU) 2023/852', which is incorrect - no Regulation with that number exists. The Commission proposed COM(2025)738 (27 Nov 2025) to further amend Decision 2015/1814 specifically for ETS2's 2028 start (bigger/earlier allowance releases, removal of the 2030 invalidation cut-off); Council and EP reached a provisional agreement on 11 June 2026, pending formal adoption. COM(2026)616 (17 July 2026) also revisits MSR parameters as part of the wider ETS update.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "ETS2 Market Stability Reserve amendment",
        "what": "Amends Decision (EU) 2015/1814 to strengthen the MSR ahead of ETS2's 2028 start (larger/earlier allowance releases, removal of the 2030 invalidation cut-off).",
        "ref": "COM(2025)738",
        "status": "provisional-agreement",
        "date": "2026-06",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/11/ets2-market-stability-reserve-council-and-parliament-reach-provisional-agreement/"
      },
      {
        "pkg": "ETS Directive revision (Phase 5)",
        "what": "COM(2026)616 also revisits MSR settings as part of the wider Phase 5 ETS reform.",
        "ref": "COM(2026)616",
        "status": "proposed",
        "date": "2026-07",
        "url": "https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en"
      }
    ],
    "sources": [
      {
        "title": "Decision (EU) 2023/852 - EUR-Lex (CELEX 32023D0852)",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023D0852"
      },
      {
        "title": "Market Stability Reserve - Climate Action, European Commission",
        "url": "https://climate.ec.europa.eu/eu-action/carbon-markets/eu-emissions-trading-system-eu-ets/market-stability-reserve_en"
      },
      {
        "title": "ETS2 market stability reserve: Council and Parliament reach provisional agreement - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/11/ets2-market-stability-reserve-council-and-parliament-reach-provisional-agreement/"
      },
      {
        "title": "Proposal amending Decision (EU) 2015/1814 - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-market-stability-reserve-for-the-buildings-road-transport-and-additional-sector"
      }
    ],
    "verification": "corrected",
    "checkNotes": "KNOWN ERROR FIXED (focus item 1). celex_report.txt flags 32023R0852 as FAIL (no such Regulation exists). Direct CELEX lookup of 32023D0852 confirms it exists (signed 19 Apr 2023, OJ L110) and its DOSSIER_TITLE reads 'DECISION OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL amending Decision (EU) 2015/1814 as regards the amount of allowances to be placed in the market stability reserve...until 2030' - confirming it is the correct MSR act, mislabelled as a Regulation. Fixed actRef and eurlexUrl to the Decision; ref2024 left unchanged as 'Reg. (EU) 2023/852' since that is verbatim what Annex 2 (April 2024, p.112) prints (per task instruction). MSR reopening claims (COM(2025)738, provisional agreement 11 Jun 2026) cross-verified consistent with omnibus.json's 'ETS2 one-year postponement' package sources, which cite the same Commission proposal date (27 Nov 2025) and Council-EP agreement (11 Jun 2026).",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "eu-climate-law",
    "name": "EU Climate Law",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2021/1119",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2021/1119",
    "actDate": "2021-06",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119",
    "summaryNow": "Commission tabled COM(2025)524 (2 July 2025) to amend the Climate Law with a binding EU 2040 target of 90% net GHG reduction vs 1990 (up to 3% via international credits). Council and EP reached provisional agreement 9 Dec 2025; EP adopted the text 10 Feb 2026; Council gave final green light 5 March 2026; published as Regulation (EU) 2026/667 (OJ 18 March 2026, in force 7 April 2026, 20 days after publication).",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "2040 Climate Target Amendment",
        "what": "Amends the Climate Law (Reg. (EU) 2021/1119) to set a binding 2040 EU target of 90% net GHG reduction vs 1990. CORRECTION: co-legislators separately, politically agreed during the same negotiation (Council general approach 5 Nov 2025, EP position 13 Nov 2025) to postpone the ETS2 launch from 2027 to 2028, but this is NOT confirmed to be enacted via Reg. (EU) 2026/667 itself - its official EUR-Lex title reads only 'amending Regulation (EU) 2021/1119 as regards the setting of a Union intermediate climate target for 2040', with no mention of Directive 2003/87/EC. See the ets-main entry for the full caveat on the ETS2-postponement legal vehicle.",
        "ref": "Reg. (EU) 2026/667",
        "status": "adopted",
        "date": "2026-03",
        "url": "https://eur-lex.europa.eu/eli/reg/2026/667/oj/eng"
      }
    ],
    "sources": [
      {
        "title": "2040 climate target: Council gives final green light - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/05/2040-climate-target-council-gives-final-green-light/"
      },
      {
        "title": "2040 climate target: Council and Parliament agree on a 90% emissions reduction - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/10/2040-climate-target-council-and-parliament-agree-on-a-90-emissions-reduction/"
      },
      {
        "title": "Amendment of the EU Climate Law to introduce a 2040 climate target - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-sustaining-our-quality-of-life-food-security-water-and-nature/file-2040-climate-target"
      },
      {
        "title": "EU officially adopts the 2040 climate target, postpones ETS 2 by one year - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-officially-adopts-2040-climate-target-postpones-ets-2-one-year"
      },
      {
        "title": "Regulation (EU) 2026/667: The revised European Climate Law - Sioufas & Associates",
        "url": "https://www.sioufaslaw.gr/regulation-eu-2026-667-the-revised-european-climate-law/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Core 2040-target facts (COM(2025)524 tabled 2 Jul 2025; Council position 5 Nov 2025; trilogue 9 Dec 2025; EP adopted 10 Feb 2026; Council adopted 5 Mar 2026; Reg. 2026/667 OJ 18 Mar 2026) confirmed via CELEX (32026R0667 OK) and cross-checked against omnibus.json's matching entry - unchanged. CORRECTED the reopenedBy 'what' text: pulled the CELEX XML title for 32026R0667 directly (TITLE = 'amending Regulation (EU) 2021/1119 as regards the setting of a Union intermediate climate target for 2040') and confirmed via a law-firm source (Sioufas & Associates) that this Regulation does not itself amend Directive 2003/87/EC. The original entry's implicit claim that this act legally enacts the ETS2 postponement is unsupported; flagged accordingly (focus item 2).",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "just-transition-fund",
    "name": "Just Transition Fund (JTF)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2021/1056",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2021/1056",
    "actDate": "2021-06",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1056",
    "summaryNow": "JTF Regulation 2021/1056 remains in force. It was amended by Reg. (EU) 2025/1914 (18 September 2025) as part of the cohesion-policy mid-term review, adding flexibilities (defence/security, competitiveness, decarbonisation, water resilience, Eastern-border regions) and a 2026 pre-financing top-up. It was earlier amended by the STEP Regulation (EU) 2024/795 (Feb 2024, before the April 2024 baseline).",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Cohesion policy mid-term review",
        "what": "Targeted amendment of ERDF/Cohesion Fund/JTF rules (new flexibilities, pre-financing) adopted as part of the 2025 mid-term review of cohesion policy.",
        "ref": "Reg. (EU) 2025/1914",
        "status": "adopted",
        "date": "2025-09",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R1914"
      }
    ],
    "sources": [
      {
        "title": "Regulation (EU) 2025/1914 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R1914"
      },
      {
        "title": "Cohesion policy mid-term review: Council and Parliament strike a deal - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/07/15/cohesion-policy-mid-term-review-council-and-parliament-strike-a-deal-to-better-address-current-and-emerging-challenges/"
      },
      {
        "title": "Regulation (EU) 2021/1056 establishing the Just Transition Fund, amended by Reg. 2024/795 and 2025/1914 - Climate Change Laws of the World",
        "url": "https://climate-laws.org/document/regulation-eu-2021-1056-establishing-the-just-transition-fund_af44"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed for both 32021R1056 and 32025R1914 (celex_report: both OK). Independently confirmed via WebSearch that Reg. (EU) 2025/1914 of 18 Sep 2025 amends BOTH Reg. (EU) 2021/1058 (ERDF/Cohesion Fund) and Reg. (EU) 2021/1056 (JTF) - celex_report's parsed title only showed the ERDF/CF regulation, which could have suggested JTF was not actually touched, but this is resolved: the JTF is explicitly named as one of the two regulations amended. Entry accurate as written.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "energy-efficiency-recast",
    "name": "Recast of the Energy Efficiency Directive (EED)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2023/1791",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2023/1791",
    "actDate": "2023-07",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L1791",
    "summaryNow": "EED recast Dir. 2023/1791 in force since Oct 2023; national transposition deadline 11 October 2025. It has been named as a candidate for the Commission's 2025-2026 simplification omnibus framework, but no amending proposal has been tabled as of July 2026.",
    "reopened": false,
    "sources": [
      {
        "title": "Energy Efficiency Directive 2023/1791: 2026 Deadline - Wattnow",
        "url": "https://wattnow.io/2026/03/16/energy-efficiency-directive-2023-1791-2026-deadline-anticipate-transposition/"
      },
      {
        "title": "Energy Efficiency Directive: EU company obligations from 2026 to 2030 - Wirtek",
        "url": "https://www.wirtek.com/blog/energy-efficiency-directive-eu-company-obligations-from-2026-to-2030"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32023L1791 OK). Checked omnibus.json's Omnibus XII flag ('potentially touches Ecodesign/Energy Labelling or Energy Taxation files ... flag for the relevant policy-area agent') directly: COM(2026)565 (24 Jun 2026) in fact amends only the Energy Labelling Framework Regulation (EU) 2017/1369 and the Tyre Labelling Regulation (EU) 2020/740 - neither is an Annex-2 climate-energy baseline item, and it does not touch the EED. No missed reopening.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "f-gas-regulation",
    "name": "Regulation on fluorinated greenhouse gases (F-gas)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2024/573",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/573",
    "actDate": "2024-02",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0573",
    "summaryNow": "F-gas Reg. 2024/573 has been in force since 11 March 2024, phasing down HFCs per the Kigali Amendment and repealing Reg. 517/2014. No reopening or amending proposal found as of July 2026.",
    "reopened": false,
    "sources": [
      {
        "title": "EU Regulations 2024/573 and 2024/590 - S-GE",
        "url": "https://www.s-ge.com/export/en/articles/news/eu-regulations-2024573-fluorinated-greenhouse-gases-and-2024590-substances-deplete"
      },
      {
        "title": "European Union: New Rules to Reduce Fluorinated Gases and Ozone-Depleting Substance Emissions Adopted - Library of Congress",
        "url": "https://www.loc.gov/item/global-legal-monitor/2024-03-26/european-union-new-rules-to-reduce-fluorinated-gases-and-ozone-depleting-substance-emissions-adopted/"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R0573 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "ods-regulation",
    "name": "Regulation on substances that deplete the ozone layer (ODS)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2024/590",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/590",
    "actDate": "2024-02",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0590",
    "summaryNow": "ODS Reg. 2024/590 has been in force since 11 March 2024, replacing Reg. 1005/2009. No reopening or amending proposal found as of July 2026.",
    "reopened": false,
    "sources": [
      {
        "title": "EU Regulations 2024/573 and 2024/590 - S-GE",
        "url": "https://www.s-ge.com/export/en/articles/news/eu-regulations-2024573-fluorinated-greenhouse-gases-and-2024590-substances-deplete"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R0590 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "effort-sharing-revision",
    "name": "Revision of Effort Sharing Regulation (ESR)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/857",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/857",
    "actDate": "2023-04-19",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0857",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-review-of-the-effort-sharing-regulation",
    "summaryNow": "ESR Reg. 2023/857 (2030 target -40% vs 2005) remains in force. No amending proposal reopening the Regulation was found as of July 2026; a post-2030 ESR revision aligned with the new 2040 target is anticipated following Reg. (EU) 2026/667 but has not been tabled.",
    "reopened": false,
    "sources": [
      {
        "title": "About Effort Sharing - Climate Action, European Commission",
        "url": "https://climate.ec.europa.eu/eu-action/carbon-removals-and-carbon-farming/effort-sharing-member-states-emission-targets/about-effort-sharing_en"
      },
      {
        "title": "Review of the Effort-Sharing Regulation - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-review-of-the-effort-sharing-regulation"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32023R0857 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "lulucf-revision",
    "name": "Revision of LULUCF Regulation",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/839",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/839",
    "actDate": "2023-04",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0839",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-lulucf-revision",
    "summaryNow": "LULUCF Reg. 2023/839 remains in force and is now entering its second compliance period (2026-2030) with a Member-State 'budget' mechanism and simplified accounting. No amending proposal reopening the Regulation was found as of July 2026; a Commission review was foreseen but no legislative act has resulted yet.",
    "reopened": false,
    "sources": [
      {
        "title": "LULUCF Regulation - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-lulucf-revision"
      },
      {
        "title": "LULUCF Regulation - Land Use & Carbon Removal Targets - Carbon Gap tracker",
        "url": "https://tracker.carbongap.org/policy/lulucf-regulation/"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32023R0839 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "res-directive-revision",
    "name": "Revision of the Renewable Energy Directive (RED III)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2023/2413",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2023/2413",
    "actDate": "2023-10-18",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413",
    "summaryNow": "RED III (Dir. 2023/2413) in force since Nov 2023; Member States had to designate renewables acceleration areas by 21 February 2026. It has been named as a candidate for the Commission's simplification omnibus framework, but no amending proposal has been tabled as of July 2026.",
    "reopened": false,
    "sources": [
      {
        "title": "Last updated: December 1st 2025 - Renewable Energy Directive - Clean Hydrogen Observatory",
        "url": "https://observatory.clean-hydrogen.europa.eu/eu-policy/renewable-energy-directive"
      },
      {
        "title": "'Red alert': EU Renewable Energy Directive's third edition rolls out - Lexology",
        "url": "https://www.lexology.com/library/detail.aspx?g=e2293859-0bba-40e8-9321-b5da070fe0e2"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32023L2413 OK, though the mechanically-parsed title in celex_report reflects the base RED II Dir. 2018/2001 consolidation artefact rather than the amending Dir. 2023/2413's own title - the CELEX identifier itself is verified to exist and is the correct RED III reference). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "social-climate-fund",
    "name": "Social Climate Fund",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/955",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/955",
    "actDate": "2023-05",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0955",
    "summaryNow": "The Social Climate Fund (2026-2032) established by Reg. (EU) 2023/955 remains in force and Member States' Social Climate Plans were being implemented through 2025-2026. In November 2025 Council and Parliament agreed to postpone the launch of ETS2 (buildings/road-transport emissions trading, which the Fund is designed to cushion) by one year to 2028; in February 2026 the EIB approved a EUR 3bn 'ETS2 Frontloading Facility' to let early-moving Member States pre-finance SCF-type investments before 2028. No source confirms that Regulation (EU) 2023/955's own text (funding envelope/timeline) was formally amended -- the confirmed change is to the ETS2 start date in Directive 2003/87/EC -- so 'reopened' is recorded as false for the Fund Regulation itself pending a citable amending act.",
    "reopened": false,
    "sources": [
      {
        "title": "Social Climate Fund | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-social-climate-fund"
      },
      {
        "title": "ETS2 delayed to 2028 – a major impact on HVAC",
        "url": "https://www.rehva.eu/news/article/ets2-delayed-to-2028-a-major-impact-on-hvac"
      },
      {
        "title": "PARLIAMENT AND COUNCIL AGREES TO POSTPONE ETS2 IMPLEMENTATION TO 2028 - CLECAT",
        "url": "https://www.clecat.org/en/news/newsletters/parliament-and-council-agrees-to-postpone-ets2-imp"
      },
      {
        "title": "Delivering the ETS2: Do or die time for the European Union - Institut Delors",
        "url": "https://institutdelors.eu/content/uploads/2025/11/PP317_ETS2_Nguyen_EN.pdf"
      },
      {
        "title": "Open letter on protecting the Social Climate Fund, following the suggestion to postpone ETS2",
        "url": "https://eeb.org/en/library/open-letter-on-protecting-the-social-climate-fund-following-the-suggestion-to-postpone-ets2/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023R0955 confirmed OK in celex_report. Omnibus.json independently confirms the same caveat (exact ETS2-delay amending-act number for Dir. 2003/87/EC not found by either research pass) -- treating reopened=false here is the correct, consistent call. No changes made.",
    "areas": [
      "climate-energy",
      "transport"
    ],
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-social-climate-fund",
    "reopenedBy": []
  },
  {
    "id": "repowereu-amendments",
    "name": "Amendments to Renewable Energy, Energy Performance of Buildings and Energy Efficiency Directives (REPowerEU)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)222 final",
    "statusNow": "withdrawn",
    "actRef": "None - proposal formally withdrawn; RED/EED objectives already delivered separately via Dir. (EU) 2023/2413 and Dir. (EU) 2023/1791; EPBD objectives via Dir. (EU) 2024/1275",
    "actDate": "2025-10-06",
    "eurlexUrl": "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2022/0160(COD)",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-repower-eu-plan-legislative-proposals",
    "summaryNow": "CORRECTED: the Commission's REPowerEU omnibus proposal COM(2022)222 (procedure 2022/0160(COD)) to amend RED, EPBD and EED was formally WITHDRAWN by the Commission on 6 October 2025 - confirmed directly via the OEIL procedure file, whose status reads 'Procedure lapsed or withdrawn' with a key event 'Proposal withdrawn by Commission' dated 06/10/2025 (EP had adopted a first-reading position back on 14 Dec 2022, but Council negotiations never concluded). Its underlying policy objectives were, in the meantime, achieved through separate, already-adopted legislation: the RED and EED elements were absorbed into RED III (Dir. 2023/2413, adopted Oct 2023) and the EED recast (Dir. 2023/1791, adopted July 2023) - both listed as separate 'adopted' baseline entries in the same April 2024 Annex 2 table - while the EPBD element concluded as Dir. (EU) 2024/1275 (24 April 2024). COM(2022)222 itself never became law and no longer has an active legislative procedure.",
    "reopened": false,
    "sources": [
      {
        "title": "REPower EU plan legislative proposal - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-repower-eu-plan-legislative-proposals"
      },
      {
        "title": "Renewable Energy, Energy Performance of Buildings and Energy Efficiency Directives: amendments (REPowerEU) - OEIL",
        "url": "https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1704920"
      },
      {
        "title": "Procedure file 2022/0160(COD) - REPowerEU RED/EPBD/EED amendments - OEIL",
        "url": "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2022/0160(COD)"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CORRECTED (focus item 4). Directly fetched OEIL procedure file 2022/0160(COD): status 'Procedure lapsed or withdrawn', key event 'Proposal withdrawn by Commission' dated 06/10/2025. Changed statusNow from 'adopted' (a mischaracterisation - COM(2022)222 was never itself enacted as a standalone act) to 'withdrawn', while retaining the correct underlying point that its substance was delivered via the separately-adopted RED III / EED-recast / EPBD-recast directives, which remain listed as their own 'adopted' baseline entries.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "carbon-removals-certification",
    "name": "Carbon Removals and Carbon Farming Certification Framework (CRCF)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)672 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/3012",
    "actDate": "2024-11-27",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/3012/oj/eng",
    "summaryNow": "Adopted as Reg. (EU) 2024/3012 of 27 November 2024 (entered into force 26 December 2024), establishing the EU's voluntary CRCF certification framework for permanent carbon removals, carbon farming and carbon storage in products. First secondary legislation followed: Implementing Reg. (EU) 2025/2358 and a February 2026 delegated act on permanent-removal methodologies.",
    "reopened": false,
    "sources": [
      {
        "title": "Commission adopts rules and launches initiatives to boost carbon removals and carbon farming - Climate Action",
        "url": "https://climate.ec.europa.eu/news-other-reads/news/commission-adopts-rules-and-launches-initiatives-boost-carbon-removals-and-carbon-farming-eu-2025-12-01_en"
      },
      {
        "title": "Carbon Removals and Carbon Farming (CRCF) Regulation (EU) 2024/3012 - European Accreditation",
        "url": "https://european-accreditation.org/carbon-removals-and-carbon-farming-crcf-regulation-eu-2024-3012/"
      },
      {
        "title": "EU CRCF Explained - Carbon Gap tracker",
        "url": "https://tracker.carbongap.org/policy/crcf/"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R3012 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "epbd-recast",
    "name": "Recast Energy Performance of Buildings Directive (EPBD)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)802 final",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/1275",
    "actDate": "2024-04-24",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/spotlight-JD22/file-revision-of-the-energy-performance-of-buildings-directive",
    "summaryNow": "Adopted as Dir. (EU) 2024/1275 of 24 April 2024 (OJ 8 May 2024, in force 28 May 2024); recasts the EPBD with zero-emission-building requirements, whole-life-carbon assessment and a 2050 decarbonised-stock goal. Member States must transpose most provisions by 29 May 2026. No reopening found.",
    "reopened": false,
    "sources": [
      {
        "title": "Directive (EU) 2024/1275 - IEA policy database",
        "url": "https://www.iea.org/policies/21254-directive-eu-20241275-of-the-european-parliament-and-of-the-council-of-24-april-2024-on-the-energy-performance-of-buildings-recast"
      },
      {
        "title": "Directive - EU - 2024/1275 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/1275/oj/eng"
      },
      {
        "title": "Energy Performance of Buildings Directive 2024 - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Energy_Performance_of_Buildings_Directive_2024"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024L1275 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "electricity-market-design",
    "name": "Reform of the Electricity Market Design (EMD)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)148 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1747 and Dir. (EU) 2024/1711",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/1747/oj/eng",
    "summaryNow": "Adopted as Reg. (EU) 2024/1747 (amending Regs (EU) 2019/942 and 2019/943) and Dir. (EU) 2024/1711 (amending Dir. (EU) 2019/944), both of 13 June 2024, published OJ 26 June 2024, in force 16 July 2024 - the Electricity Market Design reform improving price stability, PPAs/CfDs uptake and consumer protection.",
    "reopened": false,
    "sources": [
      {
        "title": "Regulation - EU - 2024/1747 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/1747/oj/eng"
      },
      {
        "title": "The European Parliament and Council adopt Regulation 2024/1747 and Directive 2024/1711 - Concurrences",
        "url": "https://www.concurrences.com/en/review/issues/no-3-2024/chroniques/regulations/energy-the-european-parliament-and-council-adopt-regulation-2024-1747-and"
      },
      {
        "title": "Electricity Market Design Reforms: Regulation and Directive published in Official Journal - Practical Law",
        "url": "https://uk.practicallaw.thomsonreuters.com/w-043-7286?transitionType=Default&contextData=(sc.Default)"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R1747 OK). Not listed among actsReopened in omnibus.json. timing2024='delayed' consistent with Annex 2 p.112 note that this file was 'Planned for Q1/2023 (but no initial schedule by strategies available)'.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "methane-regulation",
    "name": "Regulation to prevent methane leakage in the energy sector",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)805 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1787",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787",
    "legTrainUrl": "https://www.europarl.europa.eu/news/it/press-room/20240408IPR20309/methane-parliament-adopts-new-law-to-reduce-emissions-from-energy-sector",
    "summaryNow": "Adopted as Reg. (EU) 2024/1787 of 13 June 2024 (OJ 15 July 2024, in force 4 August 2024) on methane emissions in the energy sector, with MRV, LDAR and venting/flaring obligations staggered through 2030 and import requirements from 2027/2030.",
    "reopened": false,
    "sources": [
      {
        "title": "Reducing methane emissions in the energy sector - EUR-Lex",
        "url": "https://eur-lex.europa.eu/EN/legal-content/summary/reducing-methane-emissions-in-the-energy-sector.html"
      },
      {
        "title": "Regulation (EU) 2024/1787 - Climate Change Laws of the World",
        "url": "https://climate-laws.org/document/regulation-eu-2024-1787-on-the-reduction-of-methane-emissions-in-the-energy-sector-and-amending-regulation-eu-2019-942-the-methane-regulation_260d"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R1787 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "hydrogen-gas-directive",
    "name": "Revision of hydrogen/gas Directive",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)803 final",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/1788",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202401788",
    "summaryNow": "Adopted as Dir. (EU) 2024/1788 of 13 June 2024 (published OJ 15 July 2024), part of the Hydrogen and Decarbonised Gas Market Package; recasts common rules for renewable gas, natural gas and hydrogen markets and repeals Dir. 2009/73/EC. Member States have until mid-2026 to transpose.",
    "reopened": false,
    "sources": [
      {
        "title": "EU introduces new Hydrogen and Decarbonized Gas Market Package - Cleary Gottlieb",
        "url": "https://www.clearygottlieb.com/news-and-insights/publication-listing/eu-introduces-new-hydrogen-and-decarbonized-gas-market-package"
      },
      {
        "title": "Directive (EU) 2024/1788 - Climate Policy Database",
        "url": "https://climatepolicydatabase.org/policies/directive-eu-20241788-common-rules-internal-markets-renewable-gas-natural-gas-and-hydrogen"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024L1788 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "hydrogen-gas-regulation",
    "name": "Revision of hydrogen/gas Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)804 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1789",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/1789/oj/eng",
    "summaryNow": "Adopted as Reg. (EU) 2024/1789 of 13 June 2024 (published OJ 15 July 2024), companion regulation to Dir. 2024/1788 in the Gas Decarbonisation Package, covering network access/tariffs for renewable gas, natural gas and hydrogen and repealing Reg. 715/2009.",
    "reopened": false,
    "sources": [
      {
        "title": "Regulation (EU) 2024/1789 and its impact - Osborne Clarke",
        "url": "https://www.osborneclarke.com/insights/regulation-eu-20241789-and-its-impact-renewable-natural-gas-and-hydrogen-markets"
      },
      {
        "title": "Internal markets for renewable gas, natural gas and hydrogen - EUR-Lex",
        "url": "https://eur-lex.europa.eu/EN/legal-content/summary/internal-markets-for-renewable-gas-natural-gas-and-hydrogen.html"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX confirmed (32024R1789 OK). Not listed among actsReopened in omnibus.json.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "energy-taxation-directive",
    "name": "Revision of the Energy Taxation Directive (ETD)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)563 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52021PC0563",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-energy-taxation-directive",
    "summaryNow": "Still pending in Council under the unanimity-requiring consultation procedure (CNS), more than 5 years after being tabled. In Parliament (ECON, rapporteur Johan Van Overtveldt), committee opinions were issued through 2025-2026 (ITRE Feb 2025, TRAN June 2025, PECH Oct 2025, AGRI Nov 2025); directly re-checked via OEIL as of this session, EP is still 'awaiting committee decision' - no final EP position or Council agreement yet, and the procedure has NOT been withdrawn.",
    "reopened": false,
    "sources": [
      {
        "title": "Revision of the Energy Taxation Directive - EP Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-energy-taxation-directive"
      },
      {
        "title": "OEIL procedure file - Energy Taxation Directive",
        "url": "https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2021/0213(CNS)"
      }
    ],
    "verification": "verified",
    "checkNotes": "Focus item 5: re-fetched OEIL procedure file 2021/0213(CNS) directly - confirmed status 'awaiting committee decision', latest event AGRI opinion 07 Nov 2025 (matches dataset's claim), ECON still responsible committee, no adoption. Confirmed NOT on the Commission's withdrawn-proposals track (unlike the REPowerEU file - see repowereu-amendments entry). Also checked Omnibus XI (taxation simplification, COM(2026)560, 24 Jun 2026): covers only direct corporate-tax directives (Interest & Royalties, Tax Merger, Parent-Subsidiary, ATAD, Dispute Resolution) - does not touch the Energy Taxation Directive. No 2026 development found beyond continued committee process.",
    "areas": [
      "climate-energy"
    ]
  },
  {
    "id": "afir",
    "name": "Alternative Fuels Infrastructure Regulation (AFIR)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/1804",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/1804",
    "actDate": "2023-09-13",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1804",
    "summaryNow": "AFIR applies EU-wide since 13 April 2024. Since then the Commission has adopted supporting implementing acts (e.g. an April 2025 implementing regulation on interoperable/real-time alternative-fuels-infrastructure data) and Member States had to resubmit National Policy Frameworks by January 2025; a consolidated AFIR text dated 2025-04-14 exists reflecting these implementing measures. No tabled proposal amending the base Regulation's text was found, so it is not recorded as reopened.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Deployment of alternative fuels infrastructure | EUR-Lex summary",
        "url": "https://eur-lex.europa.eu/EN/legal-content/summary/deployment-of-alternative-fuels-infrastructure.html"
      },
      {
        "title": "Consolidated text, Regulation 2023/1804, 2025-04-14",
        "url": "https://eur-lex.europa.eu/eli/reg/2023/1804/2025-04-14/eng"
      },
      {
        "title": "Commission enhances interoperability and transparency of alternative fuels infrastructure data",
        "url": "https://transport.ec.europa.eu/news-events/news/commission-enhances-interoperability-and-transparency-alternative-fuels-infrastructure-data-2025-04-11_en"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023R1804 confirmed OK in celex_report with matching title. No omnibus.json entry reopens AFIR. No changes made.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "co2-cars-vans",
    "name": "CO2 emission performance standards for new passenger cars and light commercial vehicles",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/851",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/851",
    "actDate": "2023-04",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0851",
    "summaryNow": "Reg. (EU) 2023/851 (amending Reg. 2019/631) is in force but has been amended/reopened twice since April 2024. First, Regulation (EU) 2025/1214 introduced 3-year fleet averaging (2025-2027); confirmed via cellar record: date of the act is 17 June 2025, published in the OJ on 19 June 2025 (EP adopted 2 May 2025; Council gave final approval 27 May 2025). Second, on 16 December 2025 the Commission tabled COM(2025) 995, a proposal amending Regulation (EU) 2019/631 as regards CO2 emission performance standards for new light-duty vehicles and vehicle labelling and repealing Directive 1999/94/EC (confirmed verbatim from the EU Publications Office record) -- this is the 'Automotive Package' proposal to replace the 2035 100%-zero-emission target with a 90% tailpipe-CO2-reduction target (remaining 10% offsettable via e-fuels/biofuels/EU low-carbon steel), plus a reduced 2030 vans target (40% instead of 50%) and small-EV 'super-credits'; still in the ordinary legislative procedure as of July 2026.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "2025-2027 CO2 flexibility",
        "what": "Amends Reg. 2019/631 to allow manufacturers to average compliance with 2025 car/van CO2 targets over 2025-2027 instead of judging 2025 alone",
        "ref": "Regulation (EU) 2025/1214",
        "status": "adopted",
        "date": "2025-06",
        "url": "https://ec.europa.eu/commission/presscorner/detail/en/ip_25_854"
      },
      {
        "pkg": "Automotive Package (Dec 2025)",
        "what": "Proposes to replace the 2035 100% zero-emission target for cars/vans with a 90% CO2 reduction target, revise vehicle-labelling rules and repeal Directive 1999/94/EC",
        "ref": "COM(2025) 995",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://commission.europa.eu/news-and-media/news/taking-action-clean-and-competitive-automotive-sector-2025-12-16_en"
      }
    ],
    "sources": [
      {
        "title": "Commission proposes flexibility to help manufacturers comply with 2025 CO2 emission targets for new cars and vans",
        "url": "https://ec.europa.eu/commission/presscorner/detail/en/ip_25_854"
      },
      {
        "title": "An amendment to the CO2 standards for new passenger cars and vans in the European Union",
        "url": "https://theicct.org/publication/policy-update-co2-standards-cars-amendment-jun25/"
      },
      {
        "title": "Taking action for a clean and competitive automotive sector",
        "url": "https://commission.europa.eu/news-and-media/news/taking-action-clean-and-competitive-automotive-sector-2025-12-16_en"
      },
      {
        "title": "Automotive Package delivers first important step to amending CO2 legislation for cars and vans - ACEA",
        "url": "https://www.acea.auto/press-release/automotive-package-delivers-first-important-step-to-amending-co2-legislation-for-cars-and-vans/"
      },
      {
        "title": "Unwrapping the package: A review of the European Commission's CO2 standards proposal - ICCT",
        "url": "https://theicct.org/publication/european-commissions-risks-and-opportunities-of-the-proposed-co2-standards-dec25/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 52025PC0995 (title confirmation)",
        "url": "http://publications.europa.eu/resource/celex/52025PC0995"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32025R1214 (dates confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32025R1214"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Cellar-curled 32025R1214: exists, date-of-act 2025-06-17, OJ publication 2025-06-19 -- corrected reopenedBy[0].date from '2025-05' (a political-approval date, not the act's own date) to '2025-06'. Cellar-curled 52025PC0995: exists, title exactly 'amending Regulation (EU) 2019/631 as regards CO2 emission performance standards for new light duty vehicles and vehicle labelling and repealing Directive 1999/94/EC' -- confirms COM(2025) 995 is real and on-topic; added this detail to the summary. Omnibus.json cross-check: matches its 'CO2 cars/vans 2025-2027 fleet-averaging flexibility' package (also cites Reg. 2025/1214) and 'Omnibus IX - Automotive package' entry.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "ets-corsia-notification",
    "name": "ETS amendment on CORSIA notification (aircraft operators)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dec. (EU) 2023/136",
    "statusNow": "adopted",
    "actRef": "Dec. (EU) 2023/136",
    "actDate": "2023-01-18",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023D0136",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-notification-on-international-aviation-carbon-offsetting-and-reduction-scheme",
    "summaryNow": "Decision (EU) 2023/136 (amending Dir. 2003/87/EC on CORSIA notification for EU-based aircraft operators) remains in force; it keeps EU ETS applying to intra-EEA flights and CORSIA to extra-EEA flights until end-2026. On 17 July 2026 the Commission's mandatory CORSIA effectiveness assessment found participating states cover under 70% of international aviation emissions and published a broader EU ETS revision, COM(2026) 616 (confirmed to exist, tabled 17.7.2026), that reshapes the aviation-ETS/CORSIA scope from 2027 onward -- but no source names Decision 2023/136 itself as a specific amendment target, so 'reopened' is left false; see the ets-aviation entry for the linked COM(2026) 616 proposal.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Notification on the Carbon Offsetting and Reduction Scheme for International Aviation (CORSIA) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-fit-for-55/file-notification-on-international-aviation-carbon-offsetting-and-reduction-scheme"
      },
      {
        "title": "Decision (EU) 2023/136 amending Directive 2003/87/EC as regards notification of offsetting (CORSIA)",
        "url": "https://www.europeansources.info/record/decision-eu-2023-136-amending-directive-2003-87-ec-as-regards-the-notification-of-offsetting-in-respect-of-a-global-market-based-measure-for-aircraft-operators-based-in-the-union/"
      },
      {
        "title": "COM(2026) 616 final (17.7.2026), EU ETS revision",
        "url": "https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en"
      },
      {
        "title": "International aviation: Will the EU restart the clock?",
        "url": "https://www.carbone4.com/en/international-aviation-will-the-eu-restart-the-clock"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023D0136 confirmed OK in celex_report and matches Annex-2 baseline ('ETS as regards notification on CORSIA Dec. (EU) 2023/136'). Cautious reopened=false is appropriate: no source found ties COM(2026)616 to this specific Decision. No changes made.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "fueleu-maritime",
    "name": "FuelEU Maritime",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/1805",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/1805",
    "actDate": "2023-09",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805",
    "summaryNow": "FuelEU Maritime monitoring obligations applied from 1 January 2025. As part of the 17 July 2026 EU ETS-for-shipping package, the Commission tabled a companion proposal, COM(2026) 620 (confirmed to exist, tabled 17.7.2026), amending Regulation (EU) 2023/1805 itself: it replaces the standalone FuelEU 'company' definition with the EU-ETS 'shipping company' concept, renames 'FuelEU report' to 'MRV report' throughout, amends several Article 3 definitions (e.g. 'substitute sources of energy'), expands the regulatory perimeter (incl. offshore operations and more ship categories) and creates a new allowance-based support mechanism for sustainable fuels/zero-emission propulsion. Per Commission/legal-adviser commentary, COM(2026) 620 was separated from the main ETS proposal (COM(2026) 616) purely for reasons of legal form and is meant to be considered together with it.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "EU ETS-for-shipping package",
        "what": "Proposal amending Regulation (EU) 2023/1805 to align definitions/terminology with the EU ETS 'shipping company' concept and consolidate MRV and FuelEU reporting",
        "ref": "COM(2026) 620",
        "status": "proposed",
        "date": "2026-07-17",
        "url": "https://climate.ec.europa.eu/document/download/2a0f3e9c-5562-4253-8327-dc7bea886ed8_en"
      }
    ],
    "sources": [
      {
        "title": "COM(2026) 620 final (17.7.2026)",
        "url": "https://climate.ec.europa.eu/document/download/2a0f3e9c-5562-4253-8327-dc7bea886ed8_en"
      },
      {
        "title": "EU ETS revision for shipping: the key changes for maritime compliance",
        "url": "https://www.bettersea.tech/post/eu-ets-revision-for-shipping-the-key-changes-for-maritime-compliance"
      },
      {
        "title": "The FuelEU Maritime Regulation: Emission Reduction of Fuels in Shipping",
        "url": "https://carboneer.earth/en/2025/08/fueleu-maritime-compliance-2025/"
      },
      {
        "title": "FAQ: FuelEU Maritime Regulation - EMSA",
        "url": "https://www.emsa.europa.eu/reducing-emissions/fuel-eu-maritime-regulation/faq-fueleu-maritime-regulation.html"
      },
      {
        "title": "EU ETS Maritime and FuelEU in 2026: Why This Year Matters",
        "url": "https://cse-net.org/eu-ets-maritime-and-fueleu-in-2026-why-this-year-matters/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023R1805 confirmed OK in celex_report. WebSearch confirms COM(2026) 620 exists (Commission document dated Brussels 17.7.2026) and is exactly the FuelEU-Maritime/MRV consolidation amendment described. No changes needed.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "its-directive",
    "name": "Intelligent Transport Systems Directive revision (incl. multimodal ticketing)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2023/2661",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2023/2661",
    "actDate": "2023-11-22",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2661",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-intelligent-transport-systems-directive-review",
    "summaryNow": "Directive (EU) 2023/2661 (amending the ITS Directive 2010/40/EU to cover multimodal ticketing/booking apps and connected/automated mobility) had to be transposed into national law by 21 December 2025; the Commission's delegated-act work programme was due by 21 December 2024. No amending proposal to the Directive itself was found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Review of the Directive 2010/40/EU on ITS | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-intelligent-transport-systems-directive-review"
      },
      {
        "title": "Council adopts new framework to boost the roll-out of intelligent transport systems",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2023/10/23/council-adopts-new-framework-to-boost-the-roll-out-of-intelligent-transport-systems/"
      },
      {
        "title": "Directive (EU) 2023/2661 amending Directive 2010/40/EU",
        "url": "https://www.europeansources.info/record/proposal-for-a-directive-amending-directive-2010-40-eu-on-the-framework-for-the-deployment-of-intelligent-transport-systems-in-the-field-of-road-transport-and-for-interfaces-with-other-modes-of-transp/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023L2661 confirmed OK in celex_report with matching title. No omnibus.json entry reopens this Directive. No changes made.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "refueleu-aviation",
    "name": "RefuelEU Aviation",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/2405",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/2405",
    "actDate": "2023-10-31",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2405",
    "summaryNow": "ReFuelEU Aviation has applied since 1 January 2024, with SAF-blending obligations (Articles 4-6, 8, 10) applying from 1 January 2025 (2% SAF blending, rising to 70% by 2050); Switzerland aligned its rules from 1 January 2026. No amending proposal to the base Regulation was found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "ReFuelEU aviation - Mobility and Transport",
        "url": "https://transport.ec.europa.eu/transport-modes/air/environment/refueleu-aviation_en"
      },
      {
        "title": "ReFuelEU Aviation - EASA digital reporting tool",
        "url": "https://www.easa.europa.eu/en/domains/environment/refueleu-aviation-digital-reporting-tool"
      },
      {
        "title": "RefuelEU aviation – sustainable air transport | EUR-Lex summary",
        "url": "https://eur-lex.europa.eu/EN/legal-content/summary/refueleu-aviation-sustainable-air-transport.html"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32023R2405 confirmed OK in celex_report with matching title. No omnibus.json entry reopens this act. No changes made.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "ten-e",
    "name": "Trans-European Energy Networks Regulation (TEN-E)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2022/869",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2022/869",
    "actDate": "2022-05",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0869",
    "summaryNow": "Regulation (EU) 2022/869 on guidelines for trans-European energy infrastructure remains in force. On 10 December 2025 the Commission tabled COM(2025) 1006, part of the 'Grid Package', a proposal for a Regulation on guidelines for trans-European energy infrastructure amending Regulations (EU) 2019/942, (EU) 2019/943 and (EU) 2024/1789 and repealing Regulation (EU) 2022/869 -- confirmed verbatim from the EU Publications Office record for CELEX 52025PC1006. Trilogue-preparation/Council working-party texts were circulating March 2026.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "TEN-E recast / Grid Package",
        "what": "Commission proposal for a new Regulation on guidelines for trans-European energy infrastructure, amending Regs. (EU) 2019/942, (EU) 2019/943 and (EU) 2024/1789 and repealing Regulation (EU) 2022/869",
        "ref": "COM(2025) 1006",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://epthinktank.eu/2026/01/26/guidelines-for-trans-european-energy-infrastructure-revision-of-the-ten-e-regulation-eu-legislation-in-progress/"
      }
    ],
    "sources": [
      {
        "title": "Guidelines for trans-European energy infrastructure: Revision of the TEN-E Regulation [EU Legislation in Progress]",
        "url": "https://epthinktank.eu/2026/01/26/guidelines-for-trans-european-energy-infrastructure-revision-of-the-ten-e-regulation-eu-legislation-in-progress/"
      },
      {
        "title": "COM(2025) 1006 draft TEN-E proposal text",
        "url": "https://table.media/assets/europa/20251205_gridpackage/20251205_ten-e.pdf"
      },
      {
        "title": "TEN-E Regulation – EU Energy Networks & CO2 Transport",
        "url": "https://tracker.carbongap.org/policy/ten-e-regulation/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 52025PC1006 (title confirmation)",
        "url": "http://publications.europa.eu/resource/celex/52025PC1006"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base act 32022R0869 confirmed OK in celex_report with matching title. Cellar-curled CELEX 52025PC1006 directly: it exists and its official title is 'Proposal for a REGULATION ... on guidelines for trans-European energy infrastructure, amending Regulations (EU) 2019/942, (EU) 2019/943 and (EU) 2024/1789 and repealing Regulation (EU) 2022/869' -- matches the entry's claim exactly. No changes needed.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "ghg-transport-accounting",
    "name": "Accounting of greenhouse gas emissions of transport services (CountEmissions EU)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)441 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2026/1030",
    "actDate": "2026-04-29",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32026R1030",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/carriage/measurement-of-transport-and-logistics-emissions/report?sid=8001",
    "summaryNow": "Adopted as Regulation (EU) 2026/1030 of 29 April 2026 on the greenhouse gas emissions accounting of transport services ('CountEmissions EU'), published in the OJ on 12 May 2026 (confirmed by direct cellar lookup: title is exactly 'REGULATION ... ON THE GREENHOUSE GAS EMISSIONS ACCOUNTING OF TRANSPORT SERVICES'), based on the EN ISO 14083:2023 methodology; rules are set to apply from December 2030 for transport operators, logistics organisers, hub operators and emissions-data intermediaries. Given how recent the act is, no reopening was found or expected.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "COM(2023)441 - Accounting of greenhouse gas emissions of transport services - EU Monitor",
        "url": "https://www.eumonitor.eu/9353000/1/j9vvik7m1c3gyxp/vm4ph56j4zxy"
      },
      {
        "title": "Regulation - EU - 2026/1030 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32026R1030"
      },
      {
        "title": "OJ: Regulation on greenhouse gas emissions accounting of transport services - EU Law Live",
        "url": "https://eulawlive.com/oj-regulation-on-greenhouse-gas-emissions-accounting-of-transport-services/"
      },
      {
        "title": "Legislative Train: measurement of transport and logistics emissions",
        "url": "https://www.europarl.europa.eu/legislative-train/carriage/measurement-of-transport-and-logistics-emissions/report?sid=8001"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32026R1030 (title/date confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32026R1030"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 8 (partial): cellar-curled CELEX 32026R1030 directly -- exists, title exact match for CountEmissions EU, date-of-act 2026-04-29 exactly matches the entry's actDate; OJ publication confirmed as 2026-05-12 and added to the summary. No changes to actRef/actDate needed.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "hdv-co2-standards",
    "name": "CO2 emission performance standards for new heavy-duty vehicles",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)88 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1610",
    "actDate": "2024-05-14",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1610",
    "summaryNow": "Adopted as Regulation (EU) 2024/1610 amending Reg. (EU) 2019/1242, dated 14 May 2024 and published in the OJ on 6 June 2024, applying from 1 July 2024 (targets: -45% by 2030, -65% by 2035, -90% by 2040 for heavy trucks; -90%/-100% for urban buses by 2030/2035). The European Parliament approved a targeted flexibility amendment on 12 March 2026 (473 in favour, 81 against, 9 abstentions) and the Council formally adopted it on 30 March 2026; the act was signed 29 April 2026 and published as Regulation (EU) 2026/1046 in the OJ on 7 May 2026 -- confirmed via direct cellar lookup, title 'amending Regulation (EU) 2019/1242 as regards the calculation of emission credits for heavy-duty vehicles for the reporting periods of the years 2025 to 2029'. It gives manufacturers credit-banking flexibility for 2025-2029 without altering the 2030/2035/2040 targets themselves.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "HDV CO2 targeted flexibility",
        "what": "Amends Reg. (EU) 2019/1242 (as amended by 2024/1610) as regards the calculation of emission credits for heavy-duty vehicles for the reporting periods of the years 2025 to 2029, without altering the 2030/2035/2040 targets",
        "ref": "Regulation (EU) 2026/1046",
        "status": "adopted",
        "date": "2026-04",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/30/heavy-duty-vehicles-council-adopts-targeted-flexibility-for-manufacturers-to-comply-with-co2-targets/"
      }
    ],
    "sources": [
      {
        "title": "Regulation - EU - 2024/1610 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/1610/oj"
      },
      {
        "title": "CO2 emission standards for new heavy-duty vehicles: Regulation (EU) 2024/1610 published in Official Journal - Practical Law",
        "url": "https://uk.practicallaw.thomsonreuters.com/w-043-5256"
      },
      {
        "title": "Heavy-duty vehicles: Council adopts targeted flexibility for manufacturers to comply with CO2 targets - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/30/heavy-duty-vehicles-council-adopts-targeted-flexibility-for-manufacturers-to-comply-with-co2-targets/"
      },
      {
        "title": "EU relaxes heavy-duty vehicles' CO2 limits while holding firm on 2030 targets - Brussels Times",
        "url": "https://www.brusselstimes.com/2052732/eu-relaxes-heavy-duty-vehicles-co2-limits-while-holding-firm-on-2030-targets"
      },
      {
        "title": "CLECAT | EUROPEAN PARLIAMENT APPROVES TARGETED AMENDMENT CO2 RULES FOR HDV'S",
        "url": "https://www.clecat.org/news/newsletters/european-parliament-approves-targeted-amendment-co"
      },
      {
        "title": "An amendment to the CO2 standards for new heavy-duty vehicles in the European Union - ICCT",
        "url": "https://theicct.org/publication/an-amendment-to-the-co2-standards-for-new-heavy-duty-vehicles-in-the-eu-jun26/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32026R1046 (act confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32026R1046"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 1 RESOLVED: cellar-curled CELEX 32026R1046 directly -- it EXISTS (does not 404) and its title is 'REGULATION ... amending Regulation (EU) 2019/1242 as regards the calculation of emission credits for heavy-duty vehicles for the reporting periods of the years 2025 to 2029', an exact match for the claimed HDV flexibility amendment. Corrected the chronology, which the researcher had backwards: EP approved the text on 12 March 2026 (473-81-9, per CLECAT), THEN the Council formally adopted it on 30 March 2026 (not 'Council adopted... following EP approval ~21 May 2026' as the draft stated). Corrected actDate/reopenedBy.date from the vague '2026-03' to the act's actual date-of-document (2026-04-29, per cellar record); OJ publication was 2026-05-07. Also corrected the base act 2024/1610's actDate field, which was internally consistent (2024-05-14 = date of the act; OJ publication 2024-06-06, matching the summary text) -- no change needed there, just confirmed via cellar.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "euro-7",
    "name": "Euro 7 vehicle emission and battery durability standards",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2022)586 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1257",
    "actDate": "2024-05-08",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1257",
    "summaryNow": "Adopted as Regulation (EU) 2024/1257 on type-approval with respect to emissions and battery durability (Euro 7), published in the OJ on 8 May 2024; light-duty new-type requirements apply from 29 November 2026 and to all new vehicles from 29 November 2027. On 16 December 2025 the Commission tabled COM(2025) 993, part of the 'Omnibus IX - Automotive' package, a proposal amending Regulations (EC) No 561/2006, (EU) 2018/858, (EU) 2019/2144 and (EU) 2024/1257 as regards the simplification of technical requirements and testing procedures for motor vehicles, and repealing Council Directive 70/157/EEC and Regulation (EU) No 540/2014 (confirmed verbatim from the EU Publications Office record) -- this directly amends the Euro 7 Regulation. Still in the ordinary legislative procedure as of July 2026.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Omnibus IX – Automotive",
        "what": "Simplification proposal amending several type-approval Regulations, including Reg. (EU) 2024/1257 (Euro 7), Reg. (EU) 2019/2144, Reg. (EU) 2018/858 and Reg. (EC) 561/2006, on technical requirements and testing procedures; repeals Dir. 70/157/EEC and Reg. (EU) 540/2014",
        "ref": "COM(2025) 993",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://data.consilium.europa.eu/doc/document/ST-7747-2026-INIT/en/pdf"
      }
    ],
    "sources": [
      {
        "title": "Regulation (EU) 2024/1257 - Climate Policy Database",
        "url": "https://climatepolicydatabase.org/policies/regulation-eu-20241257-type-approval-motor-vehicles-and-engines-and-systems-components-and"
      },
      {
        "title": "Air pollutant emissions: Regulation (EU) 2024/1257 published in OJ - Practical Law",
        "url": "https://uk.practicallaw.thomsonreuters.com/w-043-2548"
      },
      {
        "title": "InterRegs: EU Euro 7 Emissions Regulation Published",
        "url": "https://www.interregs.com/articles/spotlight/266/eu-euro-7-emissions-regulation-published"
      },
      {
        "title": "Council document ST-7747-2026-INIT (Omnibus IX - Automotive)",
        "url": "https://data.consilium.europa.eu/doc/document/ST-7747-2026-INIT/en/pdf"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 52025PC0993 (title confirmation)",
        "url": "http://publications.europa.eu/resource/celex/52025PC0993"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Base act 32024R1257 confirmed OK in celex_report with matching title. Cellar-curled 52025PC0993: exists, title exactly 'amending Regulations (EC) No 561/2006, (EU) 2018/858, (EU) 2019/2144 and (EU) 2024/1257 ... as regards the simplification of technical requirements and testing procedures for motor vehicles and repealing Council Directive 70/157/EEC and Regulation No 540/2014' -- this confirms and pins down the exact COM number the researcher could not find; replaced the placeholder 'Omnibus IX - Automotive (exact COM number not confirmed this session)' with the confirmed 'COM(2025) 993'.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "combined-transport",
    "name": "Revision of the Combined Transport Directive",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)702 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52023PC0702",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-second-review-of-the-combined-transport-directive",
    "summaryNow": "Trilogues stalled over the definition of 'combined transport'; in its 2026 Work Programme (adopted 21 October 2025) the Commission proposed withdrawing this proposal, without prior public consultation according to industry group UIRR. The European Parliament rejected the withdrawal at the end of January 2026. As of June 2026 (per Railway Gazette reporting) the situation remained unresolved, with rail-freight associations lobbying to keep the file alive; no formal withdrawal or adoption has occurred, so the file is recorded as 'ongoing' (contested/stalled) rather than withdrawn.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Review of Directive 92/106/EEC | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-second-review-of-the-combined-transport-directive"
      },
      {
        "title": "EU rail associations scramble to save Combined Transport Directive - Railway Gazette International",
        "url": "https://www.railwaygazette.com/freight/2026/06/04/rail-association-throw-last-hail-mary-to-save-combined-transport-directive/"
      },
      {
        "title": "The Combined Transport Directive might survive after all - RailFreight.com",
        "url": "https://www.railfreight.com/policy/2026/01/29/the-combined-transport-directive-might-survive-after-all/"
      },
      {
        "title": "Europe is considering leaving combined transport out of its 2026 agenda - UIRR",
        "url": "https://www.uirr.com/web-news/europe-considering-leaving-combined-transport-out-its-2026-agenda"
      },
      {
        "title": "ESC regrets withdrawal of Combined Transport Directive Amendment",
        "url": "https://europeanshippers.eu/esc-regrets-withdrawal-of-combined-transport-directive-amendment/"
      },
      {
        "title": "Combined Transport Directive Amendment withdrawal - UIRR",
        "url": "https://www.uirr.com/press-releases-press-release/combined-transport-directive-amendment-withdrawal"
      }
    ],
    "verification": "verified",
    "checkNotes": "Base proposal 52023PC0702 confirmed OK in celex_report. WebSearch independently confirms: Commission's Oct 2025 work programme signalled withdrawal intent, EP rejected it end of January 2026, and the standoff continued through mid-2026 with no formal resolution -- exactly as described. Note: some industry pages use 'withdrawal' loosely for the Commission's announced *intent*, not a completed legal act; kept the cautious 'ongoing (contested/stalled)' framing as the more defensible reading. No status change made.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "river-information-services",
    "name": "Revision of the River Information Services (RIS) Directive",
    "group2024": "ongoing",
    "timing2024": "na",
    "ref2024": "COM(2024)23 final",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2025/2482",
    "actDate": "2025-11-26",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025L2482",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-karin",
    "summaryNow": "Council and Parliament reached political agreement on 26 June 2025; Parliament adopted at first reading on 7 October 2025 and Council on 27 October 2025. Signed as Directive (EU) 2025/2482 on 26 November 2025, published in the OJ on 12 December 2025 (both confirmed by direct cellar lookup, title exactly 'DIRECTIVE ... amending Directive 2005/44/EC on harmonised river information services (RIS) on inland waterways in the Community'), entered into force 1 January 2026; Member States must transpose by 2 January 2029. It amends the original RIS Directive 2005/44/EC to modernise inland-waterway cargo/voyage information exchange.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Co-legislators agree on modernising river information services - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/06/26/co-legislators-agree-on-modernising-river-information-services/"
      },
      {
        "title": "Revision of the directive on harmonised river information services | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-karin"
      },
      {
        "title": "Commission proposes to modernise river information services in EU",
        "url": "https://transport.ec.europa.eu/news-events/news/commission-proposes-modernise-river-information-services-eu-2024-01-29_en"
      },
      {
        "title": "River Information Services Directive review [EU Legislation in Progress]",
        "url": "https://epthinktank.eu/2024/05/30/river-information-services-directive-review-eu-legislation-in-progress/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32025L2482 (title/date confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32025L2482"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 8 (partial): cellar-curled CELEX 32025L2482 directly -- exists, title is an exact match for the RIS Directive revision, date-of-act 2025-11-26 exactly matches actDate, OJ publication confirmed as 2025-12-12. No corrections needed.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "ship-source-pollution",
    "name": "Revision of the Ship-Source Pollution Directive",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)273 final",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/3101",
    "actDate": "2024-11-27",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L3101",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-ship-source-pollution-directive",
    "summaryNow": "Adopted as Directive (EU) 2024/3101 amending Dir. 2005/35/EC, signed 27 November 2024, published in the OJ on 16 December 2024; it entered into force 5 January 2025 and Member States must transpose it by 6 July 2027 (confirmed by direct cellar lookup: procedure-event record shows OJ publication 16 December 2024, and a DATE field of 2027-07-06 matching the transposition deadline exactly). It aligns EU rules with MARPOL and extends scope to more polluting substances (e.g. sewage, garbage) and strengthens sanctions/CleanSeaNet surveillance. No reopening proposal found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive on Ship-Source Pollution Amended - eucrim",
        "url": "https://eucrim.eu/news/directive-on-ship-source-pollution-amended/"
      },
      {
        "title": "Commission welcomes provisional agreement on tackling ship-source pollution",
        "url": "https://transport.ec.europa.eu/news-events/news/commission-welcomes-provisional-agreement-tackling-ship-source-pollution-help-make-european-seas-2024-02-16_en"
      },
      {
        "title": "Revision of the Directive 2005/35/EC | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-ship-source-pollution-directive"
      },
      {
        "title": "Revision of Directive 2005/35/EC on ship-source pollution - Policy Commons",
        "url": "https://policycommons.net/artifacts/4511448/revision-of-directive-200535ec-on-ship-source-pollution-and-on-the-introduction-of-penalties-for-infringements/5321155/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32024L3101 (dates confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32024L3101"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 7 RESOLVED: cellar-curled CELEX 32024L3101 directly. It exists; a procedure-event field explicitly names 16 December 2024 as the OJ-publication date, and a DATE value of 2027-07-06 matches the stated 6 July 2027 transposition deadline exactly. actRef/actDate/dates in the entry are all correct as originally drafted -- no changes needed, only confirmation added.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "ten-t-revision",
    "name": "Revision of the TEN-T Regulation and Rail Freight Corridor Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)812 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1679",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1679",
    "summaryNow": "Adopted as Regulation (EU) 2024/1679 on Union guidelines for the development of the trans-European transport network, amending Regs. (EU) 2021/1153 and (EU) No 913/2010 and repealing Reg. (EU) No 1315/2013; adopted by Parliament and Council on 13 June 2024, applying since 18 July 2024. Core network completion target 2030, extended core network 2040, comprehensive network 2050. Note: the Rail Freight Corridor Regulation (EU) No 913/2010, which this Regulation partly amended, has since itself been repealed in full by the new railway-infrastructure-capacity Regulation (EU) 2026/1184 (see that entry) -- no further amending/reopening proposal targeting Reg. 2024/1679 itself was found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation (EU) 2024/1679 on guidelines for the development of the trans-European transport network - Climate Change Laws of the World",
        "url": "https://climate-laws.org/document/regulation-eu-2024-1679-on-guidelines-for-the-development-of-the-trans-european-transport-network_6f1b"
      },
      {
        "title": "Regulation - EU - 2024/1679 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32024R1679"
      },
      {
        "title": "Trans-European Networks – guidelines | Fact Sheets on the EU - European Parliament",
        "url": "https://www.europarl.europa.eu/factsheets/en/sheet/135/trans-european-networks-guidelines"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Base act 32024R1679 confirmed OK in celex_report with matching title. Added a cross-reference note: Reg. (EU) No 913/2010 (which 2024/1679 amended) is now fully repealed by the newly-adopted Reg. (EU) 2026/1184 (see railway-infrastructure-capacity entry) -- this is informational, not a reopening of 2024/1679 itself, so 'reopened' stays false.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "weights-and-dimensions",
    "name": "Revision of the Weights and Dimensions Directive",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)445 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52023PC0445",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-weights-and-dimensions-directive",
    "summaryNow": "Parliament adopted its first-reading position in March 2024 (TRAN committee report 14 February 2024). The Council reached a general approach on 4 December 2025, focused on a zero-emission-vehicle weight bonus and simplification/digitalisation of procedures; trilogue negotiations began 9 December 2025. As of the second trilogue (around 12 June 2026, Council doc. ST-10393-2026), negotiators reached a provisional agreement only on the narrower issue of vehicle transporters; the broader file (zero-emission-vehicle weight allowances, cross-border rules for longer/heavier vehicles) remained under negotiation with no final agreement confirmed as of July 2026.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Review of Council Directive 96/53/EC | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-weights-and-dimensions-directive"
      },
      {
        "title": "Council approach on Weights and Dimensions: adoption leaves key gaps for zero-emission heavy-duty vehicles - ACEA",
        "url": "https://www.acea.auto/press-release/council-approach-on-weights-and-dimensions-adoption-leaves-key-gaps-for-zero-emission-heavy-duty-vehicles/"
      },
      {
        "title": "Weight & Dimensions Directive: Prioritising Decarbonisation",
        "url": "https://www.platformelectromobility.eu/2026/01/15/weight-dimensions-directive-prioritising-decarbonisation/"
      },
      {
        "title": "Directive on Dimensions and Weights: EU Council Establishes Common Position",
        "url": "https://transport-online.de/en/news/directive-dimensions-and-weights-eu-council-establishes-common-position-186440.html"
      },
      {
        "title": "Trilogues on 'Weights and Dimensions': Europe must not allow unchecked growth of megatrucks - ETSC",
        "url": "https://etsc.eu/trilogues-on-weights-and-dimensions-europe-must-not-allow-unchecked-growth-of-megatrucks/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Base proposal 52023PC0445 confirmed OK in celex_report. Updated summaryNow with the second-trilogue development (~12 June 2026, provisional agreement on vehicle transporters only) found via WebSearch; status remains correctly 'ongoing' since no full deal or final act was found as of July 2026.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "railway-infrastructure-capacity",
    "name": "Use of railway infrastructure capacity",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)443 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2026/1184",
    "actDate": "2026-05-20",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R1184",
    "summaryNow": "ADOPTED: Regulation (EU) 2026/1184 of the European Parliament and of the Council of 20 May 2026 on the use of railway infrastructure capacity in the single European railway area, amending Directive 2012/34/EU and repealing Regulation (EU) No 913/2010, was published in the OJ on 10 June 2026 (confirmed by direct cellar lookup: title matches exactly). Trilogue negotiations concluded with a provisional political agreement on 18-19 November 2025 (three-tier capacity planning system: strategic planning, annual scheduling, adaptation); the European Parliament approved the text in plenary around 20-21 May 2026; the Regulation establishes a European Network of Infrastructure Managers (Enim) and a new European Railway Platform (ERP), and is expected to unlock up to 4% of additional rail capacity (~250 million train-km). Repeal of Reg. 913/2010 takes effect 14 December 2030.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "European Parliament approves regulation on railway infrastructure capacity - Railway Gazette International",
        "url": "https://www.railwaygazette.com/europe/2026/05/21/european-parliament-approves-regulation-on-railway-infrastructure-capacity/"
      },
      {
        "title": "CLECAT | TRILOGUE AGREEMENT ON RAIL CAPACITY REGULATION",
        "url": "https://www.clecat.org/news/newsletters/trilogue-agreement-on-rail-capacity-regulation"
      },
      {
        "title": "Joint Statement - Council Position on Railway Infrastructure Capacity Regulation - ERFA",
        "url": "https://erfarail.eu/news/joint-statement-council-position-on-railway-infrastructure-capacity-regulation-will-not-improve-rail-freight-services"
      },
      {
        "title": "Regulation on the use of railway infrastructure capacity in the single European railway area, published in OJ - EU Law Live",
        "url": "https://eulawlive.com/regulation-on-the-use-of-railway-infrastructure-capacity-in-the-single-european-railway-area-published-in-oj/"
      },
      {
        "title": "EU adopts new infrastructure capacity management regulation - International Railway Journal",
        "url": "https://www.railjournal.com/policy/eu-adopts-new-infrastructure-capacity-management-regulation/"
      },
      {
        "title": "New EU rules will improve cross-border rail traffic and optimise network capacity - Mobility and Transport",
        "url": "https://transport.ec.europa.eu/news-events/news/new-eu-rules-will-improve-cross-border-rail-traffic-and-optimise-network-capacity-2026-06-10_en"
      },
      {
        "title": "EIM welcomes the Rail Capacity Regulation - EIM",
        "url": "https://eimrail.org/2026/06/11/eim-welcomes-the-rail-capacity-regulation/"
      },
      {
        "title": "EU Publications Office cellar record for CELEX 32026R1184 (title/date confirmation)",
        "url": "http://publications.europa.eu/resource/celex/32026R1184"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 4 RESOLVED, MAJOR CORRECTION: the researcher had left this entry as statusNow='ongoing' with actRef/actDate/eurlexUrl blank because 'formal Council adoption and Official Journal publication were not confirmed'. WebSearch + cellar curl confirm the act WAS adopted and published: Regulation (EU) 2026/1184 (date-of-act 2026-05-20, OJ publication 2026-06-10, CELEX 32026R1184, title exact match). Changed statusNow to 'adopted', populated actRef/actDate/eurlexUrl, and rewrote summaryNow accordingly.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "noise-directive-revision",
    "name": "Eventual revision of the Environmental Noise Directive (2002/49/EC)",
    "group2024": "planned",
    "timing2024": "na",
    "ref2024": "No year indicated",
    "statusNow": "planned",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0049",
    "summaryNow": "Could not confirm whether a proposal to revise the Environmental Noise Directive (2002/49/EC) or introduce EU noise-reduction targets has been tabled, announced in a recent Commission Work Programme, or dropped. A further targeted WebSearch for the 2026 Commission Work Programme found only general commentary that re-scoping/adaptation of the Directive 'may be under consideration' given improved evidence on health effects and costs, with no confirmation it is formally on this or a subsequent work programme. Recorded as 'planned' with this uncertainty flagged rather than asserting either progress or withdrawal.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Environmental Noise Directive - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Environmental_Noise_Directive"
      },
      {
        "title": "Directive - 2002/49 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0049"
      }
    ],
    "verification": "unverified",
    "checkNotes": "Base act 32002L0049 confirmed OK in celex_report. Additional WebSearch this session found no confirming or disconfirming evidence of a tabled proposal or formal work-programme listing; genuinely could not resolve the status either way after honest effort. Left as 'planned' (unchanged) with verification explicitly marked 'unverified'.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "co2-transport-regulatory-package",
    "name": "Possible future CO2 transport regulatory package (CO2 infrastructure/market framework)",
    "group2024": "planned",
    "timing2024": "na",
    "ref2024": "Preparatory work to be started in 2024",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-development-of-the-co2-transportation-infrastructure-and-markets",
    "summaryNow": "Now framed by the Commission as the 'CO2 Market and Infrastructure Framework', a core action of the Industrial Carbon Management Strategy aimed at cross-border CO2 transport/storage interoperability, standards and a single CO2 market. A public consultation ran 6 October 2025 - 9 January 2026, and the Commission's own work-programme material indicates the legislative proposal is planned for Q3 2026. As of July 2026 no formal legislative proposal (COM number) had been tabled, so this remains correctly recorded as 'planned' rather than 'ongoing'.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Development of the CO2 transportation infrastructure and markets | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-development-of-the-co2-transportation-infrastructure-and-markets"
      },
      {
        "title": "CO2 Market and Infrastructure Framework - Carbon Gap Tracker",
        "url": "https://tracker.carbongap.org/policy/co2-market-and-infrastructure-framework/"
      },
      {
        "title": "Building Future-Proof CO2 Transport Infrastructure in Europe - Clean Air Task Force",
        "url": "https://www.catf.us/resource/building-future-proof-co2-transport-infrastructure-europe/"
      },
      {
        "title": "EU Work Programme 2026: CO2 Infrastructure Initiative Planned - Schoenherr",
        "url": "https://www.schoenherr.eu/content/eu-work-programme-2026-co2-infrastructure-initiative-planned"
      }
    ],
    "verification": "corrected",
    "checkNotes": "No CELEX/COM number exists for this initiative as of July 2026 -- consistent with 'planned'. Added confirmation via WebSearch: public consultation closed 9 January 2026 and the Commission's own materials target a Q3 2026 legislative proposal, so 'planned' (not yet tabled) is the correct and current status.",
    "areas": [
      "transport"
    ]
  },
  {
    "id": "batteries",
    "name": "Batteries and waste batteries Regulation",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/1542",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/1542",
    "actDate": "2023-07",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542",
    "summaryNow": "In force since Aug 2023 with phased obligations. Its corporate due-diligence obligations, originally due 18 Aug 2025, were postponed two years to 18 Aug 2027 (and scope narrowed to companies with >EUR150m turnover) by 'stop-the-clock' amending Regulation (EU) 2025/1561 under the Commission's Omnibus IV simplification package (proposed 21 May 2025, adopted 18 July 2025, published in OJ 30 July 2025). Separately, the Dec 2025 Environmental Omnibus (Omnibus VIII, COM(2025)980-986) proposes to suspend the Batteries Regulation's EPR 'authorised representative' obligation for non-established producers until 2032; Council agreed its negotiating stance on 24 June 2026 and the file remained in first reading as of July 2026 - a second, still-pending reopening distinct from the adopted Omnibus IV amendment.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Omnibus IV simplification package - batteries due-diligence stop-the-clock",
        "what": "Postpones the Batteries Regulation's supply-chain due-diligence obligations by two years (to 18 August 2027) and narrows their scope to larger companies",
        "ref": "Reg. (EU) 2025/1561",
        "status": "adopted",
        "date": "2025-07",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/07/18/simplification-council-adopts-law-to-stop-the-clock-on-due-diligence-rules-for-batteries/"
      },
      {
        "pkg": "Omnibus VIII - Environmental Omnibus",
        "what": "Suspends the Batteries Regulation's EPR 'authorised representative' obligation for producers established in a single Member State selling cross-border, until 2032",
        "ref": "COM(2025)980-986 final",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://natlawreview.com/article/publication-environmental-omnibus-european-commission"
      }
    ],
    "sources": [
      {
        "title": "Simplification: Council adopts law to 'stop-the-clock' on due diligence rules for batteries - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/07/18/simplification-council-adopts-law-to-stop-the-clock-on-due-diligence-rules-for-batteries/"
      },
      {
        "title": "Battery Due Diligence: New Deadline 18 August 2027 (Reg. 2025/1561)",
        "url": "https://infodpp.eu/en/blog/battery-due-diligence-delay-2025-1561/"
      },
      {
        "title": "EU Sustainable Batteries Regulation: Where are we now? - CMS Law Now",
        "url": "https://cms-lawnow.com/en/ealerts/2025/11/eu-sustainable-batteries-regulation-where-are-we-now"
      },
      {
        "title": "Publication of the Environmental Omnibus by the European Commission - National Law Review",
        "url": "https://natlawreview.com/article/publication-environmental-omnibus-european-commission"
      },
      {
        "title": "Council agrees negotiating stance to simplify and streamline environmental rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 5. CELEX 32025R1561 OK-verified (celex_report). Cross-checked omnibus.json: confirmed Omnibus IV entry matches. ADDED missing second reopening - Omnibus VIII (Environmental Omnibus) explicitly suspends the Batteries Regulation's EPR authorised-representative obligation until 2032 per omnibus.json's actsReopened list and independent WebSearch confirmation; researcher's dataset only listed the Omnibus IV due-diligence delay and missed this.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "common-charger",
    "name": "Common charging interface (USB-C) for mobile phones and similar devices",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2022/2380",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2022/2380",
    "actDate": "2022-11",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2380",
    "summaryNow": "Directive (EU) 2022/2380 amending the Radio Equipment Directive, already in force at the April 2024 snapshot; USB-C became mandatory for covered devices from 28 December 2024 (laptops from April 2026). No amending or simplification proposal identified.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "CELEX 32022L2380 - Publications Office (mechanically verified, OK)",
        "url": "http://publications.europa.eu/resource/celex/32022L2380"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32022L2380 confirmed OK in celex_report.txt (title = Radio Equipment Directive 2014/53/EU, the act this Directive amends - consistent). No omnibus/reopening cross-hit. Not a focus item; consistent with Annex 2.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "microplastics-reach",
    "name": "REACH restriction on intentionally added microplastics",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "EC Reg. (EU) 2023/2055",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/2055",
    "actDate": "2023-09",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2055",
    "summaryNow": "In force since Oct 2023 (REACH Annex XVII, Entry 78), phased-in restriction and information obligations (first information duties took effect 17 Oct 2025). Commission published an Implementation Guide in April 2025. A targeted technical amendment, Commission Regulation (EU) 2026/1168, clarifies the medicinal-products derogation (incl. clinical trials) and adds a Product/Process-Oriented R&D exemption up to 1 tonne/year - a legal-clarification fix rather than part of the omnibus simplification agenda, but it does constitute an adopted amendment to the act.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Technical amendment to REACH Annex XVII Entry 78 (microplastics)",
        "what": "Clarifies the medicinal-products derogation and introduces a PPORD exemption (<=1 t/yr); a legal-certainty fix, not an omnibus deregulation measure",
        "ref": "Reg. (EU) 2026/1168",
        "status": "adopted",
        "date": "2026",
        "url": "https://en.reach24h.com/news/industry-news/chemical/reach-microplastics-regulation-2026-1168"
      }
    ],
    "sources": [
      {
        "title": "REACH Microplastics Regulation: EU 2026/1168 Update - REACH24H",
        "url": "https://en.reach24h.com/news/industry-news/chemical/reach-microplastics-regulation-2026-1168"
      },
      {
        "title": "Restriction 78 and Microplastics: First Information Obligations Take Effect on 17 October 2025",
        "url": "https://www.normachem.com/en/normachem-informs/restriction-78-and-microplastics-first-information-obligations-take-effect-on-17-october-2025"
      },
      {
        "title": "CELEX 32026R1168 - Publications Office (mechanically verified, OK)",
        "url": "http://publications.europa.eu/resource/celex/32026R1168"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 7. CELEX 32026R1168 confirmed OK in celex_report.txt (exists). Content match (medicinal-products derogation / PPORD exemption amending Entry 78) corroborated by independent source found this session; original researcher's claim stands unchanged.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "construction-products-regulation",
    "name": "Construction Products Regulation (CPR) recast",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)144 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/3110",
    "actDate": "2024-11-27",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/3110/oj/eng",
    "summaryNow": "Adopted 27 Nov 2024, published 18 Dec 2024, entered into force 7 Jan 2025, repealing Reg. (EU) 305/2011; applies to most construction products from 8 Jan 2026. Introduces Digital Product Passport and mandatory Environmental Product Declarations for construction products. No reopening/amendment identified; the Industrial Accelerator Act (COM(2026)100) references CPR low-carbon criteria for construction products but does not amend the base Regulation.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - EU - 2024/3110 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/3110/oj/eng"
      },
      {
        "title": "EU Construction Products Regulation 2024/3110: What it means for CE marking and fire safety",
        "url": "https://internationalfireandsafetyjournal.com/eu-construction-products-regulation-2024-3110-what-it-means-for-ce-marking-and-fire-safety/"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024R3110 OK-verified (celex_report). Checked against Industrial Accelerator Act (focus item 9 context) - references but does not amend CPR.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "crm-act",
    "name": "Critical Raw Materials Act (CRMA)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)160 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1252",
    "actDate": "2024-05-03",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-europe-fit-for-the-digital-age/file-european-critical-raw-material-act",
    "summaryNow": "Published in OJ 3 May 2024, entered into force 23 May 2024. On 3 December 2025 the Commission presented the 'RESourceEU Action Plan' together with a targeted proposal, COM(2025)946, to amend the CRM Act - expanding permanent-magnet recyclability/labelling rules and adding recycled-content-declaration requirements. The Council adopted its negotiating position (general approach) on 4 March 2026; Parliament's ITRE committee adopted its report and negotiating mandate on 24 June 2026 (63-4, with 14 abstentions), opening the way to trilogue. As of July 2026 the file remains in ordinary legislative procedure with trilogue not yet concluded - not finally adopted.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "RESourceEU Action Plan - targeted CRMA amendment",
        "what": "Expands scope of permanent-magnet recyclability provisions and adds labelling/recycled-content declaration requirements for products containing critical raw materials",
        "ref": "COM(2025)946",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://www.globalpolicywatch.com/2025/12/resourceeu-action-plan-strengthening-the-eus-access-to-critical-raw-materials/"
      },
      {
        "pkg": "RESourceEU / CRMA amendment - Council position",
        "what": "Council adopted its general approach (negotiating position) on the CRMA amendment",
        "ref": "COM(2025)946",
        "status": "proposed",
        "date": "2026-03",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/04/raw-materials-council-adopts-position-to-reinforce-the-security-of-supply-and-the-circularity-of-eu-industry/"
      },
      {
        "pkg": "RESourceEU / CRMA amendment - Parliament negotiating mandate",
        "what": "European Parliament's ITRE committee adopted its report and mandate to open trilogue negotiations with the Council",
        "ref": "COM(2025)946",
        "status": "proposed",
        "date": "2026-06",
        "url": "https://agenceurope.eu/en/bulletin/article/13895/13/european-parliament-adopts-negotiating-mandate-on-european-critical-raw-materials-act"
      }
    ],
    "sources": [
      {
        "title": "Regulation - EU - 2024/1252 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252"
      },
      {
        "title": "EU Commission adopts RESourceEU to secure raw materials and reduce dependencies",
        "url": "https://ieu-monitoring.com/editorial/eu-commission-adopts-resourceeu-to-secure-raw-materials-and-reduce-dependencies/862644"
      },
      {
        "title": "Raw materials: Council adopts position to reinforce the security of supply and the circularity of EU industry - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/04/raw-materials-council-adopts-position-to-reinforce-the-security-of-supply-and-the-circularity-of-eu-industry/"
      },
      {
        "title": "Amendments to the Critical Raw Materials Act | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-amendments-to-the-critical-raw-materials-act"
      },
      {
        "title": "European Parliament adopts negotiating mandate on European Critical Raw Materials Act - Agence Europe",
        "url": "https://agenceurope.eu/en/bulletin/article/13895/13/european-parliament-adopts-negotiating-mandate-on-european-critical-raw-materials-act"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 6. Confirmed COM(2025)946 is correct (COM adopted 3 Dec 2025, tabled as proposal amending Reg. (EU) 2024/1252, per the Commission's own document header). CELEX 32024R1252 OK-verified for the base act. UPDATED with EP ITRE committee's 24 June 2026 negotiating mandate (new development since the original researcher's session); status correctly remains 'proposed' as trilogue had not concluded by July 2026.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "espr",
    "name": "Ecodesign for Sustainable Products Regulation (ESPR)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2022)142 final – Scheduled for 2021",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1781",
    "actDate": "2024-06-28",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ%3AL_202401781",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-sustainable-products-initiative",
    "summaryNow": "Adopted 13 June 2024, in force since 18 July 2024, repealing the old Ecodesign Directive 2009/125/EC. First obligations (incl. ban on destroying unsold clothing/footwear) applied from 19 July 2026. Neither Omnibus IV nor the Industrial Accelerator Act (COM(2026)100, tabled 4 Mar 2026) amends the base Regulation - the IAA cross-references ESPR delegated-act criteria for low-carbon product definitions but does not reopen ESPR itself. The first product-specific ecodesign delegated acts and the EU Digital Product Passport registry have slipped from late 2025 to mid/2026 - a delay in implementing acts, not a reopening of the base Regulation, so reopened is kept false.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Ecodesign for Sustainable Products Regulation now in force - Noerr",
        "url": "https://www.noerr.com/en/insights/ecodesign-for-sustainable-products-regulation-now-in-force"
      },
      {
        "title": "DPP Timeline 2026-2030: Every Product, Every Deadline - PassportCraft",
        "url": "https://passportcraft.com/insights/dpp-timeline-2026-2030-every-deadline"
      },
      {
        "title": "Eco-design requirements for sustainable products | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-sustainable-products-initiative"
      },
      {
        "title": "European Commission Proposes Industrial Accelerator Act - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2026/03/european-commission-proposes-industrial-accelerator-act"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 9 (ESPR leg). CELEX 32024R1781 OK-verified (celex_report). Checked Industrial Accelerator Act (COM(2026)100): it references/relies on ESPR criteria for low-carbon product definitions but does not amend the ESPR Regulation itself, so reopened correctly stays false; added a sentence clarifying this rather than leaving it unaddressed.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "empco-green-transition",
    "name": "Empowering Consumers for the Green Transition Directive (unfair commercial practices/green claims on labels)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2022)143 final – Scheduled for 2021",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/825",
    "actDate": "2024-02-28",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/825/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-consumers-in-the-green-transition",
    "summaryNow": "Signed 28 Feb 2024 (as already flagged at the Annex 2 snapshot) and published as Directive (EU) 2024/825 amending the Unfair Commercial Practices and Consumer Rights Directives; entered into force 26 March 2024. Member States must transpose by 27 March 2026 and apply the new rules from 27 September 2026. Its greenwashing/label provisions remain unaffected by the stalled Green Claims Directive, whose negotiations continue unresolved as of July 2026 (see 'green-claims' entry).",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive - EU - 2024/825 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/825/oj/eng"
      },
      {
        "title": "Empowering Consumers Directive (EmpCo) | ClimatePartner",
        "url": "https://www.climatepartner.com/en/knowledge/glossary/empowering-consumers-directive-empco"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024L0825 OK-verified (celex_report). Not a focus item; cross-reference to Green Claims status updated for consistency with that entry's July 2026 finding.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "elv-revision",
    "name": "End-of-Life Vehicles (ELV) Regulation - vehicle circularity",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)451 final – Planned for 2021; moved to Q4/2022",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2026/1738",
    "actDate": "2026-06-29",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2026/1738/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-environment-public-health-and-food-safety-envi/file-revision-of-eu-rules-on-end-of-life-vehicles-and-type-approval-of-motor-vehicles",
    "summaryNow": "Trilogues ran mid-Oct to mid-Dec 2025; Council and Parliament reached a provisional political agreement on 12 December 2025 on the new Regulation (replacing the ELV Directive 2000/53/EC and parts of the Type-Approval framework), including phased recycled-plastics content targets (15% after 6 years, 25% after 10 years). The agreement was endorsed by Coreper and Parliament's ENVI/IMCO committees on 25 February 2026; the Council formally adopted the act on 29 June 2026; it was published as Regulation (EU) 2026/1738 in the Official Journal on 24 July 2026, introducing a Circularity Vehicle Passport, an EU-wide Extended Producer Responsibility system, minimum recycled-content requirements and a ban (from 5 years after entry into force) on exporting non-roadworthy used vehicles. General application from 1 September 2028.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Circular economy: Council and Parliament strike deal on rules for vehicle circularity and management of end-of-life vehicles - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/12/circular-economy-council-and-parliament-strike-deal-on-rules-for-vehicle-circularity-and-management-of-end-of-life-vehicles/"
      },
      {
        "title": "Council greenlights rules for a more circular automotive sector - Consilium",
        "url": "https://consilium.europa.eu/en/press/press-releases/2026/06/29/council-greenlights-rules-for-a-more-circular-automotive-sector/"
      },
      {
        "title": "New EU Regulation 2026/1738: Circular Economy Becomes a Core Requirement for the Automotive Industry - imds-professional",
        "url": "https://www.imds-professional.com/en/new-eu-regulation-2026-1738-circular-economy-becomes-a-core-requirement-for-the-automotive-industry/"
      },
      {
        "title": "European ELV Regulation Approved: A Historic Step For Circular Vehicle Recycling - Auto Recycling World",
        "url": "https://autorecyclingworld.com/european-elv-regulation-approved-a-historic-step-for-circular-vehicle-recycling/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 2. CORRECTED: this file has now been finally adopted and published - the researcher's dataset (statusNow=ongoing) was accurate as of their search session but out of date by July 2026. Confirmed act number Reg. (EU) 2026/1738 via CELEX 32026R1738 (curl-confirmed to exist, cellar metadata timestamped 2026-07-27, consistent with a 24 Jul 2026 OJ publication) and via WebSearch (Council adoption 29 Jun 2026, OJ publication 24 Jul 2026).",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "end-of-waste-criteria",
    "name": "End-of-waste criteria for plastics and textiles",
    "group2024": "ongoing",
    "timing2024": "na",
    "ref2024": "Since 2021 – scoping assessment to identify priority list of waste",
    "statusNow": "ongoing",
    "summaryNow": "Non-legislative, implementing-act-based process. JRC scoping (2022) ranked plastics as top priority waste stream and produced technical proposals; in December 2025 the Commission put a draft implementing act on EU-wide end-of-waste criteria for plastics out for public consultation (open until 26 Jan 2026), scheduled to apply from 1 July 2026. JRC has separately started technical work on end-of-waste criteria for textiles and for C&D mineral fractions; no textiles implementing act has been tabled yet.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "European Commission Releases Draft Regulation on End-of-Waste Criteria for Plastics | ChemLinked",
        "url": "https://sustainability.chemlinked.com/news/european-commission-releases-draft-regulation-on-end-of-waste-criteria-for-plastics"
      },
      {
        "title": "End-of-Waste criteria for plastics: Establishing an EU-wide framework (Zero Waste Europe consultation response)",
        "url": "https://zerowasteeurope.eu/wp-content/uploads/2026/02/20260123_ZWE_EoW_plastic_answer_consultation.pdf"
      }
    ],
    "verification": "unverified",
    "checkNotes": "Not a focus item and no CELEX to check (implementing act, non-legislative). Left as-is; whether the plastics implementing act was actually adopted/applied from 1 July 2026 as scheduled could not be independently confirmed this session.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "green-claims",
    "name": "Green Claims Directive (substantiation of explicit environmental claims)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)166 final – Scheduled for 2020",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023PC0166",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-substantiating-green-claims",
    "summaryNow": "Parliament adopted its first-reading position 12 March 2024; first trilogue held 28 Jan 2025. On 20 June 2025 the Commission announced its intention to withdraw the proposal, following an EPP letter (18 June 2025) objecting to extending scope to micro-enterprises; the Council cancelled the final trilogue scheduled for 23 June 2025. On 25 June 2025 Executive VP Teresa Ribera clarified the proposal had NOT been formally withdrawn, and the 2026 Commission Work Programme (adopted 21 Oct 2025) still lists it as pending. This stalemate persists essentially unchanged into July 2026: as of 1 July 2026 the Commission reiterated that full withdrawal is not planned, but that progress depends on excluding micro-enterprises from scope, and negotiations are continuing under the Danish Council Presidency (H2 2025) and its successor. No formal withdrawal act, no OJ notice of withdrawal, and no concluded trilogue were found as of late July 2026. statusNow is kept as 'ongoing' (tabled, technically still in procedure, active political negotiation continuing) rather than withdrawn or shelved.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "European Commission Announces Intention to Withdraw EU Green Claims Directive Proposal, Although the Status Remains Unclear - Latham & Watkins",
        "url": "https://www.lw.com/en/insights/european-commission-announces-intention-to-withdraw-eu-green-claims-directive-proposal"
      },
      {
        "title": "The European Commission Withdraws the Green Claims Directive Proposal - Gorrissen Federspiel",
        "url": "https://gorrissenfederspiel.com/en/the-european-commission-withdraws-the-green-claims-directive-proposal/"
      },
      {
        "title": "Green Claims Directive – Status, Trilogue, and Adoption Timeline",
        "url": "https://tracker.carbongap.org/policy/green-claims/"
      },
      {
        "title": "Substantiating green claims | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-substantiating-green-claims"
      },
      {
        "title": "The EU Green Claims Directive - Current Status and Outlook - CMS Law",
        "url": "https://cms.law/en/aut/legal-updates/the-eu-green-claims-directive-where-are-we-now-and-what-s-next"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 1. Confirmed via WebSearch that no formal withdrawal (EC 2026 work programme, OJ withdrawal list) has occurred as of July 2026 - the file is neither withdrawn nor in active trilogue conclusion, but genuinely still 'ongoing/stalled' with talks continuing under Council presidency pressure. This resolves the researcher's caveat: statusNow=ongoing is the correct classification, not a hedge. Updated summaryNow with the July 2026 confirmation (EC's 1 Jul 2026 clarification, no withdrawal found).",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "ied",
    "name": "Industrial Emissions Directive revision (IED) and Landfill Directive amendment",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)156 final",
    "statusNow": "adopted",
    "actRef": "Directive (EU) 2024/1785",
    "actDate": "2024-04-24",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/1785/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-industrial-emissions-directive-(refit)",
    "summaryNow": "Final act signed 24 April 2024, published 15 July 2024, in force 4 August 2024. Expands scope to intensive livestock rearing, ore mines and large battery manufacturing and tightens permit/emission requirements. Member States' transposition deadline of 1 July 2026 has now passed. Now reopened: the 'Environmental Omnibus' (Omnibus VIII, COM(2025)980 package / COM(2025)981-986 final, tabled 10 Dec 2025) proposes more flexible Environmental Management Systems under the IED (which consolidates Directive 2010/75/EU as amended by 2024/1785) as part of a wider industrial-emissions/circular-economy/environmental-assessment simplification. Council agreed its negotiating stance 24 June 2026; the file was still in first reading as of July 2026 (no amending act adopted yet).",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Omnibus VIII - Environmental Omnibus",
        "what": "Proposes more flexible Environmental Management Systems and other simplifications under the Industrial Emissions Directive (Dir. 2010/75/EU, as amended by Dir. (EU) 2024/1785)",
        "ref": "COM(2025)980 / COM(2025)981-986",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      }
    ],
    "sources": [
      {
        "title": "Directive (EU) 2024/1785 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/1785/oj/eng"
      },
      {
        "title": "Industrial and Livestock Rearing Emissions Directive (IED 2.0) - Environment",
        "url": "https://environment.ec.europa.eu/topics/industrial-emissions-and-safety/industrial-and-livestock-rearing-emissions-directive-ied-20_en"
      },
      {
        "title": "Revision of Directive 2010/75/EU on industrial emissions (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-industrial-emissions-directive-(refit)"
      },
      {
        "title": "Council agrees negotiating stance to simplify and streamline environmental rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 32024L1785 confirmed OK. Added missed reopening: Omnibus VIII (Environmental Omnibus) explicitly lists the IED among actsReopened in research/omnibus.json - original entry claimed 'no reopening found', which was incomplete. Cross-check with ce-industry.json (shared id) recommended for consistency.",
    "areas": [
      "ce-industry",
      "pollution-chemicals"
    ]
  },
  {
    "id": "microplastics-release",
    "name": "Measures to reduce release of microplastics (plastic pellet losses)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)645 final – Planned for 2021, moved to Q4/2022",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2025/2365",
    "actDate": "2025-11-26",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2365",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-microplastics",
    "summaryNow": "Council and Parliament reached provisional agreement 8 April 2025 on the 'Regulation on preventing plastic pellet losses to reduce microplastic pollution'; Council signed off 22 Sept 2025; the act was signed 12 Nov 2025 and published as Regulation (EU) 2025/2365 on 26 Nov 2025, entering into force 16 Dec 2025 (most obligations apply from Dec 2027). Separate from the REACH microplastics restriction. Advocacy groups (e.g. Pew Charitable Trusts, letter 27 March 2026) continue to press the Commission for further textile-microfibre measures, but no new legislative proposal was found reopening this act.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "New law reducing microplastic pollution enters into force - Environment (European Commission)",
        "url": "https://environment.ec.europa.eu/news/new-law-reducing-microplastic-pollution-enters-force-2025-12-16_en"
      },
      {
        "title": "Plastic pellets: Council signs off regulation to reduce pollution from microplastics - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/09/22/plastic-pellets-council-signs-off-regulation-to-reduce-pollution-from-microplastics/"
      },
      {
        "title": "European Commission Can Act to Reduce Microplastic Pollution From Textiles - Pew",
        "url": "https://www.pew.org/en/research-and-analysis/speeches-and-testimony/2026/05/27/european-commission-can-act-to-reduce-microplastic-pollution-from-textiles"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 4. CELEX 32025R2365 OK-verified (celex_report). Matches the plastic-pellets initiative and dates as claimed; no correction needed.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "nzia",
    "name": "Net-Zero Industry Act (NZIA)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)161 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1735",
    "actDate": "2024-06-29",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-europe-fit-for-the-digital-age/file-net-zero-industry-act",
    "summaryNow": "Entered into force 29 June 2024. Establishes a framework to scale up EU net-zero technology manufacturing, an EU CO2-storage-services market and demand-side support. On 4 March 2026 the Commission tabled the Industrial Accelerator Act (IAA, COM(2026)100), which is expected to amend the NZIA to strengthen its Union-origin/'Made in EU' requirements for public procurement and support schemes, alongside new foreign-direct-investment conditions; still in ordinary legislative procedure (first reading) as of July 2026, so the NZIA base Regulation itself has not yet been amended.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Industrial Accelerator Act (IAA)",
        "what": "Proposes to strengthen NZIA Union-origin ('Made in EU') requirements for public procurement/support schemes for net-zero technologies and to add FDI screening conditions",
        "ref": "COM(2026)100",
        "status": "proposed",
        "date": "2026-03",
        "url": "https://www.mayerbrown.com/en/insights/publications/2026/03/european-commission-proposes-industrial-accelerator-act"
      }
    ],
    "sources": [
      {
        "title": "Net-Zero Industry Act secondary legislation - Internal Market, Industry, Entrepreneurship and SMEs",
        "url": "https://single-market-economy.ec.europa.eu/publications/net-zero-industry-act-secondary-legislation_en"
      },
      {
        "title": "Net-zero industry act | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-europe-fit-for-the-digital-age/file-net-zero-industry-act"
      },
      {
        "title": "European Commission Proposes Industrial Accelerator Act - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2026/03/european-commission-proposes-industrial-accelerator-act"
      },
      {
        "title": "Industrial Accelerator Act - Internal Market, Industry, Entrepreneurship and SMEs",
        "url": "https://single-market-economy.ec.europa.eu/publications/industrial-accelerator-act_en"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 9 (NZIA leg). CELEX 32024R1735 OK-verified (celex_report). ADDED missing reopening: the Industrial Accelerator Act (tabled 4 Mar 2026, COM(2026)100) is confirmed by multiple sources to amend NZIA's Union-origin rules; the original dataset's 'no amending proposal identified' claim was outdated/incomplete.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "packaging-ppwr",
    "name": "Packaging and Packaging Waste Regulation (PPWR)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2022)677 final – Scheduled for 2021",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2025/40",
    "actDate": "2025-01-22",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-packaging-and-packaging-waste-directive-(refit)",
    "summaryNow": "Council formally adopted 16 Dec 2024; published in OJ as Regulation (EU) 2025/40 on 22 Jan 2025; entered into force 12 Feb 2025; applies generally from 12 August 2026, repealing Directive 94/62/EC. Sets packaging-reduction, reuse/refill (incl. HORECA takeaway) and recyclability targets through 2040. The Dec 2025 Environmental Omnibus (Omnibus VIII, COM(2025)980-986) proposes to suspend Article 45(3) PPWR's EPR 'authorised representative' obligation until 1 January 2035 for producers established in a single Member State selling cross-border; Council agreed a negotiating stance 24 June 2026, still in first reading as of July 2026 - this is a genuine reopening the original dataset missed.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "Omnibus VIII - Environmental Omnibus",
        "what": "Suspends PPWR Article 45(3)'s EPR authorised-representative obligation until 1 January 2035",
        "ref": "COM(2025)980-986 final",
        "status": "proposed",
        "date": "2025-12",
        "url": "https://natlawreview.com/article/eu-environmental-omnibus-package-impacts-packaging"
      }
    ],
    "sources": [
      {
        "title": "The New EU Packaging and Packaging Waste Regulation – Highlights and Challenges Ahead - KHLaw",
        "url": "https://www.khlaw.com/insights/new-eu-packaging-and-packaging-waste-regulation-highlights-and-challenges-ahead"
      },
      {
        "title": "PACKAGING WASTE DIRECTIVE | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/spotlight-JD/file-jd-packaging-waste-directive"
      },
      {
        "title": "New EU rules to reduce, reuse and recycle packaging | News | European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20240419IPR20589/new-eu-rules-to-reduce-reuse-and-recycle-packaging"
      },
      {
        "title": "EU Environmental Omnibus Package Impacts Packaging - National Law Review",
        "url": "https://natlawreview.com/article/eu-environmental-omnibus-package-impacts-packaging"
      },
      {
        "title": "Council agrees negotiating stance to simplify and streamline environmental rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 5 extension (PPWR under Omnibus VIII). CELEX 32025R0040 OK-verified (celex_report). ADDED missing reopening: Omnibus VIII explicitly suspends PPWR Art. 45(3) per omnibus.json's actsReopened list and independent WebSearch confirmation. The dataset's own notes flagged this as an unresolved search gap ('PPWR omnibus 2026') - now resolved.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "right-to-repair",
    "name": "Right to Repair Directive",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)155 final – Scheduled for 2021",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/1799",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/1799/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-right-to-repair",
    "summaryNow": "Parliament adopted the final text 23 April 2024; Council adopted 30 May 2024; signed 13 June 2024; published in OJ 10 July 2024; entered into force 30 July 2024. Member States must transpose by 31 July 2026. No amendment/reopening identified.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive - EU - 2024/1799 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/1799/oj/eng"
      },
      {
        "title": "Proposal for a directive on common rules promoting the repair of goods | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-right-to-repair?sid=6201"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024L1799 confirmed to exist via curl and OK-verified (celex_report), and its cross-referenced amended acts (Reg. (EU) 2017/2394, Dir. (EU) 2019/771, Dir. (EU) 2020/1828) match the Annex 2 description of the proposal exactly.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "wfd-food-waste-textiles",
    "name": "Waste Framework Directive revision (food waste and textiles)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)420 final – Planned for Q2/2023",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2025/1892",
    "actDate": "2025-09-26",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025L1892",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-eu-waste-framework",
    "summaryNow": "Provisional agreement reached 18/19 Feb 2025 introducing binding food-waste-reduction targets for 2030 (10% processing/manufacturing, 30% per-capita retail/consumption cut vs 2021-2023) and an Extended Producer Responsibility scheme for textiles. Directive (EU) 2025/1892 amending Directive 2008/98/EC was published in the OJ on 26 September 2025 and entered into force 16 October 2025. No reopening of this new amendment identified; the Omnibus VIII proposal to limit EPR reporting to annual frequency touches the base Waste Framework Directive 2008/98/EC generally but was not found to specifically reopen the food-waste/textiles amendment.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Council and Parliament agree to reduce food waste and set new rules on waste textile - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/02/19/council-and-parliament-agree-to-reduce-food-waste-and-set-new-rules-on-waste-textile/"
      },
      {
        "title": "Revised Waste Framework Directive enters into force - Environment (European Commission)",
        "url": "https://environment.ec.europa.eu/news/revised-waste-framework-directive-enters-force-2025-10-16_en"
      },
      {
        "title": "Revision of the EU waste framework directive - textiles and food waste | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-eu-waste-framework"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 4. CELEX 32025L1892 OK-verified (celex_report; title returned = base Directive 2008/98/EC, the act this Directive amends - consistent). Matches the food-waste/textiles initiative and dates as claimed; no correction needed.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "waste-shipments",
    "name": "Waste Shipment Regulation (WSR) recast",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2021)709 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1157",
    "actDate": "2024-04-11",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/1157/oj/eng",
    "summaryNow": "Signed 12 April 2024 (as already noted at the April 2024 Annex 2 snapshot) and published as Regulation (EU) 2024/1157 on shipments of waste, repealing Reg. (EC) 1013/2006. In force; no reopening/amendment identified.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - EU - 2024/1157 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/1157/oj/eng"
      },
      {
        "title": "Regulation (EU) 2024/1157 on shipments of waste - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/en/LSU/?uri=oj:L_202401157"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024R1157 OK-verified (celex_report). Matches Annex 2 (COM(2021)709, signature noted 12.04.2024). Not a focus item.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "animal-welfare-labelling",
    "name": "EU framework for transparent, science-based information on farmed-animal welfare (animal welfare labelling)",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for Q3/2023",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-agriculture-and-rural-development-agri/file-welfare-of-dogs-and-cats-and-their-traceability",
    "summaryNow": "This labelling initiative was folded into the broader revision of EU animal-welfare legislation, originally due 2023, repeatedly delayed. Commissioner Varhelyi promised a package of up to four bills (Kept Animals, Transport, Slaughter, Labelling) with first proposals by end-2026; a public consultation on the labelling subgroup ran to 12 Dec 2025. The confirmed 2026 Commission Work Programme contains, on animal welfare, only: a non-legislative livestock strategy (Q2 2026), a Regulation on animal transport, and a Regulation on the welfare of dogs and cats and their traceability (co-legislators reached provisional agreement Nov 2025, EP vote expected H1 2026) - no dedicated animal-welfare-labelling proposal is confirmed among the named 2026 deliverables. NGOs/the EP Animal Welfare Intergroup have publicly warned the labelling and slaughter proposals may be omitted from the 2026 Work Programme entirely, so whether a labelling proposal will be tabled at all in 2026 remains genuinely unresolved as of July 2026.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "First animal welfare proposals by 2026, European Commissioner Olivier Varhelyi promises | Eurogroup for Animals",
        "url": "https://www.eurogroupforanimals.org/news/first-animal-welfare-proposals-2026-european-commissioner-oliver-varhelyi-promises"
      },
      {
        "title": "Intergroup warns against omission of animal welfare proposal from 2026 Work Programme | Intergroup",
        "url": "https://www.animalwelfareintergroup.eu/news/intergroup-warns-against-omission-animal-welfare-proposal-2026-work-programme"
      },
      {
        "title": "European Commission's 2026 Work Programme - EURCAW-Ruminants&Equines",
        "url": "https://www.eurcaw-ruminants-equines.eu/european-commissions-2026-work-programme/"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM 8. Re-confirmed the 2026 Work Programme's named animal-welfare deliverables (livestock strategy Q2 2026, animal-transport Regulation, dogs/cats Regulation) - none is the labelling initiative specifically; the researcher's uncertainty framing is accurate and left largely unchanged, with the confirmed 2026 WP items now named explicitly.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "food-date-marking",
    "name": "Food labelling - revision of EU date-marking rules ('use by'/'best before')",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for Q4/2022",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-rules-on-date-marking-(-use-by-and-best-before-dates)",
    "summaryNow": "Part of the wider revision of the Food Information to Consumers Regulation (EU) 1169/2011, originally due by end-2023; still not formally tabled as of July 2026. It was absent from the Commission Work Programme for 2024 and remains absent from named 2026 Work Programme legislative deliverables; the Commission's Food and Feed Safety Simplification Omnibus (Omnibus X, COM(2025)1020/1021/1030, tabled 16 Dec 2025) addresses food labelling/date-marking topics only in a narrow simplification sense (e.g. data-protection-period extensions), not as the comprehensive date-marking reform originally promised. Front-of-pack nutrition labelling (another strand of the same FIC revision) remains separately blocked by Member State disagreement. Kept as planned (announced, not tabled) rather than shelved because no definitive drop decision was found, but this remains a weak, ageing commitment now roughly 2.5 years overdue.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Proposal for a regulation revising the rules on date marking | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-rules-on-date-marking-(-use-by-and-best-before-dates)"
      },
      {
        "title": "Date marking and food waste prevention (discontinued) - Food Safety (European Commission)",
        "url": "https://food.ec.europa.eu/food-safety/food-waste/eu-actions-against-food-waste/eu-platform-food-losses-and-food-waste/thematic-sub-groups/date-marking-and-food-waste-prevention-discontinued_en"
      },
      {
        "title": "Proposal revision Regulation of FIC - Food Safety - European Commission",
        "url": "https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation/proposal-revision-regulation-fic_en"
      },
      {
        "title": "Simpler, smarter, safer: A bird's-eye view of the EU Food and Feed Safety Omnibus - Bird & Bird",
        "url": "https://www.twobirds.com/en/insights/2026/simpler,-smarter,-safer-a-bird's-eye-view-of-the-eu-food-and-feed-safety-omnibus"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 8. Checked against Omnibus X (Food and Feed Safety Simplification Omnibus, tabled 16 Dec 2025, in omnibus.json) - confirmed it touches food-labelling/date-marking topics but only as narrow simplification, not the comprehensive FIC date-marking revision; added this cross-check since the researcher's original notes flagged not having checked recent food-safety omnibus developments. Status remains correctly 'planned', not tabled.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "food-systems-framework",
    "name": "Legislative framework for sustainable food systems (SFS framework law)",
    "group2024": "planned",
    "timing2024": "delayed",
    "ref2024": "Planned for Q3/2023, but not mentioned in the EC Work Programme for 2024. It remains uncertain when this proposal will be tabled.",
    "statusNow": "shelved",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/spotlight-JD%2023-24/file-sustainable-eu-food-system",
    "summaryNow": "Never tabled. As of 26 March 2026 the European Commission's own tracker marks the 'Sustainable Food System Framework' initiative as 'Abandoned', meaning no further steps (incl. the previously-promised additional stakeholder feedback round) will be pursued. The Commission's Feb 2025 'Vision for Agriculture and Food' explicitly deprioritised the more ambitious Green-Deal-era food-system agenda.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "EU Sustainable Food System Framework Initiative Abandoned by the European Commission - IGI FOOD LAW",
        "url": "https://igifoodlaw.com/en/eu-sustainable-food-system-framework-initiative-abandoned-by-the-european-commission/"
      },
      {
        "title": "EU Commission sets Green Deal aside in new agri-food vision | Euronews",
        "url": "https://www.euronews.com/my-europe/2025/02/19/eu-commission-sets-green-deal-aside-in-new-agri-food-vision"
      },
      {
        "title": "Legislative framework for sustainable food systems | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/spotlight-JD%2023-24/file-sustainable-eu-food-system"
      }
    ],
    "verification": "verified",
    "checkNotes": "Not a focus item; 'Abandoned' tracker classification and Feb 2025 policy shift are well corroborated across independent sources. No correction needed.",
    "areas": [
      "ce-industry",
      "biodiversity"
    ]
  },
  {
    "id": "reuse-food-service",
    "name": "Reuse targets for food services (substitute single-use packaging, tableware, cutlery)",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for 2021",
    "statusNow": "shelved",
    "summaryNow": "No standalone legislative proposal on food-service reuse was ever tabled under this name. The substance was instead absorbed into the Packaging and Packaging Waste Regulation (EU) 2025/40, which sets HORECA reuse/refill obligations for takeaway food and beverages (e.g. option to use consumer's own container from 12 Feb 2027; reusable option from 12 Feb 2028; beverage reuse/refill targets from 2030). Classed as shelved as a distinct initiative since it never proceeded on its own legislative track.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "The New EU Packaging and Packaging Waste Regulation – Highlights and Challenges Ahead",
        "url": "https://www.khlaw.com/insights/new-eu-packaging-and-packaging-waste-regulation-highlights-and-challenges-ahead"
      },
      {
        "title": "EU PPWR – Packaging and Packaging Waste Regulation - business.gov.uk",
        "url": "https://www.business.gov.uk/campaign/europe/european-union-eu-regulations/eu-packaging-and-packaging-waste-regulation-eu-ppwr/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Not a focus item. Reasoning (absorbed into PPWR's HORECA reuse provisions) is consistent with the PPWR entry and Annex 2; no CELEX applicable since no standalone act exists.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "landfill-directive-review",
    "name": "Review of the Landfill Directive (1999/31/EC), incl. 2035 landfilling target",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for 2024",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-jd-landfill-directive",
    "summaryNow": "The amended Landfill Directive required the Commission to review the 2035 10%-landfilling target (and consider a per-capita target and restrictions on landfilling non-hazardous, non-municipal waste) by 31 December 2024. No evidence of either a published review report or a legislative amendment proposal following from it was found; the Commission's early-warning-report mechanism (EEA-supported, published 3 years ahead of target years) continues on its separate statutory track and is not the same as the Article 5(5) review this initiative refers to. Recent (Dec 2025) EU-auditor commentary discusses recycling-incentive policy but not a Commission review/proposal. This item could not be confirmed as tabled, so it is kept as planned with an explicit note that its status is unverified rather than confirmed dropped.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "LANDFILL DIRECTIVE | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-new-boost-for-jobs-growth-and-investment/file-jd-landfill-directive"
      },
      {
        "title": "EU auditors support incentives to keep recycling viable - Resource Recycling",
        "url": "https://resource-recycling.com/recycling/2025/12/02/eu-auditors-support-incentives-to-keep-recycling-viable/"
      }
    ],
    "verification": "unverified",
    "checkNotes": "FOCUS ITEM 8. Re-searched specifically for a Commission review report or Landfill Directive amendment through July 2026; found none. The statutory Article 5(5) review deadline (31 Dec 2024) appears to have passed with no public output found - genuinely unresolved, left as 'planned/unverified' per the researcher's original framing, which is accurate.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "food-contact-materials",
    "name": "Revision of EU rules on food contact materials (promote reusable/recycling solutions)",
    "group2024": "planned",
    "timing2024": "delayed",
    "ref2024": "Planned for 2022 → Moved to Q2/2023",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-legislation-on-food-contact-materials",
    "summaryNow": "The comprehensive revision of the food contact materials framework promised under Farm to Fork has still not been formally tabled as of an EP think-tank briefing dated March 2026, which found the Commission had 'recently reiterated its commitment' to harmonising FCM rules but no proposal existed. The Food and Feed Safety Simplification Omnibus (Omnibus X, COM(2025)1020/1021/1030, tabled 16 Dec 2025) includes food-contact-materials simplification elements per the Commission's own package documentation, but these are narrow simplification/administrative measures, not the promised comprehensive FCM framework revision. In the meantime the Commission has also made narrower, non-comprehensive amendments to the existing plastics-FCM Regulation (EU) 10/2011 - e.g. Reg. (EU) 2025/351 (Feb 2025, 'high degree of purity' rules) and Reg. (EU) 2025/2240 (Nov 2025, transitional measures) - plus EU-wide bans on BPA and PFAS in food packaging; none of these constitute the promised general revision.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Food contact materials in the EU: State of play | Epthinktank | European Parliament",
        "url": "https://epthinktank.eu/2026/03/03/food-contact-materials-in-the-eu-state-of-play/"
      },
      {
        "title": "European Commission Publishes Amendments to Plastic Food Contact Materials Regulation | Bureau Veritas CPS",
        "url": "https://www.cps.bureauveritas.com/newsroom/european-commission-publishes-amendments-plastic-food-contact-materials-regulation"
      },
      {
        "title": "Plastic food contact materials: declaration of compliance soon to reflect compliance with new purity requirements | Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/11/plastic-food-contact-materials-declaration-of-compliance-soon-to-reflect-compliance-with-new-purity-requirements"
      },
      {
        "title": "Simpler, smarter, safer: A bird's-eye view of the EU Food and Feed Safety Omnibus - Bird & Bird",
        "url": "https://www.twobirds.com/en/insights/2026/simpler,-smarter,-safer-a-bird's-eye-view-of-the-eu-food-and-feed-safety-omnibus"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 8. Cross-checked Omnibus X: it does touch food-contact-materials topics, but as narrow simplification (not the promised comprehensive revision); added this to avoid the omission implied by the original entry's silence on the Dec 2025 omnibus. statusNow correctly remains 'planned'.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "textile-labelling-revision",
    "name": "Revision of the Textile Labelling Regulation (physical and digital labelling, sustainability/circularity parameters)",
    "group2024": "planned",
    "timing2024": "delayed",
    "ref2024": "Q4/2023 → Moved to Q1/2025",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/package-circular-economy-package/file-textile-labeling-regulation",
    "summaryNow": "Further delayed beyond the Q1/2025 date noted in the April 2024 snapshot: a DG GROW stakeholder workshop was held 18 Oct 2024, and the Commission's own 2025 Work Programme (published 11 Feb 2025) pushed the target to Q2 2026, reaffirmed by the May 2025 Single Market Strategy. Confirmed via a July 2026 search: no formal Commission proposal revising Regulation (EU) 1007/2011 had been tabled as of late July 2026, meaning the Q2/H1-2026 target has itself now slipped without a replacement date announced - this is a fresh, independently-confirmed delay beyond what the original researcher could establish.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Review of Regulation (EU) 1007/2011 - Internal Market, Industry, Entrepreneurship and SMEs",
        "url": "https://single-market-economy.ec.europa.eu/sectors/textiles-ecosystem/review-regulation-eu-10072011_en"
      },
      {
        "title": "EU Law for Textiles: End of Year Recap and What Comes Next - Ohana Public Affairs",
        "url": "https://ohanapublicaffairs.eu/2025/12/16/eu-law-textiles-2025-recap/"
      },
      {
        "title": "Revision of the textile labelling regulation | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-circular-economy-package/file-textile-labeling-regulation"
      },
      {
        "title": "EU Textile Labelling Regulation Revision: What You Need to Know - Eurofins",
        "url": "https://sustainabilityservices.eurofins.com/news-vi/eu-textile-labelling-regulation-revision-what-you-need-to-know/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 8 (specifically flagged). Resolved the researcher's open question: as of July 2026, the textile labelling revision had still NOT been tabled despite the Q2 2026 target having passed - this is a confirmed further delay, not merely an unresolved search gap as the original entry implied. Updated summaryNow accordingly; statusNow correctly remains 'planned'.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "rohs-revision",
    "name": "RoHS Directive revision (hazardous substances in electrical/electronic equipment)",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for 2021. On 07.12.2023 the EC published a report proposing to transfer restricted-substance review responsibility to ECHA",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2025/2456",
    "actDate": "2025-11-26",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025L2456",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-rules-restricting-the-use-of-hazardous-substances-in-electronics",
    "summaryNow": "Following the Commission's Dec 2023 report proposing to hand scientific/technical tasks to ECHA, Directive (EU) 2025/2456 of the European Parliament and of the Council of 26 November 2025 amending Directive 2011/65/EU (RoHS) was signed 26 November 2025, published in the OJ on 12 December 2025, and entered into force 1 January 2026. It transfers exemption-evaluation and substance-review procedures to ECHA (supporting the 'one substance, one assessment' approach), introduces a 4-yearly (not 5-yearly) periodic review cycle for restricted substances, and provides that ECHA's exemption-application role becomes operative from 13 August 2027.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "EU Transfers Partial Scientific and Technical Tasks of RoHS to ECHA - CIRS Group",
        "url": "https://www.cirs-group.com/en/chemicals/eu-transfers-partial-scientific-and-technical-tasks-of-rohs-to-echa"
      },
      {
        "title": "RoHS II Directive: reassignment of technical-scientific tasks to ECHA",
        "url": "https://www.normachem.com/en/normachem-informs/rohs-ii-directive-reassignment-of-technical-scientific-tasks-to-echa"
      },
      {
        "title": "Directive reallocating chemical assessment tasks to ECHA and Regulation establishing EU chemicals data platform published in the Official Journal - EU Law Live",
        "url": "https://eulawlive.com/directive-reallocating-chemical-assessment-tasks-to-echa-and-regulation-establishing-eu-chemicals-data-platform-published-in-the-official-journal/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM 3. CELEX 32025L2456 OK-verified (celex_report). Confirmed via WebSearch that Directive (EU) 2025/2456 is indeed the RoHS/ECHA-reattribution act (amends Directive 2011/65/EU, transfers exemption/substance-review tasks to ECHA) - matches the initiative exactly. CORRECTED actDate from '2025-12-12' (the OJ-publication date, mislabelled as the act date) to '2025-11-26' (the act's own signature date, per its title 'of 26 November 2025' and consistent with this dataset's convention elsewhere e.g. batteries/waste-shipments). Also corrected the review-cycle periodicity from 'at least every 5 years' to the sourced 'at least every 4 years'.",
    "areas": [
      "ce-industry"
    ]
  },
  {
    "id": "general-product-safety",
    "name": "General Product Safety Regulation (GPSR)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/988",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/988",
    "actDate": "2023-05-10",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2023/988/oj/eng",
    "summaryNow": "Already adopted before the Annex 2 snapshot; applied from 13 December 2024. Commission published implementation guidelines on 19 November 2025. A consolidated text dated 29 May 2026 exists on EUR-Lex reflecting a corrigendum, not a substantive policy reopening.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - 2023/988 - EN - GPSR - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2023/988/oj/eng"
      },
      {
        "title": "EUR-Lex - 02023R0988-20260529 - EN - European Union",
        "url": "https://eur-lex.europa.eu/eli/reg/2023/988/2026-05-29/eng"
      },
      {
        "title": "General Product Safety Regulation - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/General_Product_Safety_Regulation"
      }
    ],
    "verification": "verified",
    "checkNotes": "Matches Annex 2 (adopted group, ref Reg. (EU) 2023/988). CELEX 32023R0988 confirmed OK in celex_report.txt. No reopening found.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "lead-diisocyanates",
    "name": "Occupational exposure limits for lead and diisocyanates (amending Dir. 2004/37/EC and Dir. 98/24/EC)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Dir. (EU) 2024/869",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2024/869",
    "actDate": "2024-03-13",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/869/oj",
    "summaryNow": "Already adopted before the Annex 2 snapshot (signed 13 March 2024, OJ 19 March 2024, in force 2 April 2024). Member States had to apply the new lead (0.03 mg/m3 TWA) and first-ever binding diisocyanate limit values by 9 April 2026, which has now passed. No reopening or amendment found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive - EU - 2024/869 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/869/oj"
      },
      {
        "title": "Protecting workers against lead and diisocyanates: Council signs off on new limit values - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2024/02/26/protecting-workers-against-lead-and-diisocyanates-council-signs-off-on-new-limit-values/"
      },
      {
        "title": "EU Introduces Stricter Occupational Exposure Limits for Lead and Diisocyanate | ChemLinked",
        "url": "https://chemical.chemlinked.com/news/chemical-news/eu-imposes-stricter-occupational-exposure-limits-for-lead-and-its-inorganic-compounds"
      }
    ],
    "verification": "verified",
    "checkNotes": "Matches Annex 2 (adopted group, ref Dir. (EU) 2024/869). CELEX 32024L0869 confirmed OK in celex_report.txt. No reopening found.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "chemical-data-access",
    "name": "Common data platform on chemicals (access/sharing/re-use of chemical data for chemical safety assessments)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)779 final",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2025/2455",
    "actDate": "2025-11-26",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2025/2455/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-access-to-and-availability-sharing-and-re-use-of-chemical-data-(refit)",
    "summaryNow": "Tabled 7 December 2023. Co-legislators reached a provisional trilogue agreement on 12 June 2025; the co-legislators signed the final text 26 November 2025 and it was published in the OJ on 12 December 2025 as Regulation (EU) 2025/2455, establishing a common EU data platform on chemicals (findable/accessible/interoperable/reusable data) and a monitoring and outlook framework for chemicals, including data on chemicals in articles/products and on safer alternatives. The platform must be established by 2 January 2029.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation (EU) 2025/2455 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2025/2455/oj/eng"
      },
      {
        "title": "COM(2023) 779 final - Common data platform on chemicals",
        "url": "https://environment.ec.europa.eu/system/files/2023-12/COM_2023_779_1_EN_ACT_part1_v2.pdf"
      },
      {
        "title": "Common data platform on chemicals and monitoring and outlook framework for chemicals | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-access-to-and-availability-sharing-and-re-use-of-chemical-data-(refit)"
      },
      {
        "title": "EU to Establish Unified Chemicals Data Platform by 2029 - ChemRadar",
        "url": "https://www.chemradar.com/en/lawinfo/news/detail/f7bl60a6u1a8"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM: original entry left this 'ongoing' pending confirmation. WebSearch plus direct CELEX 32025R2455 curl of the EU Publications Office cellar record confirm formal adoption: title 'REGULATION ... establishing a common data platform on chemicals ... establishing a monitoring and outlook framework for chemicals' - exact match to this initiative; signed 2025-11-26, published OJ 2025-12-12. Status updated from 'ongoing' to 'adopted'.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "eprtr-iep",
    "name": "E-PRTR revision / Industrial Emissions Portal Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)157 final",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2024/1244",
    "actDate": "2024-04-24",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2024/1244/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-industrial-emissions-portal",
    "summaryNow": "Despite the Annex 2 April-2024 snapshot recording the proposal's status as 'to be withdrawn', it was not withdrawn: it was adopted the same day as the IED recast, as Regulation (EU) 2024/1244 of 24 April 2024, repealing the E-PRTR Regulation (EC) No 166/2006 and establishing the Industrial Emissions Portal. It applies from 1 January 2028 (E-PRTR keeps applying for 2026 reporting in the interim).",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation (EU) 2024/1244 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/1244/oj/eng"
      },
      {
        "title": "Proposal for a regulation ... Industrial Emissions Portal | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-industrial-emissions-portal"
      },
      {
        "title": "Industrial Emissions Portal Regulation - supporting EU policy objectives (UNECE)",
        "url": "https://unece.org/sites/default/files/2024-12/3_EU.pdf"
      },
      {
        "title": "Revised Industrial Emissions Directive and Regulation Establishing the ... (EEB)",
        "url": "https://eeb.org/wp-content/uploads/2024/08/IED-and-IEP-R-assessement.pdf"
      }
    ],
    "verification": "verified",
    "checkNotes": "Directly fetched the EU Publications Office cellar record for CELEX 32024R1244 (not just the OK/exists check in celex_report.txt): confirms title 'REGULATION ... on reporting of environmental data from industrial installations and establishing an Industrial Emissions Portal', signature/adoption date 2024-04-24, OJ publication 2024-05-02, and it cites/repeals Reg. (EC) 166/2006 and relates to Dir. 2010/75/EU (IED base act). The Annex-2-to-adopted reversal is genuine, not a hallucination.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "pfas-restriction",
    "name": "ECHA PFAS restriction proposal (REACH Annex XVII)",
    "group2024": "ongoing",
    "timing2024": "na",
    "ref2024": "Submitted by ECHA",
    "statusNow": "ongoing",
    "summaryNow": "Not a Commission legislative proposal but a REACH restriction dossier submitted by five national authorities via ECHA (dossier published 7 February 2023). RAC concluded its assessment/adopted its final opinion on 3 March 2026, supporting a broad ban with only a PPE/impregnating-agents derogation; ECHA released the RAC final opinion together with SEAC's draft opinion on 26 March 2026, opening a public consultation on the SEAC draft running to 25 May 2026 - SEAC supports additional targeted (time-limited) derogations. SEAC is expected to adopt its final opinion by the end of 2026, after which the opinions go to the Commission, which would draft an actual restriction measure for a REACH Committee vote - so no restriction is in force as of July 2026.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "ECHA Committees Advance Broad PFAS Restriction Under REACH | Arnold & Porter",
        "url": "https://www.arnoldporter.com/en/perspectives/advisories/2026/03/echa-committees-advance-broad-pfas-restriction-under-reach"
      },
      {
        "title": "PFAS Restriction: SEAC Draft Published - Consultation Open Until 25 May 2026",
        "url": "https://www.gvw.com/en/news/blog/detail/pfas-restriction-seac-draft-published-consultation-open-until-25-may-2026"
      },
      {
        "title": "RAC and Draft SEAC Opinions Support REACH PFAS Restriction with Targeted Derogations - Bergeson & Campbell",
        "url": "https://www.lawbc.com/rac-and-draft-seac-opinions-support-reach-pfas-restriction-with-targeted-derogations-comments-on-draft-seac-opinion-due-may-25/"
      },
      {
        "title": "ECHA Launches a New Public Consultation on a Proposed Universal Ban on PFAS in the EU | Covington",
        "url": "https://www.cov.com/en/news-and-insights/insights/2026/03/echa-launches-a-new-public-consultation-on-a-proposed-universal-ban-on-pfas-in-the-eu"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM: re-searched and confirmed the RAC/SEAC stage as of mid-2026 - RAC final opinion (3 Mar 2026), SEAC draft opinion released together with it (26 Mar 2026), consultation to 25 May 2026, SEAC final opinion expected end 2026. Matches the original entry; no restriction measure exists yet.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "water-pollutants",
    "name": "Integrated water management – revised lists of surface and groundwater pollutants",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)540 final",
    "statusNow": "adopted",
    "actRef": "Directive (EU) 2026/805",
    "actDate": "2026-03-30",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2026/805/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-sustaining-our-quality-of-life-food-security-water-and-nature/file-integrated-water-management-surface-and-groundwater-pollutants",
    "summaryNow": "Council general approach 19 June 2024; trilogues held Jan/May/Jun/Sept 2025; provisional agreement reached 23 September 2025; ENVI Committee approved the text 20 October 2025 (61-16-7); Council formally signed off on 17 February 2026. The co-legislators signed the final text on 30 March 2026 as Directive (EU) 2026/805, amending the Water Framework Directive 2000/60/EC, the Groundwater Directive 2006/118/EC and the Environmental Quality Standards Directive 2008/105/EC; published in the OJ on 20 April 2026, entered into force 11 May 2026. It expands the regulated-substance lists to pharmaceuticals, pesticides, bisphenols and a group of 25 PFAS (including TFA). Member States must transpose by 22 December 2027.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "DIRECTIVE (EU) 2026/805 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A32026L0805"
      },
      {
        "title": "Safeguarding water quality: Council signs off on stricter protection rules for surface water and groundwater - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/02/17/safeguarding-water-quality-council-signs-off-on-stricter-protection-rules-for-surface-water-and-groundwater/"
      },
      {
        "title": "EU water pollution directive enters into force, closing years of legislative work - Smart Water Magazine",
        "url": "https://smartwatermagazine.com/news/smart-water-magazine/eu-water-pollution-directive-enters-force-closing-years-legislative-work"
      },
      {
        "title": "EU Council adopts improved water quality standards - EEB",
        "url": "https://eeb.org/en/eu-council-adopts-improved-water-quality-standards-but-weakens-cornerstone-eu-law-to-protect-water/"
      },
      {
        "title": "Review of the lists of pollutants affecting surface waters and groundwater | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-sustaining-our-quality-of-life-food-security-water-and-nature/file-integrated-water-management-surface-and-groundwater-pollutants"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM: original entry left this 'ongoing' pending confirmation of final adoption. WebSearch plus direct CELEX 32026L0805 curl of the EU Publications Office cellar record confirm formal adoption: signed 2026-03-30, published OJ 2026-04-20 (in force 11 May 2026), amending Dir. 2000/60/EC, 2006/118/EC and 2008/105/EC - matches COM(2022)540's subject matter (Annex 2's cited '2007/60/EC' appears to be an OCR/typo for 2000/60/EC, the Water Framework Directive). Status updated from 'ongoing' to 'adopted'.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "ambient-air-quality",
    "name": "Revision of EU ambient air quality legislation (recast)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)542 final",
    "statusNow": "adopted",
    "actRef": "Directive (EU) 2024/2881",
    "actDate": "2024-10-23",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/2881/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-ambient-air-quality-legislation",
    "summaryNow": "Adopted 23 October 2024, published 20 November 2024, in force 10 December 2024; sets 2030 limit values closer to WHO guidance (e.g. PM2.5 to 10 ug/m3, NO2 to 20 ug/m3) and adds monitoring of black carbon, ultrafine particles, ammonia and NMVOCs. Transposition deadline 11 December 2026. No reopening found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive (EU) 2024/2881 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/2881/oj/eng"
      },
      {
        "title": "Air pollution: Parliament adopts revised law to improve air quality | European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20240419IPR20587/air-pollution-parliament-adopts-revised-law-to-improve-air-quality"
      },
      {
        "title": "Revision of the Ambient Air Quality Directives | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-ambient-air-quality-legislation"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024L2881 confirmed OK in celex_report.txt; not in omnibus.json actsReopened lists; status claims dated before 2025 and internally consistent, so no further search performed per budget guidance.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "clp",
    "name": "Revision of the CLP Regulation (classification, labelling and packaging of chemicals)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2022)748 final - Scheduled for 2021",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2024/2865",
    "actDate": "2024-10-23",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202402865",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-rules-on-classification-labelling-and-packaging-of-chemicals",
    "summaryNow": "Adopted 23 October 2024, published 20 November 2024, in force 10 December 2024; introduces digital labelling, a classification regime for multi-constituent substances (MOCS) and updated label formats. Since then, reopened twice: (1) Regulation (EU) 2025/2439 ('Stop the Clock', signed 26 November 2025, OJ 3 December 2025) postpones several CLP application dates (digital label/advertising/online sales/fuel-pump provisions) to 1 January 2028; (2) the Chemicals Omnibus VI proposal COM(2025)526/COM(2025)531 of 8 July 2025 further amends the CLP Regulation (together with the Cosmetics Regulation and Fertilising Products Regulation) as part of a simplification package; Council agreed its negotiating mandate on 5 November 2025, EP committees adopted their report 15 April 2026, and Council and Parliament reached a provisional political agreement on 17 June 2026 - formal adoption (final act/OJ number) was still pending as of July 2026.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "CLP Stop-the-Clock",
        "what": "Postpones several 2024 CLP application dates (digital labelling, advertising, distance sales, fuel-station labelling) to 1 January 2028",
        "ref": "Regulation (EU) 2025/2439",
        "status": "adopted",
        "date": "2025-12-03",
        "url": "https://www.normachem.com/en/normachem-informs/publication-of-regulation-eu-20252439-key-clp-deadlines-postponed-to-1-january-2028-stop-the-clock"
      },
      {
        "pkg": "Chemicals Omnibus VI",
        "what": "Simplifies requirements/procedures under the CLP, Cosmetics and Fertilising Products Regulations",
        "ref": "COM(2025)526 / COM(2025)531",
        "status": "provisional-agreement",
        "date": "2025-07",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/17/council-and-parliament-strike-deal-to-simplify-requirements-for-chemical-products/"
      }
    ],
    "sources": [
      {
        "title": "REGULATION (EU) 2024/2865 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202402865"
      },
      {
        "title": "Revision of Regulation (EC) No 1272/2008 ... | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-rules-on-classification-labelling-and-packaging-of-chemicals"
      },
      {
        "title": "Publication of Regulation (EU) 2025/2439: key CLP deadlines postponed to 1 January 2028 ('Stop the Clock')",
        "url": "https://www.normachem.com/en/normachem-informs/publication-of-regulation-eu-20252439-key-clp-deadlines-postponed-to-1-january-2028-stop-the-clock"
      },
      {
        "title": "Council signs off postponing rules on classification, labelling, and packaging of chemicals to 2028 - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/11/17/council-signs-off-postponing-rules-on-classification-labelling-and-packaging-of-chemicals-to-2028/"
      },
      {
        "title": "Council and Parliament strike deal to simplify requirements for chemical products - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/17/council-and-parliament-strike-deal-to-simplify-requirements-for-chemical-products/"
      },
      {
        "title": "Omnibus VI - chemicals | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-agriculture-and-rural-development-agri/file-omnibus-vi-chemicals"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM: (1) Fetched CELEX 32025R2439 cellar XML directly - confirmed title 'REGULATION ... amending Regulation (EU) 2024/2865 as regards dates of application and transitional provisions', signed 2025-11-26, but OJ publication date is 2025-12-03, not 9 December 2025 as originally stated - corrected. (2) Cross-checked against research/omnibus.json: Omnibus VI has since moved from 'proposed'/mid-trilogue to a provisional political agreement reached 17 June 2026 (Consilium press release) - updated the reopenedBy entry and summary accordingly; formal adoption/act number still pending as of July 2026.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "detergents",
    "name": "Revision of the Detergents Regulation",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)217 final - Scheduled for Q4/2022",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2026/405",
    "actDate": "2026-02-11",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2026/405/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-detergents-regulation",
    "summaryNow": "EP first-reading position 27 February 2024; Council general approach 14 June 2024; final text agreed and adopted, published in the OJ on 2 March 2026 as Regulation (EU) 2026/405, entering into force 22 March 2026. It repeals Regulation (EC) No 648/2004, abolishes biodegradability derogations, bans animal testing and introduces a Digital Product Passport; it applies in full from 23 September 2029. Too recently adopted for any reopening to have occurred.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - 2026/405 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2026/405/oj/eng"
      },
      {
        "title": "EU's New Detergents and Surfactants Regulation: (EU) 2026/405 Explained - REACH24H",
        "url": "https://en.reach24h.com/news/industry-news/chemical/eu-detergents-and-surfactants-regulation-EU-2026-405"
      },
      {
        "title": "Revision of the Detergents Regulation (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-detergents-regulation"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM: CELEX 32026R0405 confirmed OK in celex_report.txt with title 'Safer detergents and surfactants for EU consumers', matching this initiative. Dates internally consistent.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "mercury",
    "name": "Revision of the EU Mercury Regulation (dental amalgam phase-out)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)395 final - Scheduled for Q4/2022",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2024/1849",
    "actDate": "2024-06-13",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202401849",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-mercury-regulation",
    "summaryNow": "Adopted 13 June 2024, published 10 July 2024, in force 30 July 2024. Amends Regulation (EU) 2017/852 to phase out dental amalgam and ban a number of mercury-added products; the Commission owed a report on the socio-economic impact on patients/dentists by 30 June 2025. No reopening found.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - 2024/1849 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ%3AL_202401849"
      },
      {
        "title": "Revised Mercury Regulation enters into force - European Commission",
        "url": "https://environment.ec.europa.eu/news/revised-mercury-regulation-enters-force-2024-07-30_nl"
      },
      {
        "title": "Revision of Regulation (EU) 2017/852 on mercury | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-mercury-regulation"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32024R1849 confirmed OK in celex_report.txt. Not in omnibus.json actsReopened lists. No further search performed per budget guidance (pre-2025 status, internally consistent).",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "toy-safety",
    "name": "Revision of the Toy Safety Directive (became a Regulation)",
    "group2024": "ongoing",
    "timing2024": "delayed",
    "ref2024": "COM(2023)462 final - Scheduled for Q4/2022",
    "statusNow": "adopted",
    "actRef": "Regulation (EU) 2025/2509",
    "actDate": "2025-11-26",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/reg/2025/2509/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-internal-market-and-consumer-protection-imco/file-toy-safety-directive-(refit)",
    "summaryNow": "Political agreement reached 10 April 2025, endorsed by Coreper 11 June 2025 and IMCO 26 June 2025; signed by Parliament and Council 26 November 2025, published in the OJ on 12 December 2025 as Regulation (EU) 2025/2509, in force since 1 January 2026, repealing Directive 2009/48/EC. It expands prohibited-substance rules (including PFAS and certain bisphenols) and introduces a digital product passport; most obligations apply generally only from 1 August 2030 under transitional provisions.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Regulation - 2025/2509 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2025/2509/oj/eng"
      },
      {
        "title": "Toy safety: deal on new measures to protect children's health | European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20250407IPR27704/toy-safety-deal-on-new-measures-to-protect-children-s-health"
      },
      {
        "title": "European Union Adopts a New Toy Safety Regulation | Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/12/european-union-adopts-a-new-toy-safety-regulation"
      },
      {
        "title": "Toy Safety Directive (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-internal-market-and-consumer-protection-imco/file-toy-safety-directive-(refit)"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM: CELEX 32025R2509 confirmed OK in celex_report.txt with title confirming it is a Regulation on toy safety repealing Directive 2009/48/EC (German-language cellar title: 'Verordnung ... uber die Sicherheit von Spielzeug und zur Aufhebung der Richtlinie 2009/48/EG'), consistent with 'became a Regulation'. Corrected actDate from the OJ-publication date (2025-12-12) to the actual signature/adoption date (2025-11-26, per EUR-Lex convention used elsewhere in this dataset) to be consistent with how actDate is defined for other entries in this file.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "sur-pesticides",
    "name": "Sustainable Use of Plant Protection Products Regulation (SUR)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)305 final",
    "statusNow": "withdrawn",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-sustainable-use-of-pesticides-%E2%80%93-revision-of-the-eu-rules",
    "summaryNow": "European Parliament rejected the text on 22 November 2023 and, after further Council deadlock, the Commission announced withdrawal on 6 February 2024; formal withdrawal was published in the OJ on 6 May 2024. A successor initiative has been floated after the Commission's Strategic Dialogue on the Future of EU Agriculture, but nothing has been tabled as of July 2026.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "European Commission announces withdrawal of proposal for regulation on sustainable use of plant protection products | GOV.SI",
        "url": "https://www.gov.si/en/news/2024-02-29-european-commission-announces-withdrawal-of-proposal-for-regulation-on-sustainable-use-of-plant-protection-products/"
      },
      {
        "title": "Proposal for a regulation on the sustainable use of plant protection products | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-sustainable-use-of-pesticides-%E2%80%93-revision-of-the-eu-rules"
      },
      {
        "title": "Sustainable use of plant protection products - OEIL",
        "url": "https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1767244"
      }
    ],
    "verification": "verified",
    "checkNotes": "WebSearch confirms formal withdrawal published in OJ on 6 May 2024, matching the entry exactly. No successor proposal found as of July 2026.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "uwwtd",
    "name": "Urban Wastewater Treatment Directive (recast)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)541 final",
    "statusNow": "adopted",
    "actRef": "Directive (EU) 2024/3019",
    "actDate": "2024-11-27",
    "eurlexUrl": "https://eur-lex.europa.eu/eli/dir/2024/3019/oj/eng",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-urban-wastewater-treatment-directive-(refit)",
    "summaryNow": "Adopted 27 November 2024, published 12 December 2024; broadens scope to micropollutants, energy neutrality (2045 target for plants >=10,000 p.e.) and stormwater management; Member States must transpose by 31 July 2027. Its extended producer responsibility scheme (pharmaceutical/cosmetics producers covering >=80% of quaternary-treatment costs by 31 Dec 2028) has drawn legal challenges from pharma/cosmetics companies and associations; the General Court declared those direct-action appeals inadmissible for lack of individual concern, and a European Parliament plenary debate/parliamentary question (O-000013/2026, agenda item 25 March 2026) on medicine-supply-security implications followed. No legislative reopening, omnibus inclusion, or amending proposal was found as of July 2026 - only implementation-stage litigation and parliamentary scrutiny.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Directive (EU) 2024/3019 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2024/3019/oj/eng"
      },
      {
        "title": "Revision of the Urban Wastewater Treatment Directive | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-the-urban-wastewater-treatment-directive-(refit)"
      },
      {
        "title": "Waste Water Directive and EPR: appeals by pharmaceutical and cosmetics industries rejected - Renewable Matter",
        "url": "https://www.renewablematter.eu/en/waste-water-directive-epr-appeals-pharmaceutical-cosmetics-industries-rejected"
      },
      {
        "title": "Urban wastewater treatment rules' impact on pharmaceutical sector - European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/agenda/plenary-news/2026-03-25/6/urban-wastewater-treatment-rules-impact-on-pharmaceutical-sector"
      }
    ],
    "verification": "corrected",
    "checkNotes": "FOCUS ITEM: checked specifically for a 2026 reopening tied to the pharma-industry EPR dispute. Found litigation (General Court dismissed appeals as inadmissible) and a parliamentary question/debate, but no concrete amending legislative document - per the brief's rule, did not mark reopened=true, but replaced the stale EEB-briefing citation with this more concrete and current information.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "bathing-water",
    "name": "Bathing water quality – review of EU rules (Dir. 2006/7/EC)",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for Q1/2023",
    "statusNow": "shelved",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-review-of-the-bathing-water-directive-(refit)",
    "summaryNow": "The Commission published its REFIT evaluation of the Bathing Water Directive on 6 March 2025 (SWD(2025)52), concluding the Directive remains effective at protecting bathers' health and adds EU-wide value, but recommending modernised, potentially year-round monitoring and additional pollutant parameters rather than a legislative revision. As of the Commission's own environment webpage, no legislative proposal is planned; the Commission instead commits to working with Member States on implementation, and possible future changes are being folded into the broader Water Resilience Strategy / targeted Water Framework Directive revision (call for evidence 17 March - 14 April 2026) rather than a dedicated Bathing Water Directive proposal.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Bathing water - Environment - European Commission",
        "url": "https://environment.ec.europa.eu/topics/water/bathing-water_en"
      },
      {
        "title": "Bathing Water Directive needs modernising and improvement - Water News Europe",
        "url": "https://www.waternewseurope.com/european-commission-bathing-water-directive-needs-modernising-and-improvement/"
      },
      {
        "title": "Review of the bathing water directive (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-review-of-the-bathing-water-directive-(refit)"
      },
      {
        "title": "SWD(2025) 52 final",
        "url": "https://environment.ec.europa.eu/document/download/4be6f6f9-6fd5-4a90-888d-3c77b29bbeac_en?filename=SWD%282025%2952_0.pdf"
      }
    ],
    "verification": "verified",
    "checkNotes": "Re-searched: confirms SWD(2025)52 (6 March 2025) evaluation found the Directive effective and no formal legislative proposal has since been tabled as of July 2026. Matches the entry.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "export-ban-hazardous-chemicals",
    "name": "Proposal for a Regulation prohibiting production for export of (hazardous) chemicals banned in the EU",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for Q4/2023",
    "statusNow": "shelved",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-chemicals-strategy",
    "summaryNow": "Committed under the 2020 Chemicals Strategy for Sustainability with legislation promised by 2023; a public consultation ran in 2023, but six years on no legislative proposal or public impact assessment has ever been published. As of June 2026 press releases from PAN Europe and Corporate Europe Observatory (End Toxic Pesticide Trade Coalition), the Commission has effectively abandoned the export-ban approach, with media reports indicating it will instead work with importing countries under existing frameworks and improve enforcement of the existing PIC Regulation (EU) No 649/2012 (itself updated 1 March 2025, with further updates proposed applicable from 1 October 2026 to reflect Rotterdam Convention COP12 decisions). No production-for-export ban proposal has been tabled.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "European Commission backtracks on promise to end EU exports of banned and dangerous pesticides | PAN Europe",
        "url": "https://www.pan-europe.info/press-releases/2026/06/european-commission-backtracks-promise-end-eu-exports-banned-and-dangerous"
      },
      {
        "title": "European Commission backtracks on promise to end EU exports of banned and dangerous pesticides | Corporate Europe Observatory",
        "url": "https://corporateeurope.org/en/2026/06/european-commission-backtracks-promise-end-eu-exports-banned-and-dangerous-pesticides"
      },
      {
        "title": "Open Public Consultation on the production for export of hazardous chemicals banned in the EU - European Commission",
        "url": "https://environment.ec.europa.eu/news/open-public-consultation-production-export-hazardous-chemicals-banned-eu-2023-05-08_en"
      },
      {
        "title": "22 hazardous chemicals added to EU regulation on imports and exports - ECHA",
        "url": "https://echa.europa.eu/-/22-hazardous-chemicals-added-to-eu-regulation-on-imports-and-exports"
      },
      {
        "title": "EU Revises Hazardous Chemical Import and Export Requirements",
        "url": "https://www.certifiedcosmetics.com/blog/regulatory-news/eu-revises-hazardous-chemical-import-and-export-requirements/"
      }
    ],
    "verification": "verified",
    "checkNotes": "Re-searched: confirmed via a second independent outlet (Corporate Europe Observatory) reporting the same June 2026 story as the original PAN Europe source. No legislative proposal exists; entry's 'shelved' status holds. Added the corroborating source.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "reach-revision",
    "name": "REACH revision (Reg. (EC) 1907/2006)",
    "group2024": "planned",
    "timing2024": "delayed",
    "ref2024": "Planned for 2021/2022 -> Moved to Q4/2023 (EC Work Programme 2023); uncertain when the proposal will be presented",
    "statusNow": "shelved",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-reach-revision",
    "summaryNow": "The Commission's 2025 Work Programme (11 February 2025) again announced a REACH revision for Q4 2025, but it was not tabled: the Regulatory Scrutiny Board gave a negative opinion on the supporting impact assessment in September 2025, pushing the timeline into 2026. On 27 April 2026 Environment Commissioner Jessika Roswall told the European Parliament's ENVI Committee: 'We have come to the conclusion to not open REACH at this point' - effectively shelving the standalone revision, citing the need for regulatory certainty ('now is not the time to revise REACH'), with related elements such as PFAS restriction and ECHA governance continuing on separate tracks, and simplification/enforcement of the existing framework prioritised instead. No REACH revision proposal was tabled by July 2026; the Chemicals Omnibus VI (COM(2025)526/531) does not touch REACH itself (it amends CLP, Cosmetics and Fertilising Products Regulations) and does not formally replace this shelved revision.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Revision of the regulation on REACH | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-revision-of-the-reach-regulation"
      },
      {
        "title": "REACH Revision Outlook: Key Takeaways from ENVI Exchange with Commissioner Jessika Roswall (27/4/2026) - REACHLaw",
        "url": "https://www.reachlaw.fi/reach-revision-outlook-key-takeaways-from-envi-exchange-with-commissioner-jessika-roswall-04-27-2026/"
      },
      {
        "title": "Roswall confirms REACH revision shelved - ENDS Europe",
        "url": "https://www.endseurope.com/article/1956259/roswall-confirms-reach-revision-shelved"
      },
      {
        "title": "European lawmakers shelve major revision of REACH chemical regulation - C&EN",
        "url": "https://cen.acs.org/policy/chemical-regulation/europe-reach-chemical-regulation-shelved/104/web/2026/04"
      },
      {
        "title": "EU REACH regulation: Europe steps back from major revisions - SOCI",
        "url": "https://www.soci.org/news/2026/5/reach-regulation-europe-says-major-revisions-not-helpful-now"
      },
      {
        "title": "EU REACH 2.0 Faces Further Delay Due to Negative Opinion from the RSB - CIRS Group",
        "url": "https://www.cirs-group.com/en/chemicals/eu-reach-2-faces-further-delay-due-to-negative-opinion-from-regulatory-scrutiny-board"
      }
    ],
    "verification": "verified",
    "checkNotes": "FOCUS ITEM: WebSearch confirms the 27 April 2026 Roswall/ENVI statement verbatim ('We have come to the conclusion to not open REACH at this point') across multiple independent outlets (REACHLaw, ENDS Europe, C&EN, SOCI). Also confirmed the Chemicals Omnibus VI does not formally replace REACH - it amends CLP/Cosmetics/Fertilising Products only, per research/omnibus.json.",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "cosmetics-revision",
    "name": "Revision of the Cosmetic Products Regulation (EC) 1223/2009",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Planned for Q4/2022",
    "statusNow": "ongoing",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-revision-of-the-cosmetic-products-regulation",
    "summaryNow": "The dedicated Cosmetics Regulation revision promised (originally under the Chemicals Strategy for Sustainability) for 2022 was never tabled as a standalone proposal. Instead, targeted cosmetics changes (longer CMR transition periods, streamlined nanomaterial notification, fewer duplicate reporting requirements) were folded into the Chemicals Omnibus VI simplification proposal COM(2025)526/COM(2025)531, presented 8 July 2025 (consultation open to 14 October 2025); the Council agreed its negotiating mandate on 5 November 2025 (shortening the CMR phase-out timeline and reinstating nanomaterial prior notification vs. the Commission text), EP committees adopted their report 15 April 2026, and Council and Parliament reached a provisional political agreement on 17 June 2026; formal adoption (final act/OJ number) was still pending as of July 2026.",
    "reopened": false,
    "reopenedBy": [],
    "sources": [
      {
        "title": "Revision of the Cosmetic Products Regulation | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-new-plan-for-europe-s-sustainable-prosperity-and-competitiveness/file-revision-of-the-cosmetic-products-regulation"
      },
      {
        "title": "Council and Parliament strike deal to simplify requirements for chemical products - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/17/council-and-parliament-strike-deal-to-simplify-requirements-for-chemical-products/"
      },
      {
        "title": "Omnibus VI - Cosmetics Europe",
        "url": "https://cosmeticseurope.eu/policy-corner/omnibus-vi/"
      },
      {
        "title": "The Chemicals Omnibus file and the use of CMRs in cosmetics: a first halt to simplification?",
        "url": "https://www.sustainabilityinbusiness.blog/2026/01/the-chemicals-omnibus-file-and-the-use-of-cmrs-in-cosmetics-a-first-halt-to-simplification/"
      },
      {
        "title": "EU Proposes Cosmetics Regulation Amendment: 15 CMR Substances to Be Banned - CIRS Group",
        "url": "https://www.cirs-group.com/en/cosmetics/eu-proposes-cosmetics-regulation-amendment-15-cmr-substances-to-be-banned-and-annexes-iii-v-to-be-revised"
      }
    ],
    "verification": "corrected",
    "checkNotes": "Cross-checked against research/omnibus.json: Omnibus VI (which folds in the cosmetics changes) reached a provisional political agreement on 17 June 2026, not merely 'trilogues continuing into early 2026' as originally stated - updated summary to reflect the same status as the CLP entry's Omnibus VI description for internal consistency (both are reopened/carried by the same package).",
    "areas": [
      "pollution-chemicals"
    ]
  },
  {
    "id": "eudr",
    "name": "Deforestation Regulation (EUDR)",
    "group2024": "adopted",
    "timing2024": "na",
    "ref2024": "Reg. (EU) 2023/1115",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2023/1115",
    "actDate": "2023-06",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-deforestation-and-forest-degradation-linked-to-products-placed-on-the-eu-market",
    "summaryNow": "EUDR (Reg. 2023/1115) is in force but its application date has been postponed twice since April 2024. Reg. (EU) 2024/3234 (adopted 19 Dec 2024, OJ 23 Dec 2024) postponed application by one year to 30 Dec 2025 (large/medium operators) / 30 June 2026 (SMEs). Following a Commission proposal tabled 21 Oct 2025, co-legislators reached a deal 4 Dec 2025 and formally adopted Reg. (EU) 2025/2650 (EP 17 Dec 2025, Council sign-off 18 Dec 2025, OJ 23 Dec 2025), further postponing application to 30 Dec 2026 (medium/large operators) / 30 June 2027 (micro/small - a simplified one-off declaration regime, not a full exemption), simplifying due-diligence obligations, excluding printed/paper products from scope. The mandated simplification report was published 4 May 2026 (COM(2026)191 final) and concluded that no further changes to the operative EUDR text are needed; instead the Commission adopted a Delegated Act narrowing/adjusting Annex I product scope (removing e.g. cattle hides/skins/leather, retreaded tyres, soybean seeds for sowing; adding e.g. soluble coffee, some palm-oil derivatives) plus an Implementing Act on the Information System, both on 13 July 2026, now subject to a 2-month EP/Council scrutiny period before entry into force. No third amending Regulation exists or is planned as of end-July 2026; the two postponement Regulations (2024/3234, 2025/2650) remain the only amending acts.",
    "reopened": true,
    "reopenedBy": [
      {
        "pkg": "EUDR one-year postponement",
        "what": "Postponed the EUDR application date by one year for all operator categories",
        "ref": "Reg. (EU) 2024/3234",
        "status": "adopted",
        "date": "2024-12",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/3234/oj/eng"
      },
      {
        "pkg": "EUDR targeted revision (simplification + further postponement)",
        "what": "Further postponed application to Dec 2026/June 2027 and simplified due-diligence/traceability obligations",
        "ref": "Reg. (EU) 2025/2650",
        "status": "adopted",
        "date": "2025-12",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/18/deforestation-council-signs-off-targeted-revision-to-simplify-and-postpone-the-regulation/"
      },
      {
        "pkg": "EUDR Annex I product-scope Delegated Act + Information System Implementing Act",
        "what": "Narrows/adjusts the list of in-scope commodities/products in Annex I and updates the EUDR Information System rules; follow-up to the 4 May 2026 simplification report which found no further changes to the operative text necessary",
        "ref": "Delegated Act adopted 13 July 2026 (not yet published/in force; pending 2-month EP/Council scrutiny)",
        "status": "adopted",
        "date": "2026-07",
        "url": "https://eos-oes.eu/2026/07/13/commission-adopted-delegated-act-on-the-product-scope-and-implementing-act-on-the-information-system-today/"
      }
    ],
    "sources": [
      {
        "title": "Regulation - EU - 2024/3234 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/3234/oj/eng"
      },
      {
        "title": "Deforestation: Council signs off targeted revision to simplify and postpone the regulation - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/18/deforestation-council-signs-off-targeted-revision-to-simplify-and-postpone-the-regulation/"
      },
      {
        "title": "EU deforestation law: Council and Parliament reach a deal on targeted revision - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/04/eu-deforestation-law-council-and-parliament-reach-a-deal-on-targeted-revision/"
      },
      {
        "title": "Deforestation law: Parliament adopts changes to postpone and simplify measures | European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20251211IPR32168/deforestation-law-parliament-adopts-changes-to-postpone-and-simplify-measures"
      },
      {
        "title": "European Union: EU Commission Publishes Simplification Review Report on Deforestation Regulation | USDA FAS",
        "url": "https://www.fas.usda.gov/data/gain/2026/05/european-union-eu-commission-publishes-simplification-review-report-deforestation-regulation"
      },
      {
        "title": "Blog Post EUDR: European Commission Finalizes the EUDR Product Scope and Information System Ahead of December 2026 Application - Baker McKenzie",
        "url": "https://supplychaincompliance.bakermckenzie.com/2026/07/16/blog-post-eudr-european-commission-finalizes-the-eudr-product-scope-and-information-system-ahead-of-december-2026-application/"
      },
      {
        "title": "EUDR postponed and simplified: what Regulation (EU) 2025/2650 really changes - Lexology",
        "url": "https://www.lexology.com/library/detail.aspx?g=f20d1e1f-279f-414e-bd2a-7eea491a6a5c"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 32023R1115, 32024R3234, 32025R2650 all mechanically OK in celex_report.txt and cross-consistent with omnibus.json's separate EUDR package entry (same refs/dates). Added the 4 May 2026 simplification report (COM(2026)191) and the 13 July 2026 Annex I Delegated Act/Implementing Act, confirming there is no third amending Regulation and none is planned - only a sub-legislative Annex I adjustment, still under EP/Council scrutiny as of this check. Clarified the micro/small-operator provision is a simplified declaration regime, not a full exemption.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "animal-welfare-transport",
    "name": "Animal Welfare During Transport Regulation",
    "group2024": "ongoing",
    "timing2024": "na",
    "ref2024": "COM(2023)770 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0770",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-legislation-on-animal-welfare",
    "summaryNow": "Still in Council, no General Approach confirmed as of this check. A revised Danish-Presidency text was circulated 22 July 2025; work continued under the Cyprus Presidency (H1 2026) with a European Parliament stakeholder event on the file held 21 Apr 2026 and a Commission study on digital modalities for animal-welfare-during-transport published June 2026, but no Council General Approach or trilogue start date could be confirmed as of late July 2026. Listed again in the Commission's 2026 work programme (~3 animal-welfare-related items) alongside a separate proposal on welfare/traceability of dogs and cats and a non-legislative EU Livestock Strategy (adopted 7 July 2026, alongside the EU Protein Plan) that touches on animal-welfare elements but is not itself the transport Regulation.",
    "reopened": false,
    "sources": [
      {
        "title": "Revision of EU legislation on animal welfare: Protection of animals during transport | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-legislation-on-animal-welfare"
      },
      {
        "title": "FACE | New EU Rules on Animal Transport: Challenges and Perspectives - European Parliament, 21 April 2026",
        "url": "https://www.face.eu/2026/04/new-eu-rules-on-animal-transport-challenges-and-perspectives-european-parliament-21-april-2026/"
      },
      {
        "title": "52023PC0770 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0770"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 52023PC0770 OK (matches initiative). Updated with mid-2026 developments (Apr 2026 EP event, Jun 2026 Commission digital-modalities study) but could not find evidence of a Council General Approach or trilogue start, so 'ongoing' stands unchanged; added the CWP2026 livestock strategy/dogs-cats-proposal context for completeness.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "forest-monitoring-framework",
    "name": "EU Forest Monitoring Framework Regulation",
    "group2024": "ongoing",
    "timing2024": "na",
    "ref2024": "COM(2023)728 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52023PC0728",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-eu-forest-observation-reporting-and-data-collection",
    "summaryNow": "Politically dead but not confirmed formally withdrawn. Council adopted a General Approach on 24 June 2025, but the EP plenary rejected the Commission's proposal at first reading on 21 Oct 2025 (370 for rejection vs 264 against, 9 abstentions), citing duplication with national monitoring systems and calling on the Commission to withdraw it. The Commission's 2026 Work Programme (presented the same day, 21 Oct 2025) lists this file in its withdrawal annex (Annex 4, alongside ~24 other draft laws) and states an intention to withdraw within six months (i.e. by roughly late April 2026). That six-month window has now passed (as of end-July 2026) without a specific, citable Official Journal 'list of withdrawn Commission proposals' notice naming this file being found in this research; indirect evidence (reports of budget-neutral fund transfers from the European Environment Agency back to the LIFE programme following the proposal's shelving) is consistent with the file being dead but is not itself an OJ citation. StatusNow therefore kept as 'ongoing' rather than 'withdrawn' per the fact-check brief's instruction to require a citable formal act; treat this file as ongoing-but-dead in practice.",
    "reopened": false,
    "sources": [
      {
        "title": "Texts adopted - Monitoring framework for resilient European forests - 21 October 2025 | European Parliament",
        "url": "https://www.europarl.europa.eu/doceo/document/TA-10-2025-0240_EN.html"
      },
      {
        "title": "Forest monitoring: Commission's proposal fails to win European Parliament support - CEPF",
        "url": "https://www.cepf-eu.org/news-media/forest-monitoring-commissions-proposal-fails-win-european-parliament-support"
      },
      {
        "title": "Council backs new monitoring framework to boost the sustainable management of forests - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/06/24/council-backs-new-monitoring-framework-to-boost-the-sustainable-management-of-forests/"
      },
      {
        "title": "Commission's 2026 Work Programme: Europe cannot deregulate its way out of crisis - EEB",
        "url": "https://eeb.org/en/commissions-2026-work-programme/"
      },
      {
        "title": "What Is the EU Forest Monitoring Law? - carbongap tracker",
        "url": "https://tracker.carbongap.org/policy/forest-monitoring-law/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 52023PC0728 OK (matches the original proposal). Per FOCUS ITEM 3 instructions: confirmed the file IS listed in the CWP2026 withdrawal annex (Annex 4), but could NOT find a citable formal OJ withdrawal notice as of end-July 2026 despite the announced 6-month deadline having passed. statusNow changed from 'withdrawn' to 'ongoing' (ongoing-but-dead) accordingly, with the uncertainty documented rather than asserted as fact.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "forest-reproductive-material",
    "name": "Forest Reproductive Material Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)415 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2026/1392",
    "actDate": "2026-05-20",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R1392",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-production-and-marketing-of-forest-reproductive-material",
    "summaryNow": "Parliament and Council reached a provisional agreement on 8 Dec 2025. Formally titled 'Regulation (EU) 2026/1392 of the European Parliament and of the Council of 20 May 2026 on the production and marketing of forest reproductive material, amending Regulations (EU) 2016/2031 and (EU) 2017/625, and repealing Council Directive 1999/105/EC', published in the Official Journal on 26 June 2026, entering into force 20 days later; substantive rules apply only after a transitional period, from 17 July 2031.",
    "reopened": false,
    "sources": [
      {
        "title": "Commission welcomes political agreement on Forest Reproductive Material - The European Sting",
        "url": "https://europeansting.com/2025/12/09/commission-welcomes-political-agreement-on-forest-reproductive-material/"
      },
      {
        "title": "Regulation - EU - 2026/1392 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2026/1392/oj/eng"
      },
      {
        "title": "Council adopts rules to strengthen forest reproductive material and support EU seed sector - Cyprus Presidency / Consilium",
        "url": "https://cyprus-presidency.consilium.europa.eu/en/news/council-adopts-rules-to-strengthen-forest-reproductive-material-and-support-eu-seed-sector/"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 32026R1392 confirmed to exist via Publications Office object metadata, which references the FRM proposal (52023PC0415) as its legal basis and the repealed Directive 31999L0105, confirming title/act match. actDate refined from '2026-05' to the exact act date '2026-05-20' (20 May 2026), and application date confirmed as 17 July 2031, consistent with the dataset's 'from 2031' claim.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "nature-restoration",
    "name": "Nature Restoration Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2022)304 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2024/1991",
    "actDate": "2024-06-24",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1991",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-restoration-of-healthy-ecosystems",
    "summaryNow": "Adopted as Reg. (EU) 2024/1991 (provisional trilogue agreement 9 Nov 2023, EP 1st reading vote 27 Feb 2024, formal Council adoption 17 June 2024; act dated 24 June 2024), in force since 18 Aug 2024. Member States must submit national restoration plans by 2026. There were reports of an attempt to fold Nature Restoration Law changes into the Commission's Dec 2025 'Environmental Omnibus' (Omnibus VIII, COM(2025)980 final package / COM(2025)981-986, tabled 10 Dec 2025): as tabled, the six legislative proposals target the Industrial Emissions Directive, EIA/SEA Directives, INSPIRE, and Extended Producer Responsibility rules (Batteries/Packaging/WEEE/Single-Use Plastics) - not the Nature Restoration Regulation itself. Note this omnibus is NOT yet finalised: the Council only agreed its negotiating stance on 24 June 2026 and it remained in first reading as of July 2026, so this is the position as currently negotiated, not a concluded outcome; it could still be amended before adoption.",
    "reopened": false,
    "sources": [
      {
        "title": "Nature Restoration Law - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Nature_Restoration_Law"
      },
      {
        "title": "Regulation (EU) 2024/1991 ... | FAOLEX",
        "url": "https://www.fao.org/faolex/results/details/en/c/LEX-FAOC228879/"
      },
      {
        "title": "EU Commission jeopardises nature and health safeguards - EEB",
        "url": "https://eeb.org/en/green-protection-gutted-eu-commission-jeopardises-nature-and-health-safeguards/"
      },
      {
        "title": "Council agrees negotiating stance to simplify and streamline environmental rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      },
      {
        "title": "European Commission Presents Environmental Omnibus - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-presents-environmental-omnibus-news-for-epr-scip-industrial-emissions-and-environmental-assessments"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 32024R1991 OK (title matches exactly per Publications Office metadata). Cross-checked against omnibus.json's 'Omnibus VIII - Environmental Omnibus' package: its actsReopened list (IED, EIA, SEA, INSPIRE, EPR rules; Habitats/Birds only 'referenced in some summaries') does NOT include the Nature Restoration Regulation, confirming the original claim - but reworded from 'final omnibus package... unsuccessful' to reflect that Omnibus VIII is still in first reading (Council stance 24 Jun 2026) and not yet concluded, so the non-inclusion of NRR is the current state, not a settled final outcome.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "ngt-plants",
    "name": "New Genomic Techniques (NGT) Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)411 final",
    "statusNow": "adopted",
    "actRef": "Reg. (EU) 2026/1388",
    "actDate": "2026-06-17",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R1388",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-sustaining-our-quality-of-life-food-security-water-and-nature/file-plants-produced-by-certain-new-genomic-techniques",
    "summaryNow": "Provisional trilogue agreement reached 3 Dec 2025, creating a two-tier NGT-1 (treated like conventional plants)/NGT-2 (full GMO rules) system. EP's ENVI committee backed the deal 28 Jan 2026 (47-31); Council formally endorsed the text (press release 'Council adopts new rules', 21 Apr 2026); EP gave final plenary approval 17 June 2026. Formally titled 'Regulation (EU) 2026/1388 of the European Parliament and of the Council of 17 June 2026 on plants obtained by certain new genomic techniques and their products, and amending Regulation (EU) 2017/625', published in OJ L 26 June 2026, entered into force 16 July 2026, applying from 17 July 2028.",
    "reopened": false,
    "sources": [
      {
        "title": "New genomic techniques: Council and Parliament strike deal - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/04/new-genomic-techniques-council-and-parliament-strike-deal-to-boost-the-competitiveness-and-sustainability-of-our-food-systems/"
      },
      {
        "title": "New genomic techniques: Council adopts new rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/04/21/new-genomic-techniques-council-adopts-new-rules-to-boost-sustainable-and-competitive-eu-food-systems/"
      },
      {
        "title": "European Union: European Parliament Passes Landmark New Genomic Techniques Regulation | USDA FAS",
        "url": "https://www.fas.usda.gov/data/gain/2026/06/european-union-european-parliament-passes-landmark-new-genomic-techniques-regulation"
      },
      {
        "title": "Regulation - EU - 2026/1388 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2026/1388/oj/eng"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 32026R1388 confirmed to exist via Publications Office object metadata, which also cross-references the actual NGT proposal (COM(2023)411 / 52023PC0411) as its legal basis, confirming the act matches this initiative and is not a mismatched CELEX. actDate corrected from '2026-07' to '2026-06-17' (17 June 2026 is the act's own date, per WebSearch of the official title; July 2026 was the entry-into-force date, not the act date - the researcher conflated the two).",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "plant-reproductive-material",
    "name": "Plant Reproductive Material Regulation",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)414 final",
    "statusNow": "ongoing",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0414",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-legislation-on-seeds-plant-and-forest-reproductive-material",
    "summaryNow": "Still not formally adopted, but further advanced than the researcher's original (March-2026) cut-off found. Council agreed its position in Dec 2025; trilogues under the Cyprus Presidency were held 3 Feb, 21 Apr and 15 June 2026, alongside 32 technical meetings. On 15 June 2026 Council and Parliament reached a PROVISIONAL political agreement on a major overhaul of the rules on production/marketing of plant reproductive material (digital tools, biomolecular techniques, lighter rules for conservation/locally-adapted varieties and organic PRM). As of this check (late July 2026) the deal still needs formal approval by both Council and Parliament and has not yet been published as an act - no Regulation number exists yet.",
    "reopened": false,
    "sources": [
      {
        "title": "Council and Parliament reach provisional deal on new rules for plant reproductive material - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/15/council-and-parliament-reach-provisional-deal-on-new-rules-for-plant-reproductive-material/"
      },
      {
        "title": "legislative train 02.2026 report - European Parliament",
        "url": "https://www.europarl.europa.eu/legislative-train/carriage/revision-of-legislation-on-seeds-plant-and-forest-reproductive-material/report"
      },
      {
        "title": "52023PC0414 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0414"
      }
    ],
    "verification": "corrected",
    "checkNotes": "CELEX 52023PC0414 OK (matches the initial proposal). Updated: the researcher's dataset stopped at 'trilogues ongoing as of March 2026'; WebSearch found a provisional political agreement was reached 15 June 2026 (Consilium press release), which is new/newer information not yet reflected. Still correctly classified 'ongoing' since formal adoption has not occurred as of this check.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "soil-monitoring",
    "name": "Soil Monitoring Directive (Soil Health Law)",
    "group2024": "ongoing",
    "timing2024": "on-time",
    "ref2024": "COM(2023)416 final",
    "statusNow": "adopted",
    "actRef": "Dir. (EU) 2025/2360",
    "actDate": "2025-11-12",
    "eurlexUrl": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025L2360",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-healthy-soils",
    "summaryNow": "EP adopted its 1st-reading position 10 Apr 2024; Council general approach 17 June 2024; provisional trilogue agreement reached 10 Apr 2025; Council formally adopted 29 Sept 2025 and EP on 23 Oct 2025. Formally titled 'Directive (EU) 2025/2360 of the European Parliament and of the Council of 12 November 2025 on soil monitoring and resilience', published OJ 26 Nov 2025, entering into force 16 Dec 2025, with a 3-year deadline for Member States to transpose. Establishes the first EU-wide framework for monitoring/assessing soil health, targeting healthy soils by 2050.",
    "reopened": false,
    "sources": [
      {
        "title": "Directive - EU - 2025/2360 - EN - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2025/2360/oj/eng"
      },
      {
        "title": "The Soil Monitoring Law is published in the EU Official Journal | Mission Soil Platform",
        "url": "https://mission-soil-platform.ec.europa.eu/news-events/latest-news/soil-monitoring-law-published-eu-official-journal"
      },
      {
        "title": "Council adopts new rules for healthier and more resilient European soils - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/09/29/council-adopts-new-rules-for-healthier-and-more-resilient-european-soils/"
      },
      {
        "title": "Directive (EU) 2025/2360: soil monitoring law ... - EU Law Live",
        "url": "https://eulawlive.com/directive-eu-2025-2360-soil-monitoring-law-harmonizing-monitoring-and-assessment-of-soil-health-across-the-eu-published-in-oj/"
      }
    ],
    "verification": "verified",
    "checkNotes": "CELEX 32025L2360 confirmed via Publications Office metadata (act date field = 2025-11-12, exact match to the dataset's actDate) and independently via WebSearch of the official title 'Directive (EU) 2025/2360 ... of 12 November 2025 on soil monitoring and resilience' - title and date both match the Soil Health Law initiative. No changes needed.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "feed-additives-revision",
    "name": "Feed Additives Regulation Revision",
    "group2024": "planned",
    "timing2024": "delayed",
    "ref2024": "Reg. (EC) 1831/2003",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revisio-of-the-feed-additives-regulation",
    "summaryNow": "The REFIT revision of Reg. (EC) 1831/2003 (roadmap published Dec 2020, consultation 2021) had already dropped out of the Commission Work Programme by 2024 with 'uncertain' timing per the EP legislative train file, and no evidence of tabling, formal shelving, or a renewed 2025/2026 work-programme commitment could be found. The EU adopted an EU Protein Plan and EU Livestock Strategy on 7 July 2026 (non-legislative roadmap for the livestock/feed sector) but this does not reference or supersede a Reg. 1831/2003 revision. 2025-2026 sources (EFSA, industry trade press, feedlegislation.org) continue to discuss only routine authorisations/renewals under the existing Regulation, not a revision proposal. Status recorded as still nominally 'planned' but effectively stalled/uncertain; could not be fully confirmed either way despite additional targeted searching.",
    "reopened": false,
    "sources": [
      {
        "title": "Revision of Regulation (EC) No 1831/2003 on additives for use in animal nutrition (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revisio-of-the-feed-additives-regulation"
      },
      {
        "title": "Evaluation of the feed additives Regulation - Food Safety, European Commission",
        "url": "https://food.ec.europa.eu/food-safety/animal-feed/feed-additives/evaluation-feed-additives-regulation_en"
      },
      {
        "title": "EU Protein Plan and Livestock Strategy win feed industry support - Feed & Additive Magazine",
        "url": "https://www.feedandadditive.com/eu-protein-plan-and-livestock-strategy-win-feed-industry-support/"
      },
      {
        "title": "Update Feed Legislation January 2026",
        "url": "https://www.feedlegislation.org/en/news/update-feed-legislation-january-2026/"
      }
    ],
    "verification": "unverified",
    "checkNotes": "No CELEX applicable (no proposal exists). Re-checked against the July 2026 EU Livestock Strategy/Protein Plan announcement - it does not include or reference a Reg. 1831/2003 revision. Genuinely could not confirm whether this initiative is still alive, quietly dropped, or merely dormant; left as 'planned' per the researcher's original hedge, honestly flagged unverified.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "marine-strategy-framework-revision",
    "name": "Marine Strategy Framework Directive Revision",
    "group2024": "planned",
    "timing2024": "on-time",
    "ref2024": "Dir. 2008/56/EC",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-review-of-the-marine-strategy-framework-directive",
    "summaryNow": "Not yet tabled as of end-July 2026. The Commission published an evaluation of Directive 2008/56/EC (SWD(2025)50, March 2025) and, on 16 Dec 2025, launched a Call for Evidence/public consultation specifically on the MSFD revision (open until 9 Mar 2026). Separately, on 23 Apr 2026 the Commission launched a broader public consultation on the planned 'European Ocean Act' (running to 16 Jul 2026), which is expected to incorporate/align with the MSFD revision and also touches the Maritime Spatial Planning Directive (2014/89/EU); the Commissioner has indicated the Ocean Act could absorb both files. The Ocean Act (and by extension the MSFD revision) is expected as a legislative proposal by end of 2026 per the Commission Work Programme 2026. No legislative proposal published yet for either file.",
    "reopened": false,
    "sources": [
      {
        "title": "Commission launches consultation on marine protection rules - Environment, European Commission",
        "url": "https://environment.ec.europa.eu/news/commission-launches-consultation-marine-protection-rules-2025-12-16_en"
      },
      {
        "title": "Commission launches public consultation on the European Ocean Act - Oceans and fisheries",
        "url": "https://oceans-and-fisheries.ec.europa.eu/news/commission-launches-public-consultation-european-ocean-act-2026-04-23_en"
      },
      {
        "title": "The European ocean act | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-sustaining-our-quality-of-life-food-security-water-and-nature/file-ocean-act"
      },
      {
        "title": "Review of the marine strategy framework directive (REFIT) | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-review-of-the-marine-strategy-framework-directive"
      }
    ],
    "verification": "corrected",
    "checkNotes": "No CELEX applicable (pre-proposal stage) - confirmed correctly still 'planned'. Added newer development: the broader European Ocean Act consultation (23 Apr-16 Jul 2026), which is the mechanism now expected to carry the MSFD revision forward, per Commission Work Programme 2026.",
    "areas": [
      "biodiversity"
    ]
  },
  {
    "id": "animal-welfare-kept-animals",
    "name": "Welfare of Animals Kept for Economic Purposes (On-Farm Animal Welfare Revision)",
    "group2024": "planned",
    "timing2024": "on-time",
    "statusNow": "planned",
    "legTrainUrl": "https://www.europarl.europa.eu/legislative-train/theme-a-european-green-deal/file-revision-of-eu-legislation-on-animal-welfare",
    "summaryNow": "Broad on-farm animal-welfare revision (incl. ending cage farming) still not tabled as of mid-2026. Commission ran a Call for Evidence (18 June-16 July 2025) and a full public consultation (roughly Sept-Dec 2025, ~190,000 responses) on revising on-farm welfare legislation. Commissioner Olivér Várhelyi has repeatedly said a first legislative proposal is still expected by end of 2026, even though animal-welfare groups and the EP's Animal Welfare Intergroup flagged that the proposal appeared to be omitted from the published 2026 Commission Work Programme. Separately, a non-legislative EU Livestock Strategy (with 'elements of animal welfare') was adopted 7 July 2026 alongside the EU Protein Plan, but this is a strategy document, not the on-farm welfare legislative revision itself.",
    "reopened": false,
    "sources": [
      {
        "title": "New campaign calls for legislative proposals on animal welfare by 2026 | Eurogroup for Animals",
        "url": "https://www.eurogroupforanimals.org/news/new-campaign-calls-legislative-proposals-animal-welfare-2026"
      },
      {
        "title": "Intergroup warns against omission of animal welfare proposal from 2026 Work Programme",
        "url": "https://www.animalwelfareintergroup.eu/news/intergroup-warns-against-omission-animal-welfare-proposal-2026-work-programme"
      },
      {
        "title": "Revision of EU animal-welfare legislation - Food Safety, European Commission",
        "url": "https://food.ec.europa.eu/animals/animal-welfare/evaluations-and-impact-assessment/revision-eu-animal-welfare-legislation_en"
      }
    ],
    "verification": "verified",
    "checkNotes": "No CELEX applicable (no proposal exists). Confirmed via WebSearch that the Commission's 2026 Work Programme documentation itself lists ~3 animal-welfare items (transport revision, dogs/cats welfare-and-traceability proposal, non-legislative Livestock Strategy) but the on-farm/kept-animals welfare revision is not clearly among them, consistent with the Intergroup's 'omission' complaint. Added the 7 July 2026 Livestock Strategy adoption for context; it is distinct from this initiative. Left as 'planned' since the Commissioner maintains an end-2026 commitment.",
    "areas": [
      "biodiversity"
    ]
  }
];

export const OMNIBUS_PACKAGES: OmnibusPackage[] = [
  {
    "name": "EUDR (Deforestation Regulation) postponements, 2024 and 2025",
    "ref": "Regulation (EU) 2024/3234 (first postponement) and Regulation (EU) 2025/2650 (second postponement + simplification)",
    "date": "2024-12",
    "status": "adopted",
    "summary": "First postponement: Regulation (EU) 2024/3234 (OJ 23 Dec 2024, in force 26 Dec 2024) delayed EUDR application by one year, from 30 Dec 2024 to 30 Dec 2025 (large/medium operators) and 30 Jun 2026 (micro/small). Second postponement + simplification: Regulation (EU) 2025/2650 (OJ 23 Dec 2025) postponed application a further year to 30 Dec 2026 (large/medium) and 30 Jun 2027 (micro/small), simplified due-diligence obligations for downstream operators/traders and a new 'low-risk' primary-operator category, and removed printed products (HS ex.49) from scope. A Commission simplification-review report (possibly with a further legislative proposal) is due by 30 Apr 2026 under a review clause.",
    "actsReopened": [
      "EU Deforestation Regulation (EUDR) - Regulation (EU) 2023/1115"
    ],
    "sources": [
      {
        "title": "Deforestation: Council signs off targeted revision to simplify and postpone the regulation - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/18/deforestation-council-signs-off-targeted-revision-to-simplify-and-postpone-the-regulation/"
      },
      {
        "title": "EU deforestation law: Council and Parliament reach a deal on targeted revision - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/04/eu-deforestation-law-council-and-parliament-reach-a-deal-on-targeted-revision/"
      },
      {
        "title": "EU countries approve another year-long delay to deforestation regulation - earth.org",
        "url": "https://earth.org/eu-countries-approve-another-year-long-delay-to-deforestation-regulation/"
      },
      {
        "title": "Delay until December 2026 - Access2Markets",
        "url": "https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation"
      },
      {
        "title": "EU resets the countdown on the EUDR - CMS Law",
        "url": "https://cms.law/en/deu/legal-updates/eu-resets-the-countdown-on-the-eudr-and-postpones-the-regulation-once-again"
      },
      {
        "title": "Regulation (EU) 2024/3234 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2024/3234/oj/eng"
      },
      {
        "title": "EUDR postponed and simplified: what Regulation (EU) 2025/2650 really changes - Lexology",
        "url": "https://www.lexology.com/library/detail.aspx?g=f20d1e1f-279f-414e-bd2a-7eea491a6a5c"
      }
    ]
  },
  {
    "name": "Omnibus I - Sustainability reporting, due diligence and CBAM simplification",
    "ref": "COM(2025)80 final, COM(2025)81 final, COM(2025)87 final (proposals, tabled 26 Feb 2025); final acts: Directive (EU) 2025/794 ('stop-the-clock'), Directive (EU) 2026/470 (content amendments), Regulation (EU) 2025/2083 (CBAM)",
    "date": "2025-02",
    "status": "adopted",
    "summary": "Three-part package: (1) 'Stop-the-clock' Directive (EU) 2025/794 (OJ 16 Apr 2025) postponed CSRD reporting by 2 years for large non-reporting companies/listed SMEs and CSDDD transposition/application by 1 year; (2) content-amending Directive (EU) 2026/470 (adopted by Council 24 Feb 2026, OJ 26 Feb 2026, in force 18 Mar 2026) narrowed CSRD scope to >1,000 employees/>EUR450m turnover, removed sector-specific ESRS, and narrowed CSDDD scope, liability and phased application (from Jul 2027 for largest companies); (3) Regulation (EU) 2025/2083 (OJ 17 Oct 2025, in force 20 Oct 2025) replaced the CBAM EUR150 per-consignment de-minimis with a 50-tonnes/year cumulative mass threshold and other simplifications.",
    "actsReopened": [
      "Corporate Sustainability Reporting Directive (CSRD) - Directive (EU) 2022/2464, amending Directive 2013/34/EU and Directive 2006/43/EC",
      "Corporate Sustainability Due Diligence Directive (CSDDD/CS3D) - Directive (EU) 2024/1760",
      "Carbon Border Adjustment Mechanism (CBAM) - Regulation (EU) 2023/956"
    ],
    "sources": [
      {
        "title": "Omnibus I - stop-the-clock proposal | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-simplification-business/file-first-omnibus-package-on-sustainability"
      },
      {
        "title": "Simplified, not abandoned: EU Corporate Sustainability after the Omnibus I Package - White & Case",
        "url": "https://www.whitecase.com/insight-alert/simplified-not-abandoned-eu-corporate-sustainability-after-omnibus-i-package"
      },
      {
        "title": "Omnibus I - the EU concludes CSDDD and CSRD reforms - Clifford Chance",
        "url": "https://www.cliffordchance.com/insights/resources/blogs/business-and-human-rights-insights/2026/02/omnibus-i-the-european-union-concludes-csddd-and-csrd-reforms.html"
      },
      {
        "title": "Council gives final green light on the Stop-the-clock mechanism - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/04/14/simplification-council-gives-final-green-light-on-the-stop-the-clock-mechanism-to-boost-eu-competitiveness-and-provide-legal-certainty-to-businesses/"
      },
      {
        "title": "EU Omnibus I Directive amending CSRD and CSDDD entered into force - DLA Piper",
        "url": "https://www.dlapiper.com/en-us/insights/blogs/environment-health-safety-and-product-compliance/2026/eu-omnibus-i-directive-amending-csrd-and-csddd-will-enter-into-force-on-18-march-2026"
      },
      {
        "title": "Directive (EU) 2026/470 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/dir/2026/470/oj/eng"
      },
      {
        "title": "CBAM Simplification Regulation Officially Adopted by the EU - SGS",
        "url": "https://www.sgs.com/en/news/2025/11/cbam-simplification-regulation-officially-adopted-by-the-eu"
      },
      {
        "title": "CBAM: Council signs off simplification - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/09/29/cbam-council-signs-off-simplification-to-the-eu-carbon-leakage-instrument/"
      },
      {
        "title": "EU Adopts CBAM Simplification Regulation - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/10/eu-adopts-cbam-simplification-regulation-10-key-amendments-and-challenges-ahead"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus II - Investment simplification (InvestEU)",
    "ref": "COM(2025)84 final (proposal, tabled 26 Feb 2025 per Commission tracker / procedure 2025/0009(COD)); final act: Regulation (EU) 2025/2005",
    "date": "2025-02",
    "status": "adopted",
    "summary": "Amends Regulations (EU) 2015/1017, (EU) 2021/523 (InvestEU), (EU) 2021/695 and (EU) 2021/1153 to raise the EU guarantee ceiling (~EUR2.9bn, 26.2bn->29.1bn), simplify due-diligence/reporting for smaller transactions and intermediaries, and improve use of returns/reflows. EP plenary adopted 26 Nov 2025; signed 16 Dec 2025; published in OJ 23 Dec 2025.",
    "actsReopened": [
      "InvestEU Regulation - Regulation (EU) 2021/523",
      "EFSI Regulation - Regulation (EU) 2015/1017",
      "Horizon Europe Regulation - Regulation (EU) 2021/695",
      "Digital Europe Programme Regulation - Regulation (EU) 2021/1153"
    ],
    "sources": [
      {
        "title": "Omnibus II - Optimising use of several EU investment instruments | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/package-simplification-business/file-second-omnibus-package-on-investment-simplification"
      },
      {
        "title": "Council signs off simplification of InvestEU programme - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/12/11/council-signs-off-simplification-of-investeu-programme-to-boost-eu-competitiveness/"
      },
      {
        "title": "OEIL procedure file 2025/0009(COD) (InvestEU)",
        "url": "https://oeil.europarl.europa.eu/oeil/en/procedure-file/pdf?reference=2025/0040(COD)"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "CO2 cars/vans 2025-2027 fleet-averaging flexibility (pre-Omnibus IX, stand-alone)",
    "ref": "COM(2025)136 final (tabled ~1 Mar/2 Apr 2025); final act: Regulation (EU) 2025/1214",
    "date": "2025-03",
    "status": "adopted",
    "summary": "One-off amendment to Regulation (EU) 2019/631 allowing manufacturers' compliance with 2025 CO2 targets to be assessed as a 3-year (2025-2027) fleet average instead of annually, easing the 2025 compliance cliff-edge. EP adopted 2 May 2025 (458-101-14); Council gave final approval 27 May 2025; Regulation (EU) 2025/1214 (17 Jun 2025) published in OJ. Distinct from the later, more far-reaching Omnibus IX automotive package of Dec 2025.",
    "actsReopened": [
      "CO2 emission performance standards for cars and vans - Regulation (EU) 2019/631"
    ],
    "sources": [
      {
        "title": "CO2 emissions in cars: Council gives final approval to additional flexibility - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/05/27/co2-emissions-in-cars-council-gives-final-approval-to-additional-flexibility-for-carmakers/"
      },
      {
        "title": "Commission proposes flexibility to help manufacturers comply with 2025 CO2 emission targets - EC press corner",
        "url": "https://ec.europa.eu/commission/presscorner/detail/en/ip_25_854"
      },
      {
        "title": "CO2 emissions: EP adopts flexibility measures for carmakers - European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20250502IPR28225/co2-emissions-ep-adopts-flexibility-measures-for-carmakers"
      },
      {
        "title": "Regulation (EU) 2025/1214 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2025/1214/oj/eng"
      }
    ]
  },
  {
    "name": "Omnibus III - Common Agricultural Policy (CAP) simplification",
    "ref": "COM(2025)236 final (proposal, tabled 14 May 2025, procedure 2025/0236(COD)); adopted with modifications, published 31 Dec 2025",
    "date": "2025-05",
    "status": "adopted",
    "summary": "Amends the CAP Strategic Plans Regulation (EU) 2021/2115 (conditionality, direct-payment and sectoral interventions, rural development, performance reporting) and the Horizontal Regulation (EU) 2021/2116 (data governance, controls, penalties, payment suspension). Council agreed its position 3 Sep 2025; provisional Council-Parliament deal 10 Nov 2025; formally adopted by co-legislators and published in the OJ 31 Dec 2025; Commission adopted 9 implementing/secondary acts operationalising it on 23 Jan 2026. Estimated savings ~EUR1.6bn/yr for farmers and >EUR200m/yr for administrations.",
    "actsReopened": [
      "CAP Strategic Plans Regulation - Regulation (EU) 2021/2115",
      "CAP Horizontal Regulation (financing, management, monitoring) - Regulation (EU) 2021/2116"
    ],
    "sources": [
      {
        "title": "Council and Parliament strike deal to simplify CAP - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/11/10/simplification-council-and-parliament-strike-deal-to-simplify-common-agricultural-policy-cap/"
      },
      {
        "title": "CAP simplification package: Omnibus on Agriculture - EPRS Epthinktank",
        "url": "https://epthinktank.eu/2025/07/04/cap-simplification-package-omnibus-on-agriculture-eu-legislation-in-progress/"
      },
      {
        "title": "Commission delivers further CAP simplification (implementing acts) - DG AGRI",
        "url": "https://agriculture.ec.europa.eu/media/news/commission-delivers-further-cap-simplification-eur215-million-farmers-and-national-administrations-2026-01-23_en"
      },
      {
        "title": "Council agrees position on simplifying CAP - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/09/03/simplification-council-agrees-position-on-simplifying-the-common-agricultural-policy-cap/"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus IV - Small mid-caps (SMC), batteries and common specifications",
    "ref": "COM(2025)258 final (SMC/small mid-cap definition), COM(2025)501-504 final (tabled 21 May 2025); battery 'stop-the-clock' final act: Regulation (EU) 2025/1561",
    "date": "2025-05",
    "status": "partially-adopted",
    "summary": "Introduced the new 'small mid-cap' (SMC, <750 employees, <=EUR150m turnover or <=EUR129m assets) company category extended reduced-burden treatment across several sustainability files, and amended the Batteries Regulation. Regulation (EU) 2025/1561 (adopted 18 Jul 2025, OJ 30 Jul 2025) postpones battery supply-chain due-diligence obligations from 18 Aug 2025 to 18 Aug 2027 and moves the due-diligence-policy report from annual to 3-yearly. Broader SMC/common-specifications elements of the package remained in the ordinary legislative procedure as of mid-2026.",
    "actsReopened": [
      "Batteries Regulation - Regulation (EU) 2023/1542"
    ],
    "sources": [
      {
        "title": "Council agrees position to stop-the-clock on due diligence rules for batteries - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/06/19/simplification-council-agrees-position-to-stop-the-clock-on-due-diligence-rules-for-batteries/"
      },
      {
        "title": "Council adopts law to stop-the-clock on due diligence rules for batteries - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/07/18/simplification-council-adopts-law-to-stop-the-clock-on-due-diligence-rules-for-batteries/"
      },
      {
        "title": "EU Regulation delaying due diligence rules for batteries published in the OJEU",
        "url": "https://sustainablefutures.linklaters.com/post/102kymo/eu-regulation-delaying-due-diligence-rules-for-batteries-published-in-the-ojeu"
      },
      {
        "title": "Battery Due Diligence: New Deadline 18 August 2027 (Reg. 2025/1561)",
        "url": "https://infodpp.eu/en/blog/battery-due-diligence-delay-2025-1561/"
      },
      {
        "title": "Regulation (EU) 2025/1561 - EUR-Lex",
        "url": "https://eur-lex.europa.eu/eli/reg/2025/1561/oj/eng"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus V - Defence readiness simplification",
    "ref": "COM(2025)821-823 final (tabled 17 Jun 2025)",
    "date": "2025-06",
    "status": "proposed",
    "summary": "Two regulations and one directive to simplify defence procurement, permitting (max 100 days vs up to 4 years) and cross-border cooperation, in line with the 'Readiness 2030' white paper. Council agreed a negotiating position 26 Nov 2025; EP-Council provisional deal reported. Does not amend or reopen any adopted European Green Deal legislation - included here for completeness of the Commission's omnibus numbering only.",
    "actsReopened": [],
    "sources": [
      {
        "title": "Defence Omnibus: EU lawmakers agree provisional deal to speed up procurement",
        "url": "https://ieu-monitoring.com/editorial/defence-omnibus-eu-lawmakers-agree-provisional-deal-to-speed-up-procurement/1243085"
      },
      {
        "title": "Council agrees position on simplification package to boost Europe's defence industry - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/11/26/defence-industry-council-agrees-position-on-simplification-package-to-boost-europe-s-defence-industry-and-readiness/"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus VI - Chemicals, cosmetics and fertilising products simplification",
    "ref": "COM(2025)526, COM(2025)531 final (tabled 8 Jul 2025, procedure 2025/0531(COD))",
    "date": "2025-07",
    "status": "provisional-agreement",
    "summary": "Amends CLP Regulation (EC) 1272/2008, Cosmetic Products Regulation (EC) 1223/2009 and Fertilising Products Regulation (EU) 2019/1009. Council agreed its negotiating mandate 5 Nov 2025 (shortening CMR phase-out timelines, reinstating nanomaterial notification for cosmetics); EP committees adopted their report 15 Apr 2026; Council and Parliament reached a provisional political agreement on 17 Jun 2026; formal adoption pending as of Jul 2026. Estimated savings >=EUR363m/yr.",
    "actsReopened": [
      "CLP Regulation (classification, labelling, packaging) - Regulation (EC) No 1272/2008",
      "Cosmetic Products Regulation - Regulation (EC) No 1223/2009",
      "Fertilising Products Regulation - Regulation (EU) 2019/1009"
    ],
    "sources": [
      {
        "title": "Council and Parliament strike deal to simplify requirements for chemical products - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/17/council-and-parliament-strike-deal-to-simplify-requirements-for-chemical-products/"
      },
      {
        "title": "Omnibus VI - Cosmetics Europe",
        "url": "https://cosmeticseurope.eu/policy-corner/omnibus-vi/"
      },
      {
        "title": "Omnibus VI - chemicals | Legislative Train Schedule",
        "url": "https://www.europarl.europa.eu/legislative-train/theme-agriculture-and-rural-development-agri/file-omnibus-vi-chemicals"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "European Climate Law 2040-target amendment",
    "ref": "COM(2025)524 final (tabled 2 Jul 2025); final act: Regulation (EU) 2026/667",
    "date": "2025-07",
    "status": "adopted",
    "summary": "Amends the European Climate Law (Regulation (EU) 2021/1119) to set a binding 2040 target of a 90% net GHG reduction vs 1990 (85% domestic + up to 5 percentage points of international credits/carbon removals flexibility), plus flexibility mechanisms for the post-2030 framework. Council agreed its position 5 Nov 2025; first trilogue agreement 9 Dec 2025; EP adopted 10 Feb 2026 (413-226-12); Council formally adopted 5 Mar 2026; Regulation (EU) 2026/667 published in OJ 18 Mar 2026, entered into force 7 Apr 2026.",
    "actsReopened": [
      "European Climate Law - Regulation (EU) 2021/1119"
    ],
    "sources": [
      {
        "title": "COM(2025) 524 final - EUR-Lex",
        "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A52025PC0524"
      },
      {
        "title": "2040 climate target: Council agrees its position on a 90% emissions reduction - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2025/11/05/2040-climate-target-council-agrees-its-position-on-a-90-emissions-reduction/"
      },
      {
        "title": "2040 climate target: Council gives final green light - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/03/05/2040-climate-target-council-gives-final-green-light/"
      },
      {
        "title": "EU climate law: a 2040 emissions reduction target of 90% for the EU - European Parliament",
        "url": "https://www.europarl.europa.eu/news/en/press-room/20260205IPR33620/eu-climate-law-a-2040-emissions-reduction-target-of-90-for-the-eu"
      },
      {
        "title": "Regulation (EU) 2026/667: The revised European Climate Law - Sioufas & Associates",
        "url": "https://www.sioufaslaw.gr/regulation-eu-2026-667-the-revised-european-climate-law/"
      },
      {
        "title": "Reinforced pathway to EU climate neutrality - Official Blog of UNIO",
        "url": "https://officialblogofunio.com/2026/04/17/reinforced-pathway-to-eu-climate-neutrality-introduction-of-the-90-target-for-2040/"
      }
    ]
  },
  {
    "name": "Omnibus VII - Digital simplification package (AI Omnibus + Data Omnibus)",
    "ref": "COM(2025)836, COM(2025)837 final (tabled 19 Nov 2025)",
    "date": "2025-11",
    "status": "partially-adopted",
    "summary": "'AI Omnibus' amends the AI Act (Regulation (EU) 2024/1689), pushing back high-risk system compliance deadlines; EP and Council reached provisional agreement on it 7 May 2026. 'Data Omnibus' covers GDPR, ePrivacy, NIS2 and DORA (narrower 'personal data' definition, easier AI-training use of personal data, simplified cookie consent, longer breach-notification windows) and remained under negotiation as of mid-2026. Not primarily an EGD file, included for completeness of the omnibus count and its AI Act linkage to sustainability-reporting digitalisation.",
    "actsReopened": [
      "AI Act - Regulation (EU) 2024/1689"
    ],
    "sources": [
      {
        "title": "The EU Digital Omnibus: A Reset for Europe's Digital Rulebook - Grant Thornton",
        "url": "https://www.grantthornton.nl/en/insights-en/legal-services/the-eu-digital-omnibus-a-reset-for-europes-digital-rulebook/"
      },
      {
        "title": "EU agrees Digital Omnibus deal to simplify AI rules - White & Case",
        "url": "https://www.whitecase.com/insight-alert/eu-agrees-digital-omnibus-deal-simplify-ai-rules"
      },
      {
        "title": "EU Digital Omnibus: How EU Data, Cyber, and AI Rules Will Shift - Jones Day",
        "url": "https://www.jonesday.com/en/insights/2025/12/eu-digital-omnibus-how-eu-data-cyber-and-ai-rules-will-shift"
      },
      {
        "title": "Digital Omnibus on AI Regulation Proposal - EC digital strategy",
        "url": "https://digital-strategy.ec.europa.eu/en/library/digital-omnibus-ai-regulation-proposal"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus VIII - Environmental Omnibus",
    "ref": "COM(2025)980 final (package) / COM(2025)981-986 final (six legislative proposals), tabled 10 Dec 2025",
    "date": "2025-12",
    "status": "provisional-agreement",
    "summary": "Six proposals simplifying industrial emissions, circular economy/EPR, environmental assessments and geospatial data rules, following a call for evidence that drew ~200,000 responses. Key changes: repeal of the SCIP database obligation (SVHCs in articles); delay to 2035 of the EPR 'authorised representative' requirement for cross-border sellers; more flexible Environmental Management Systems under the IED; INSPIRE geospatial-data rules aligned with the Open Data Directive. Estimated savings ~EUR1bn/yr (some sources cite ~EUR890m/yr). Council agreed its negotiating stance 24 Jun 2026; still in first reading as of Jul 2026.",
    "actsReopened": [
      "Industrial Emissions Directive (IED) - Directive 2010/75/EU",
      "Environmental Impact Assessment (EIA) Directive - Directive 2011/92/EU",
      "Strategic Environmental Assessment Directive - Directive 2001/42/EC",
      "INSPIRE Directive (spatial data infrastructure) - Directive 2007/2/EC",
      "Extended Producer Responsibility provisions across Batteries (2023/1542), Packaging and Packaging Waste, WEEE and Single-Use Plastics legislation",
      "Habitats Directive - Directive 92/43/EEC / Birds Directive - Directive 2009/147/EC (referenced in some summaries)"
    ],
    "sources": [
      {
        "title": "Council agrees negotiating stance to simplify and streamline environmental rules - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/24/simplification-council-agrees-negotiating-stance-to-simplify-and-streamline-environmental-rules/"
      },
      {
        "title": "European Commission Presents Environmental Omnibus - Mayer Brown",
        "url": "https://www.mayerbrown.com/en/insights/publications/2025/12/european-commission-presents-environmental-omnibus-news-for-epr-scip-industrial-emissions-and-environmental-assessments"
      },
      {
        "title": "COM(2025) 980 final text - environment.ec.europa.eu",
        "url": "https://environment.ec.europa.eu/document/download/502b572e-4ac3-47a8-95a7-ce619ec3e0ba_en?filename=COM_2025_980_1_EN_ACT_part1_v8.pdf"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus IX - Automotive package (CO2 standards / 2035 target revision)",
    "ref": "COM(2025)993, COM(2025)999 final, tabled 16 Dec 2025",
    "date": "2025-12",
    "status": "proposed",
    "summary": "Proposes to replace the 100% zero-emission-by-2035 target for cars and vans with a 90% tailpipe CO2 reduction target, with the remaining 10% compensable via EU-made low-carbon steel content or e-fuels/biofuels; also cuts the 2030 vans target from 50% to 40% reduction. This is distinct from (and follows) the earlier stand-alone 2025-2027 fleet-averaging flexibility (Regulation (EU) 2025/1214, see separate entry). Still in the ordinary legislative procedure as of Jul 2026.",
    "actsReopened": [
      "CO2 emission performance standards for cars and vans - Regulation (EU) 2019/631, as amended by Regulation (EU) 2023/851"
    ],
    "sources": [
      {
        "title": "Unwrapping the package: review of the Commission's CO2 standards proposal - ICCT",
        "url": "https://theicct.org/publication/european-commissions-risks-and-opportunities-of-the-proposed-co2-standards-dec25/"
      },
      {
        "title": "EU carmakers to comply with 90% emissions reduction by 2035 as combustion-engine ban scrapped - Euronews",
        "url": "https://www.euronews.com/my-europe/2025/12/16/eu-carmakers-to-comply-with-90-emissions-reduction-by-2035-as-full-combustion-engine-ban-s"
      },
      {
        "title": "EU Commission weakens CO2 targets - a little bit - electrive.com",
        "url": "https://www.electrive.com/2025/12/16/eu-commission-weakens-co%E2%82%82-targets-a-little-bit/"
      },
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "ETS2 (buildings and road transport) one-year postponement to 2028",
    "ref": "Agreed as part of the Climate Law 2040 political package (Dec 2025 trilogue); exact stand-alone amending-act number for Directive 2003/87/EC NOT confirmed this session",
    "date": "2025-12",
    "status": "adopted",
    "summary": "EU co-legislators agreed in the Dec 2025 climate-package trilogue to delay ETS2's start (surrender obligations/carbon price on buildings and road-transport fuel) by one year, from 2027 to 2028; EP plenary confirmed this alongside the 2040 target vote on 10 Feb 2026, Council gave final green light 5 Mar 2026. Monitoring/reporting under ETS2 continues unchanged from 1 Jan 2025; a companion Market Stability Reserve adjustment for ETS2 (Council-Parliament provisional agreement 11 Jun 2026) supports a smoother 2028 start. CAVEAT: multiple secondary sources describe this as bundled with the Climate Law amendment (Regulation (EU) 2026/667, which formally amends Regulation 2021/1119, not the ETS Directive); none of the sources fetched this session cited a distinct Directive number amending Directive 2003/87/EC for the ETS2 delay itself - treat the exact final-act citation as unverified pending direct EUR-Lex confirmation.",
    "actsReopened": [
      "EU ETS Directive (ETS2 for buildings/road transport) - Directive 2003/87/EC as amended by Directive (EU) 2023/959"
    ],
    "sources": [
      {
        "title": "EU officially adopts the 2040 climate target, postpones ETS 2 by one year - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-officially-adopts-2040-climate-target-postpones-ets-2-one-year"
      },
      {
        "title": "ETS2 delay to 2028: EU ministers approve postponement - Veyt",
        "url": "https://veyt.com/eu-ets/eu-ets2-delay-to-2028/"
      },
      {
        "title": "Plenary approved 2040 Climate Target, ETS2 postponed until 2028 - EU Perspectives",
        "url": "https://euperspectives.eu/2026/02/plenary-approved-2040-climate-target-ets2-postponed-until-2028/"
      },
      {
        "title": "ETS2 market stability reserve: Council and Parliament reach provisional agreement - Consilium",
        "url": "https://www.consilium.europa.eu/en/press/press-releases/2026/06/11/ets2-market-stability-reserve-council-and-parliament-reach-provisional-agreement/"
      },
      {
        "title": "Commission proposes targeted adjustments to the Market Stability Reserve Decision for ETS2 - Climate Action",
        "url": "https://climate.ec.europa.eu/news-other-reads/news/commission-proposes-targeted-adjustments-market-stability-reserve-decision-support-smoother-start-2025-11-27_en"
      },
      {
        "title": "Delivering the ETS2: Do or die time for the European Union - Institut Delors",
        "url": "https://institutdelors.eu/content/uploads/2025/11/PP317_ETS2_Nguyen_EN.pdf"
      }
    ]
  },
  {
    "name": "Omnibus X - Food and feed safety simplification",
    "ref": "COM(2025)1020, COM(2025)1021, COM(2025)1030 final, tabled 16 Dec 2025",
    "date": "2025-12",
    "status": "proposed",
    "summary": "Simplification package for food and feed safety rules, presented the same day as the Automotive package (Omnibus IX). Estimated savings ~EUR939m/yr per the Commission's own tracker. Not further verified in detail this session; flagged for completeness as it postdates the ETC baseline and falls within the 2025-2026 simplification wave, though it does not clearly reopen a core EGD legislative act.",
    "actsReopened": [],
    "sources": [
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus XI - Taxation simplification",
    "ref": "COM(2026)560 final, tabled 24 Jun 2026",
    "date": "2026-06",
    "status": "proposed",
    "summary": "Taxation-focused simplification proposal per the Commission's own tracker (~EUR1.97bn/yr estimated savings). Not an EGD file; included for completeness of the 2025-2026 omnibus count. Not independently verified beyond the Commission tracker this session.",
    "actsReopened": [],
    "sources": [
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "Omnibus XII - Energy product legislation simplification",
    "ref": "COM(2026)565 final, tabled 24 Jun 2026",
    "date": "2026-06",
    "status": "proposed",
    "summary": "Simplification proposal for energy-product-related legislation per the Commission's own tracker (~EUR123m/yr estimated savings); potentially touches Ecodesign/Energy Labelling or Energy Taxation files but the exact acts amended were not independently verified this session beyond the Commission tracker entry - flag for the relevant policy-area agent to check directly.",
    "actsReopened": [],
    "sources": [
      {
        "title": "EU official simplification tracker",
        "url": "https://commission.europa.eu/law/law-making-process/better-regulation/simplification-implementation-and-enforcement/simplification_en"
      }
    ]
  },
  {
    "name": "ETS Directive targeted revision (Phase 5, 2031-2040)",
    "ref": "COM(2026)616 final, tabled 17 Jul 2026",
    "date": "2026-07",
    "status": "proposed",
    "summary": "Proposal setting the legal framework for EU ETS Phase 5 (2031-2040) to align the main ETS with the 90% 2040 target: lowers the Linear Reduction Factor from 4.3% to 3.7% (2031-2035) and 1.7% (from 2036), pushing the theoretical zero-cap 'ETS endgame' from ~2039 to ~2048; scales down and conditions free allocation on decarbonisation performance; removes free allocation for aviation from 2026; adds an Industrial Decarbonisation Bank and Investment Booster alongside the Innovation and Modernisation Funds. ETS2 (buildings/road transport) is explicitly out of scope of this proposal - it becomes operational in 2028, is due a feasibility review on integration with the main ETS by 2031, and application review by 2029.",
    "actsReopened": [
      "EU Emissions Trading System Directive - Directive 2003/87/EC (as revised by Directive (EU) 2023/959 for Phase 4/ETS2)"
    ],
    "sources": [
      {
        "title": "COM(2026) 616 final text - climate.ec.europa.eu",
        "url": "https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en"
      },
      {
        "title": "EU-ETS: the main modifications suggested by the European Commission - Clyde & Co",
        "url": "https://www.clydeco.com/en/insights/2026/07/eu-ets-a-targeted-revision-proposed-by-the-eur-1"
      },
      {
        "title": "EU Commission publishes EU ETS review proposal - ICAP",
        "url": "https://icapcarbonaction.com/en/news/eu-commission-publishes-eu-ets-review-proposal"
      },
      {
        "title": "The EU ETS Review Proposal July 2026 - Clear Blue Markets",
        "url": "https://www.clearbluemarkets.com/knowledge-base/the-eu-ets-review-proposal-july-2026-relief-for-industry-stability-for-the-market"
      },
      {
        "title": "EU ETS: Commission publishes proposal for the revised ETS - Linklaters",
        "url": "https://sustainablefutures.linklaters.com/post/102nelm/eu-ets-commission-publishes-proposal-for-the-revised-emissions-trading-system"
      }
    ]
  }
];

/** Workflow QA stats: {"entries":98,"verified":53,"corrected":41,"unverified":4,"reopenedRows":21} */
