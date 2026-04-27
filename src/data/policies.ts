/**
 * Master list of tracked EU climate policies (seed dataset).
 * ----------------------------------------------------------
 * Every node of the M·04 Policy Navigator network graph is a row in
 * this file. Each policy carries:
 *
 *   - Structural metadata (CELEX number, document type, adoption
 *     and in-force dates, sectoral grouping).
 *   - Short / long titles used in the card and in the network graph
 *     label.
 *   - EUR-Lex URL helper output (`getEurlexHtmlUrl`) pre-built so
 *     the card components render without recomputing.
 *   - Explicit `connections[]` to other policies (amends, repeals,
 *     cites, implements) — these are the edges of the network graph.
 *
 * Kept in TypeScript (not fetched at runtime) so the full graph is
 * instantly renderable on a fresh deploy. Refresh with
 * `scripts/fetch-eurlex-texts.js` when adding new tracked acts.
 */

import { Policy, PolicyConnection, Citation, GraphNode, GraphLink } from '@/lib/types';

// ─── EUR-Lex HTML URL helper ────────────────────────────────────────────────
// Builds the direct HTML view URL from a CELEX number — used for iframe embeds
export function getEurlexHtmlUrl(celexNumber: string | null): string | null {
  if (!celexNumber) return null;
  return `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celexNumber}`;
}

// ─── Real EU climate policy data ───────────────────────────────────────────────

export const policies: Policy[] = [
  {
    id: 'eu-climate-law',
    title: 'Regulation (EU) 2021/1119 establishing the framework for achieving climate neutrality (European Climate Law)',
    short_title: 'European Climate Law',
    celex_number: '32021R1119',
    document_type: 'regulation',
    domain: 'climate',
    status: 'in_force',
    adoption_date: '2021-06-30',
    entry_into_force: '2021-07-29',
    summary: 'Establishes a binding EU target of net-zero greenhouse gas emissions by 2050, with an intermediate target of at least 55% net reduction by 2030 compared to 1990 levels. Creates a framework for tracking progress and adjusting actions.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119',
    full_text: `REGULATION (EU) 2021/1119 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 30 June 2021
establishing the framework for achieving climate neutrality and amending Regulations (EC) No 401/2009 and (EU) 2018/1999 (European Climate Law)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

After transmission of the draft legislative act to the national parliaments,

Having regard to the opinion of the European Economic and Social Committee,

Having regard to the opinion of the Committee of the Regions,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The Commission Communication of 11 December 2019 on 'The European Green Deal' ('European Green Deal') set out a new growth strategy that aims to transform the Union into a fair and prosperous society, with a modern, resource-efficient and competitive economy, where there are no net emissions of greenhouse gases by 2050 and where economic growth is decoupled from resource use.

(2) The Intergovernmental Panel on Climate Change (IPCC) special report on the impacts of global warming of 1.5°C above pre-industrial levels and related global greenhouse gas emission pathways provides a strong scientific basis for tackling climate change and illustrates the need to step up climate action.

(3) The Paris Agreement, adopted on 12 December 2015 under the United Nations Framework Convention on Climate Change (UNFCCC) ('Paris Agreement'), entered into force on 4 November 2016. The Parties to the Paris Agreement have agreed to hold the increase in the global average temperature to well below 2°C above pre-industrial levels and to pursue efforts to limit the temperature increase to 1.5°C above pre-industrial levels.

(4) The objective of climate neutrality should be pursued in accordance with the objectives set out in Article 191 of the Treaty on the Functioning of the European Union (TFEU) and in line with the principle of 'do no significant harm' within the meaning of the Taxonomy Regulation (EU) 2020/852.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

This Regulation establishes a framework for the irreversible and gradual reduction of anthropogenic greenhouse gas emissions by sources and enhancement of removals by sinks regulated in Union law.

This Regulation sets out a binding objective of climate neutrality in the Union by 2050 in pursuit of the long-term temperature goal set out in Article 2(1)(a) of the Paris Agreement, and provides a framework for achieving progress in pursuit of the global adaptation goal established in Article 7 of the Paris Agreement. This Regulation also sets out a binding Union 2030 climate target of a domestic reduction of net greenhouse gas emissions (emissions after deduction of removals) by at least 55% compared to 1990 levels by 2030.

This Regulation applies to anthropogenic emissions by sources and removals by sinks of the greenhouse gases listed in Part 2 of Annex V to Regulation (EU) 2018/1999.

Article 2 — Climate-neutrality objective

1. Union-wide emissions and removals of greenhouse gases regulated in Union law shall be balanced within the Union at the latest by 2050, thus reducing emissions to net zero by that date, and the Union shall aim to achieve negative emissions thereafter.

2. The relevant Union institutions and the Member States shall take the necessary measures at Union and national level respectively, to enable the collective achievement of the climate-neutrality objective set out in paragraph 1, taking into account the importance of promoting both fairness and solidarity among Member States and cost-effectiveness in achieving this objective.

3. In taking the measures referred to in paragraph 2, each Member State shall be guided by the following considerations:
(a) fairness and solidarity between and within Member States;
(b) the need to ensure the effectiveness of Union climate policies;
(c) the need to protect and improve the competitiveness of the Union economy;
(d) the best available scientific evidence, including the latest reports of the IPCC;
(e) the need to integrate climate change-related issues into investment decisions;
(f) the principles of technology neutrality;
(g) the need for a just transition for all.

Article 3 — Trajectory to climate neutrality

1. The Commission is empowered to adopt delegated acts in accordance with Article 9 to supplement this Regulation by setting out a projected indicative Union greenhouse gas budget for the 2030-2050 period. The greenhouse gas budget shall be defined as the indicative total volume of net greenhouse gas emissions (as CO2 equivalent and providing separate information on emissions and removals) that are expected to be emitted in the period without putting at risk the Union's commitments under the Paris Agreement.

2. The Commission shall review the trajectory at least within six months after each global stocktake agreed under Article 14 of the Paris Agreement.

Article 4 — Union 2030 climate target

1. In order to reach the climate-neutrality objective set out in Article 2(1), the binding Union 2030 climate target shall be a domestic reduction of net greenhouse gas emissions (emissions after deduction of removals) by at least 55% compared to 1990 levels by 2030.

2. In implementing the target referred to in paragraph 1, the relevant Union institutions and the Member States shall prioritise swift and predictable emission reductions and, at the same time, enhance removals by natural sinks.

3. The Commission shall assess, by 30 June 2024, whether the Union legislation is consistent with the delivery of the target set out in paragraph 1 and identify the actions necessary to ensure such delivery.

Article 5 — Union 2040 climate target

1. The Commission shall, by the first half of 2024, put forward a proposal for a Union climate target for 2040 based on a detailed impact assessment and taking into account, among others:
(a) the best available scientific evidence;
(b) the trajectory referred to in Article 3;
(c) a cost-effectiveness analysis;
(d) the need to ensure a socially fair transition;
(e) the competitiveness of the Union economy.

CHAPTER II — UNION INTERMEDIATE CLIMATE TARGETS AND ASSESSMENT

Article 6 — Assessment of Union progress and measures

1. By 30 September 2023 and every five years thereafter, the Commission shall assess:
(a) the collective progress made by all Member States towards the achievement of the climate-neutrality objective set out in Article 2(1);
(b) the collective progress made by all Member States on adaptation;
(c) the consistency of Union measures and national measures, as the case may be, with the climate-neutrality objective or with ensuring progress on adaptation.

2. The Commission shall submit the findings of that assessment, together with the State of the Energy Union report prepared in the respective calendar year in accordance with Regulation (EU) 2018/1999, to the European Parliament and to the Council.

3. Where the Commission finds, based on the assessment referred to in paragraphs 1 and 2, that Union measures are inconsistent with the climate-neutrality objective set out in Article 2(1) or that progress on adaptation is inadequate, it shall take the necessary measures in accordance with the Treaties.

Article 7 — Assessment of national measures

1. By 30 September 2023 and every five years thereafter, the Commission shall assess:
(a) the consistency of national measures identified, on the basis of the national energy and climate plans, the long-term strategies and the biennial progress reports submitted under Regulation (EU) 2018/1999, as relevant for the achievement of the climate-neutrality objective;
(b) the adequacy of relevant national measures for ensuring progress on adaptation.

2. Where the Commission finds that a Member State's measures are inconsistent with the climate-neutrality objective or are inadequate to ensure progress on adaptation, it may issue recommendations to that Member State. The Member State shall take due account of any such recommendation. Where a Member State does not take due account of a recommendation, the Commission may use other measures under the Treaties.

CHAPTER III — ADAPTATION

Article 8 — Adaptation to climate change

The relevant Union institutions and the Member States shall ensure continuous progress in enhancing adaptive capacity, strengthening resilience and reducing vulnerability to climate change in accordance with Article 7 of the Paris Agreement.

Member States shall develop and implement adaptation strategies and plans that include comprehensive risk management frameworks, based on robust climate and vulnerability baselines and progress assessments.

CHAPTER IV — PUBLIC PARTICIPATION AND TRANSPARENCY

Article 9 — Exercise of delegation

1. The power to adopt delegated acts is conferred on the Commission subject to the conditions laid down in this Article.

2. The power to adopt delegated acts referred to in Article 3(1) shall be conferred on the Commission for an indeterminate period of time from the date of entry into force of this Regulation.

Article 10 — European Scientific Advisory Board on Climate Change

1. A European Scientific Advisory Board on Climate Change ('Advisory Board') is established. It shall comprise 15 senior scientific experts covering a broad range of relevant disciplines.

2. The Advisory Board shall serve as a point of reference for the Union on scientific knowledge relating to climate change. It shall act independently and in accordance with the latest scientific findings and shall support the work of the Commission by providing scientific advice and reports.

3. The Advisory Board shall contribute to the assessment referred to in Articles 6 and 7, including providing advice on the trajectory referred to in Article 3 and the greenhouse gas budget.

CHAPTER V — FINAL PROVISIONS

Article 11 — Amendments to other instruments

1. In Part 1 of Annex IV to Regulation (EU) 2018/1999, the following point is added:
'(7) An overview of the investments needed to achieve the climate-neutrality objective set out in Article 2(1) of Regulation (EU) 2021/1119 of the European Parliament and of the Council.'

Article 12 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 30 June 2021.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'eu-ets-directive',
    title: 'Directive 2003/87/EC establishing a scheme for greenhouse gas emission allowance trading (EU ETS)',
    short_title: 'EU ETS Directive',
    celex_number: '32003L0087',
    document_type: 'directive',
    domain: 'climate',
    status: 'amended',
    adoption_date: '2003-10-13',
    entry_into_force: '2003-10-25',
    summary: 'Establishes the EU Emissions Trading System, a cap-and-trade mechanism for reducing greenhouse gas emissions from power generation, industry, and aviation. Amended multiple times, most recently under the Fit for 55 package.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32003L0087',
    full_text: `DIRECTIVE 2003/87/EC OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 October 2003
establishing a scheme for greenhouse gas emission allowance trading within the Community and amending Council Directive 96/61/EC

(as amended by Directive 2009/29/EC, Regulation (EU) 2017/2392, Decision (EU) 2015/1814 and Directive (EU) 2023/959)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty establishing the European Community, and in particular Article 175(1) thereof,

Having regard to the proposal from the Commission,

Having regard to the opinion of the European Economic and Social Committee,

Having regard to the opinion of the Committee of the Regions,

Acting in accordance with the procedure laid down in Article 251 of the Treaty,

Whereas:

(1) The Green Paper on greenhouse gas emissions trading within the European Union launched a debate across Europe on the appropriateness and possible functioning of greenhouse gas emissions trading within the European Union.

(2) The Sixth Community Environment Action Programme established by Decision No 1600/2002/EC identifies climate change as a priority for action and provides for the establishment of a Community-wide emissions trading scheme by 2005.

(3) The Kyoto Protocol to the United Nations Framework Convention on Climate Change, approved by Council Decision 2002/358/EC, requires developed countries to reduce their aggregate anthropogenic emissions of greenhouse gases listed in Annex A to the Protocol by at least 5% below 1990 levels in the commitment period 2008 to 2012.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Directive establishes a system for greenhouse gas emission allowance trading within the Union in order to promote reductions of greenhouse gas emissions in a cost-effective and economically efficient manner.

This Directive also provides for the reductions of greenhouse gas emissions to be increased so as to contribute to the levels of reductions that are considered scientifically necessary to avoid dangerous climate change.

This Directive also lays down provisions for assessing and implementing a stricter Union reduction commitment of more than 20%, to be applied upon the approval by the Union of an international agreement on climate change leading to greenhouse gas emission reductions exceeding those required in Article 9, as reflected in the 30% commitment endorsed by the European Council of March 2007.

Article 2 — Scope

1. This Directive shall apply to emissions from the activities listed in Annex I and greenhouse gases listed in Annex II.

2. This Directive shall apply without prejudice to any requirements pursuant to Directive 2010/75/EU on industrial emissions.

Article 3 — Definitions

For the purposes of this Directive the following definitions shall apply:
(a) 'allowance' means an allowance to emit one tonne of carbon dioxide equivalent during a specified period, which shall be valid only for the purposes of meeting the requirements of this Directive and shall be transferable in accordance with the provisions of this Directive;
(b) 'emissions' means the release of greenhouse gases into the atmosphere from sources in an installation or the release from an aircraft performing an aviation activity listed in Annex I of the gases specified in respect of that activity;
(c) 'greenhouse gases' means the gases listed in Annex II;
(d) 'greenhouse gas emissions permit' means the permit issued in accordance with Articles 5 and 6;
(e) 'operator' means any person who operates or controls an installation or, where this is provided for in national legislation, to whom decisive economic power over the technical functioning of the installation has been delegated;
(f) 'installation' means a stationary technical unit where one or more activities listed in Annex I are carried out and any other directly associated activities which have a technical connection with the activities carried out on that site and which could have an effect on emissions and pollution;
(g) 'tonne of carbon dioxide equivalent' means one metric tonne of carbon dioxide (CO2) or an amount of any other greenhouse gas listed in Annex II with an equivalent global-warming potential.

CHAPTER II — AVIATION

Article 3a — Scope

The provisions of this Chapter shall apply to the allocation and issue of allowances in respect of aviation activities listed in Annex I.

Article 3b — Aviation activities

By 2 August 2009, the Commission shall, in accordance with the regulatory procedure referred to in Article 23(2), develop guidelines on the detailed interpretation of the aviation activities listed in Annex I.

CHAPTER III — STATIONARY INSTALLATIONS

Article 4 — Greenhouse gas emissions permits

Member States shall ensure that, from 1 January 2005, no installation carries out any activity listed in Annex I resulting in emissions specified in relation to that activity unless its operator holds a permit issued by a competent authority in accordance with Articles 5 and 6, or the installation is excluded from the Union scheme pursuant to Article 27.

Article 5 — Applications for greenhouse gas emissions permits

An application to the competent authority for a greenhouse gas emissions permit shall include a description of:
(a) the installation and its activities including the technology used;
(b) the raw and auxiliary materials, the use of which is likely to lead to emissions of gases listed in Annex I;
(c) the sources of emissions from the installation;
(d) the measures planned to monitor and report emissions.

Article 6 — Conditions for and contents of the greenhouse gas emissions permit

1. The competent authority shall issue a greenhouse gas emissions permit granting authorisation to emit greenhouse gases from all or part of an installation if it is satisfied that the operator is capable of monitoring and reporting emissions.

2. Greenhouse gas emissions permits shall contain the following:
(a) the name and address of the operator;
(b) a description of the activities and emissions from the installation;
(c) monitoring requirements, specifying monitoring methodology and frequency;
(d) reporting requirements;
(e) an obligation to surrender allowances equal to the total emissions of the installation in each calendar year, within four months following the end of that year.

CHAPTER IV — PROVISIONS APPLYING TO STATIONARY INSTALLATIONS AND AVIATION

Article 9 — Union-wide quantity of allowances

The Union-wide quantity of allowances issued each year starting in 2013 shall decrease in a linear manner beginning from the mid-point of the period 2008 to 2012. The quantity shall decrease by a linear factor of 2.2% compared to the average total quantity of allowances issued by Member States in accordance with the Commission Decisions on their national allocation plans for the period 2008 to 2012.

Starting from 2024, the Union-wide quantity of allowances shall be reduced by a linear reduction factor of 4.3% compared to 2005 levels. From 2028, the linear reduction factor shall be 4.4%.

Article 9a — Adjustment of the Union-wide quantity of allowances

1. In respect of installations that were included in the Union scheme during the period from 2008 to 2012 pursuant to Article 24, the quantity of allowances to be issued from 2013 onwards shall be adjusted to reflect the average annual amount of allowances issued in respect of those installations during the period of their inclusion.

Article 10 — Auctioning of allowances

1. From 2013 onwards, Member States shall auction all allowances which are not allocated free of charge in accordance with Articles 10a and 10c.

2. The total quantity of allowances to be auctioned by each Member State shall be composed as follows:
(a) 90% of the total quantity of allowances to be auctioned being distributed amongst Member States in shares that are identical to the share of verified emissions under the Union scheme of the Member State concerned;
(b) 10% of the total quantity to be distributed amongst certain Member States for the purpose of solidarity, growth and interconnections.

3. Member States shall determine the use of revenues generated from the auctioning of allowances. At least 50% of the revenues generated from the auctioning of allowances should be used for one or more of the following:
(a) to reduce greenhouse gas emissions;
(b) to develop renewable energies;
(c) to contribute to the Global Energy Efficiency and Renewable Energy Fund, the Adaptation Fund or measures to avoid deforestation;
(d) for forestry sequestration in the Union;
(e) for the environmentally safe capture and geological storage of CO2;
(f) to encourage a shift to low-emission and public forms of transport;
(g) to finance research and development in energy efficiency and clean technologies;
(h) for measures intended to increase energy efficiency and insulation;
(i) to cover administrative expenses of the management of the Union scheme.

Article 10a — Transitional Union-wide rules for harmonised free allocation

1. The Commission shall adopt implementing measures for the harmonised allocation of allowances referred to in paragraphs 4, 5, 7 and 12 of this Article.

2. The benchmark values for free allocation shall be determined, where possible, on the basis of the average performance of the 10% most efficient installations in a sector or subsector in the Union in the years 2007-2008. The Commission shall review the benchmark values in the context of the measures adopted pursuant to paragraph 1 every five years.

3. Subject to paragraphs 4 and 8, and notwithstanding Article 10c, no free allocation shall be given to electricity generators, to installations for the capture of CO2, to pipelines for transport of CO2 or to CO2 storage sites.

CHAPTER V — MONITORING, REPORTING, VERIFICATION AND ACCREDITATION

Article 14 — Monitoring and reporting of emissions

1. The Commission shall adopt implementing acts concerning the detailed rules for the monitoring and reporting of emissions from the activities listed in Annex I and for the monitoring and reporting of tonne-kilometre data for the purposes of an application under Article 3e or 3f.

2. The implementing acts referred to in paragraph 1 shall take into account the most accurate and up-to-date scientific evidence available, in particular from the IPCC, and may also provide for those undertakings to report on the production levels, heat and electricity generation, energy and raw material input, and efficiency of the activities.

Article 15 — Verification

Member States shall ensure that the reports submitted by operators and aircraft operators pursuant to Article 14 are verified in accordance with the criteria set out in Annex V and any detailed provisions adopted by the Commission pursuant to this Article, and that the competent authority is informed thereof.

CHAPTER VI — ADMINISTRATION

Article 18a — Market Stability Reserve

1. A Market Stability Reserve is established and shall operate from 1 January 2019.

2. In each year beginning in 2023, a number of allowances equal to 24% of the total number of allowances in circulation, as published in the most recent publication in accordance with paragraph 4, shall be placed in the reserve, unless the number of allowances to be placed in the reserve would be less than 100 million. From 2024, the percentage referred to in the first subparagraph shall be 12%.

3. If the total number of allowances in circulation is lower than 400 million, 100 million allowances shall be released from the reserve. If fewer than 100 million allowances are in the reserve, all allowances in the reserve shall be released under this paragraph.

Article 19 — Registries

1. Allowances issued from 1 January 2012 onwards shall be held in the Union Registry. The Commission shall adopt delegated acts in accordance with Article 23 to supplement this Directive with regard to any aspects relating to the operation of the Union Registry.

2. Any person may hold allowances. The registry shall be accessible to the public and shall contain separate accounts to record the allowances held by each person to whom and from whom allowances are issued or transferred.

CHAPTER VII — FINAL PROVISIONS

Article 25 — Links with other greenhouse gas emissions trading schemes

1. Agreements should be concluded with third countries listed in Annex B to the Kyoto Protocol which have ratified the Protocol to provide for the mutual recognition of allowances between the Union scheme and other greenhouse gas emissions trading schemes in accordance with the provisions laid down in Article 300 of the Treaty.

Article 30 — Review

1. On the basis of experience of the application of this Directive and of progress achieved in the monitoring of greenhouse gas emissions, and in the light of developments in the international context, the Commission shall draw up a report on the application of this Directive accompanied, if appropriate, by proposals.

This Directive shall be binding upon the Member States as to the result to be achieved, whilst leaving to the national authorities the choice of form and methods.

Done at Luxembourg, 13 October 2003.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'effort-sharing-regulation',
    title: 'Regulation (EU) 2018/842 on binding annual greenhouse gas emission reductions by Member States (Effort Sharing Regulation)',
    short_title: 'Effort Sharing Regulation',
    celex_number: '32018R0842',
    document_type: 'regulation',
    domain: 'climate',
    status: 'amended',
    adoption_date: '2018-05-30',
    entry_into_force: '2018-07-09',
    summary: 'Sets binding national emission reduction targets for sectors not covered by the EU ETS (transport, buildings, agriculture, waste). Amended under Fit for 55 to raise the EU-wide target to -40% by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0842',
    full_text: `REGULATION (EU) 2018/842 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 30 May 2018
on binding annual greenhouse gas emission reductions by Member States from 2021 to 2030 contributing to climate action to meet commitments under the Paris Agreement and amending Regulation (EU) No 525/2013

(as amended by Regulation (EU) 2023/857)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

After transmission of the draft legislative act to the national parliaments,

Having regard to the opinion of the European Economic and Social Committee,

Having regard to the opinion of the Committee of the Regions,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The European Council endorsed, in October 2014, a binding Union domestic reduction target of at least 40% in economy-wide greenhouse gas emissions by 2030 compared to 1990, as part of the EU's contribution under the Paris Agreement.

(2) The Paris Agreement was adopted in December 2015 under the UNFCCC and entered into force on 4 November 2016. The Parties to the Paris Agreement agreed to hold the increase in the global average temperature to well below 2°C and pursue efforts to limit it to 1.5°C.

(3) Achieving the Union's 2030 greenhouse gas emission reduction target requires a contribution from the sectors covered by this Regulation, amounting to a 40% reduction by 2030 compared to 2005 levels, as revised upward from the original 30% target under the Fit for 55 package.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down obligations on Member States with respect to their minimum contributions for the period from 2021 to 2030 to fulfilling the Union's target of reducing its greenhouse gas emissions by 40% below 2005 levels in 2030 in the sectors covered by this Regulation. This Regulation thereby contributes to achieving the objectives of the Paris Agreement.

Article 2 — Scope

1. This Regulation applies to the greenhouse gas emissions from IPCC source categories of energy, industrial processes and product use, agriculture and waste as determined pursuant to Regulation (EU) No 525/2013, excluding greenhouse gas emissions from the activities listed in Annex I to Directive 2003/87/EC other than any activities opted in in accordance with Article 24 of that Directive.

2. Without prejudice to the more stringent obligations of individual Member States set out in Annex I, this Regulation does not apply to greenhouse gas emissions and removals covered by Regulation (EU) 2018/841.

CHAPTER II — TARGETS AND FLEXIBILITIES

Article 4 — Annual emission allocations

1. Each Member State shall, in 2030, limit its greenhouse gas emissions at least by the percentage set for that Member State in Annex I in relation to its 2005 greenhouse gas emissions, determined pursuant to paragraph 3.

2. Subject to the flexibilities provided for in Articles 5, 6 and 7, each Member State shall ensure that its greenhouse gas emissions in each year between 2021 and 2029 do not exceed the limit defined by a linear trajectory, starting in 2018 on the average of its greenhouse gas emissions during 2016, 2017 and 2018 and ending in 2030 on the limit set for that Member State in Annex I.

3. The Commission shall adopt implementing acts setting out the annual emission allocations for each Member State for the years from 2021 to 2030 in terms of tonnes of CO2 equivalent.

Article 5 — Flexibilities by banking and borrowing

1. In respect of the years 2021 to 2029, a Member State may borrow a quantity of up to 10% from its annual emission allocation for the following year.

2. A Member State whose greenhouse gas emissions for a given year are below its annual emission allocation for that year may bank the excess part of its annual emission allocation to subsequent years until 2030.

3. A Member State may transfer up to 5% of its annual emission allocation for a given year to other Member States. The receiving Member State may use that quantity for compliance under Article 9 for that year or for subsequent years until 2030.

Article 6 — Flexibility for certain Member States following reduction of EU ETS allowances

1. Those Member States listed in Annex II to this Regulation may have a limited cancellation of up to a maximum of 100 million EU ETS allowances for the period 2021-2030 collectively taken into account for their compliance under this Regulation.

Article 7 — Additional use of net removals from LULUCF

1. To the extent that a Member State's greenhouse gas emissions exceed its annual emission allocations for a given year, a quantity up to the sum of total net removals and total net emissions from the combined land accounting categories of deforested land, afforested land, managed cropland, managed grassland, and, under certain conditions, managed forest land and managed wetland, may be taken into account for its compliance.

2. The maximum total use under paragraph 1 shall not exceed 280 million tonnes of CO2 equivalent for the Union as a whole for the period 2021-2030. The share of each Member State shall not exceed the levels set out in Annex III.

CHAPTER III — REPORTING AND ASSESSMENT

Article 8 — Assessment of progress

1. The Commission shall evaluate, on the basis of the national inventory data, the annual emission reports and other information, the progress of each Member State towards meeting its obligations under this Regulation.

2. The Commission shall submit an annual report to the European Parliament and to the Council on the progress by each Member State, and the Union as a whole, towards meeting the obligations under this Regulation.

Article 9 — Corrective action

1. If a Member State's reviewed greenhouse gas emissions in any specific year exceed its annual emission allocation for any year in the period, the following measures shall apply:
(a) a quantity equal to the amount in tonnes of CO2 equivalent of the excess greenhouse gas emissions, multiplied by a factor of 1.08, shall be added to the greenhouse gas emission figure of the Member State in the following year;
(b) the Member State shall be temporarily prohibited from transferring any part of its annual emission allocation to another Member State;
(c) the Member State shall submit a corrective action plan to the Commission within three months.

CHAPTER IV — FINAL PROVISIONS

Article 11 — Amendments

Annex I sets out Member States' greenhouse gas emission reduction targets for 2030. As amended by Regulation (EU) 2023/857, the targets have been increased. For example:
- Germany: -50%
- France: -47.5%
- Italy: -43.7%
- Spain: -37.7%
- Poland: -17.7%
- Romania: -12.7%
- Bulgaria: -10%

Article 14 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 30 May 2018.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'lulucf-regulation',
    title: 'Regulation (EU) 2018/841 on the inclusion of greenhouse gas emissions and removals from LULUCF',
    short_title: 'LULUCF Regulation',
    celex_number: '32018R0841',
    document_type: 'regulation',
    domain: 'climate',
    status: 'amended',
    adoption_date: '2018-05-30',
    entry_into_force: '2018-07-09',
    summary: 'Includes greenhouse gas emissions and removals from land use, land use change, and forestry in the EU climate framework. Sets a target of 310 Mt CO2 net removals by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0841',
    full_text: `REGULATION (EU) 2018/841 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 30 May 2018
on the inclusion of greenhouse gas emissions and removals from land use, land use change and forestry in the 2030 climate and energy framework, and amending Regulation (EU) No 525/2013 and Decision No 529/2013/EU

(as amended by Regulation (EU) 2023/839)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The land use, land use change and forestry (LULUCF) sector in the Union both emits and removes greenhouse gases from the atmosphere. The sector has the potential to provide long-term climate benefits and thus contribute to the achievement of the Union's greenhouse gas emission reduction target and the long-term climate goals of the Paris Agreement.

(2) The LULUCF sector can contribute to climate change mitigation in several ways, in particular by reducing emissions, and maintaining and enhancing sinks and carbon stocks. In order for measures aimed in particular at increasing carbon sequestration to be effective, the long-term stability and adaptability of carbon pools is essential.

(3) On 23 October 2014, the European Council endorsed the inclusion of the LULUCF sector into the Union's 2030 greenhouse gas reduction commitment, under the approach of "no debit" — ensuring that the sector does not generate net emissions.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down the rules for accounting of greenhouse gas emissions and removals from land use, land use change and forestry (LULUCF) and for checking compliance of Member States' commitments under this Regulation for the periods from 2021 to 2025 and from 2026 to 2030.

Article 2 — Scope

1. This Regulation applies to emissions and removals of greenhouse gases as listed in Section A of Annex I, as reported pursuant to Article 26(4) of Regulation (EU) 2018/1999 and falling within the following land accounting categories:
(a) afforested land;
(b) deforested land;
(c) managed cropland;
(d) managed grassland;
(e) managed forest land;
(f) managed wetland;
(g) harvested wood products;
(h) other land use categories where a Member State has reported emissions and removals.

CHAPTER II — ACCOUNTING RULES

Article 4 — Commitments and targets

1. For the period from 2021 to 2025, each Member State shall ensure that emissions do not exceed removals, calculated as the sum of total emissions and total removals on its territory in all of the land accounting categories referred to in Article 2.

2. The Union-wide target for net greenhouse gas removals in the LULUCF sector shall be 310 million tonnes CO2 equivalent in 2030, as set out in Annex IIa. Each Member State shall ensure that the sum of its net greenhouse gas emissions and removals in all land reporting categories referred to in Article 2(1) is at least equal to or less than the target set for that Member State in Annex IIa.

Article 5 — General accounting rules

1. Each Member State shall prepare and maintain accounts that accurately reflect the emissions and removals from the land accounting categories referred to in Article 2.

2. Where a change in the categorisation of land occurs, such change shall be reflected in the accounts for a period of 20 years from the date on which the change occurred.

Article 6 — Accounting for afforested land and deforested land

1. Each Member State shall account for emissions and removals on afforested land and deforested land as total emissions and total removals for each of the years in the periods from 2021 to 2025 and from 2026 to 2030.

2. By way of derogation from the requirement to apply the default value for change of land use category established in Article 5(2), a Member State may move cropland, grassland, wetland, settlement or other land to the afforested land category and may move forest land to the deforested land category after 20 years.

Article 7 — Accounting for managed cropland, managed grassland and managed wetland

1. Each Member State shall account for emissions and removals on managed cropland by calculating emissions and removals in each of the years in the periods from 2021 to 2025 and from 2026 to 2030 and subtracting the value obtained by multiplying the average annual emissions and removals from managed cropland in the Member State in the period from 2005 to 2009 by five (or for the period from 2026 to 2030, by the corresponding number of years).

Article 8 — Accounting for managed forest land

1. Each Member State shall account for emissions and removals on managed forest land. For the period from 2021 to 2025, each Member State shall use a national forestry accounting plan including a forest reference level to account for managed forest land.

2. Where the result of the accounting shows net removals from managed forest land, a Member State shall include those in its accounts up to a maximum of the compensation provided for in Annex II.

Article 9 — Harvested wood products

1. Member States shall reflect in their accounts harvested wood products falling within the following categories using the first-order decay function and half-life values:
(a) paper (half-life of 2 years);
(b) wood panels (half-life of 25 years);
(c) sawn wood (half-life of 35 years).

CHAPTER III — FLEXIBILITIES

Article 11 — General flexibility

1. A Member State may use the general flexibility mechanisms of this Chapter to comply with its obligations.

2. Where the emissions of a Member State exceed the removals, and the Member State has not used sufficient flexibility mechanisms, the excess shall be added to the Member State's greenhouse gas emissions reported under the Effort Sharing Regulation.

Article 12 — Managed forest land flexibility

Where total emissions exceed total removals in a Member State, a Member State may use the managed forest land flexibility to comply with Article 4, subject to the conditions and limits set out in this Article.

Article 13 — LULUCF–ESR flexibility

Where a Member State has achieved net removals exceeding its commitment under this Regulation, it may transfer the excess removals to other Member States, or use such excess removals for compliance under the Effort Sharing Regulation, up to the limits set out in Annex III.

CHAPTER IV — GOVERNANCE AND REVIEW

Article 14 — Compliance check

1. By 15 March 2027 for the period from 2021 to 2025, and by 15 March 2032 for the period from 2026 to 2030, the Commission shall submit a report on compliance by each Member State with the obligations under this Regulation.

Article 15 — Registry

The Commission shall establish and maintain a LULUCF compliance registry to keep track of each Member State's emissions, removals, flexibilities used, and compliance status.

Article 16 — Review

1. The Commission shall report to the European Parliament and to the Council on the operation of this Regulation. The Commission's report shall, where appropriate, be accompanied by proposals for review.

2. Following the 2023 global stocktake under the Paris Agreement, the Commission shall assess whether the land-sector targets are consistent with achieving the Union's overall climate neutrality objective.

CHAPTER V — FINAL PROVISIONS

Article 17 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 30 May 2018.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'renewable-energy-directive',
    title: 'Directive (EU) 2018/2001 on the promotion of the use of energy from renewable sources (RED II)',
    short_title: 'Renewable Energy Directive (RED II)',
    celex_number: '32018L2001',
    document_type: 'directive',
    domain: 'energy',
    status: 'amended',
    adoption_date: '2018-12-11',
    entry_into_force: '2018-12-24',
    summary: 'Sets a binding EU target of at least 42.5% renewable energy in gross final energy consumption by 2030. Provides rules for renewable energy guarantees of origin, self-consumption, and renewable energy communities.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L2001',
    full_text: `DIRECTIVE (EU) 2018/2001 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 11 December 2018
on the promotion of the use of energy from renewable sources (recast)

(as amended by Directive (EU) 2023/2413)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 194(2) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The promotion of renewable forms of energy is one of the goals of Union energy policy. The increased use of energy from renewable sources constitutes an important part of the package of measures needed to reduce greenhouse gas emissions and comply with the Union's commitment under the 2015 Paris Agreement on Climate Change and the Union's 2030 energy and climate framework.

(2) Renewable energy plays a fundamental role in achieving the European Green Deal objectives and climate neutrality by 2050, given that the energy sector contributes over 75% of the Union's total greenhouse gas emissions.

(3) Directive 2009/28/EC of the European Parliament and of the Council set a binding target of 20% for the overall share of energy from renewable sources in gross final energy consumption in the Union by 2020.

TITLE I — SUBJECT MATTER, DEFINITIONS AND TARGETS

Article 1 — Subject matter

This Directive establishes a common framework for the promotion of energy from renewable sources. It sets a binding Union target for the overall share of energy from renewable sources in the Union's gross final energy consumption in 2030.

Article 2 — Definitions

For the purposes of this Directive, the following definitions apply:
(1) 'energy from renewable sources' or 'renewable energy' means energy from renewable non-fossil sources, namely wind, solar (solar thermal and solar photovoltaic) and geothermal energy, ambient energy, tide, wave and other ocean energy, hydropower, biomass, landfill gas, sewage treatment plant gas, and biogas;
(2) 'ambient energy' means naturally occurring thermal energy and energy accumulated in the environment within a defined boundary, which can be stored in the ambient air, beneath the surface of solid earth, or in surface water;
(3) 'gross final consumption of energy' means the energy commodities delivered for energy purposes to final consumers, including the consumption of electricity and heat by the energy branch for electricity and heat production, and including losses of electricity and heat in distribution and transmission;
(4) 'renewable energy community' means a legal entity which, in accordance with the applicable national law, is based on open and voluntary participation, is autonomous, and is effectively controlled by shareholders or members that are located in the proximity of the renewable energy projects that are owned and developed by that legal entity;
(5) 'self-consumer of renewable energy' or 'renewables self-consumer' means a final customer who generates renewable electricity for its own consumption, and who may store or sell self-generated renewable electricity;
(6) 'guarantee of origin' means an electronic document which has the sole function of providing evidence to a final customer that a given share or quantity of energy was produced from renewable sources;
(7) 'renewable hydrogen' means hydrogen produced from the electrolysis of water using electricity from renewable sources, or from the reforming of biogas or biochemical conversion of biomass, provided that the greenhouse gas emission reduction requirements are met.

Article 3 — Binding overall Union target for 2030

1. Member States shall collectively ensure that the share of energy from renewable sources in the Union's gross final consumption of energy in 2030 is at least 42.5%.

Each Member State shall set its national contribution to meet, collectively, the binding overall Union target set in the first subparagraph as part of its integrated national energy and climate plan in accordance with Articles 3 to 5 of Regulation (EU) 2018/1999.

2. Member States shall collectively endeavour to increase the share of renewable energy to 45% in 2030 as part of the effort to reach the Union's climate neutrality objective.

TITLE II — PERMITTING, ADMINISTRATIVE PROCEDURES AND PLANNING

Article 15 — Administrative procedures, regulations and codes

1. Member States shall ensure that any national rules concerning the authorisation, certification and licensing procedures that are applied to plants and associated transmission and distribution networks for the production of electricity, heating or cooling from renewable sources are proportionate and necessary and contribute to the implementation of the energy efficiency first principle.

2. Member States shall clearly define the technical specifications and requirements which renewable energy equipment and systems need to comply with in order to benefit from support schemes. Where European standards exist, those technical specifications shall be expressed in terms of those standards.

Article 15a — Renewable acceleration areas

1. By 21 May 2025, Member States shall adopt a plan or plans designating renewable acceleration areas. In those areas, projects for renewable energy shall not be expected to have significant environmental effects. Consequently, those projects shall be exempted from the requirement to carry out an environmental impact assessment.

2. The plan or plans designating renewable acceleration areas shall be subject to an environmental assessment. Through this environmental assessment, appropriate mitigation measures shall be identified.

Article 16 — Organisation and duration of the permit-granting process

1. The permit-granting process shall cover all relevant administrative permits to build, repower and operate plants for the production of energy from renewable sources. The permit-granting process shall include all relevant procedures from the acknowledgement of the validity of the application to the notification of the final decision.

2. The permit-granting process referred to in paragraph 1 shall not exceed two years for renewable energy plants, including all relevant procedures. For renewable acceleration areas, the permit-granting process shall not exceed one year.

TITLE III — RENEWABLE ENERGY IN THE HEATING AND COOLING SECTOR

Article 23 — Mainstreaming renewable energy in the heating and cooling sector

1. Member States shall endeavour to increase the share of renewable energy in the heating and cooling sector by an indicative 1.1 percentage point as an annual average calculated for the periods 2021 to 2025 and 2026 to 2030.

2. Member States may count waste heat and cold for the purposes of the indicative increase set out in paragraph 1, up to a limit of 40% of the average annual increase.

TITLE IV — RENEWABLE ENERGY IN THE TRANSPORT SECTOR

Article 25 — Mainstreaming renewable energy in the transport sector

1. With effect from 1 January 2030, each Member State shall set an obligation on fuel suppliers to ensure that:
(a) the share of renewable energy within the final consumption of energy in the transport sector is at least 29%; or
(b) the greenhouse gas intensity reduction from the use of renewable energy and renewable-carbon fuels is at least 14.5%.

2. Member States shall establish a mechanism allowing fuel suppliers in their territory to exchange credits for supplying renewable energy to the transport sector. Operators of electric vehicle charging points that supply renewable electricity to electric vehicles shall receive credits.

TITLE V — GUARANTEES OF ORIGIN, DISCLOSURE AND SUSTAINABILITY

Article 19 — Guarantees of origin for energy from renewable sources

1. For the purposes of demonstrating to final customers the share or quantity of energy from renewable sources in an energy supplier's energy mix, Member States shall ensure that the origin of energy from renewable sources can be guaranteed as such within the meaning of this Directive, in accordance with objective, transparent and non-discriminatory criteria.

2. Guarantees of origin shall be issued for a standard size of 1 MWh. No more than one guarantee of origin shall be issued in respect of each unit of energy produced.

3. Guarantees of origin shall be valid for 12 months after the production of the relevant energy unit. Member States shall ensure that all guarantees of origin that have not been cancelled expire at the latest 18 months after the production of the energy unit.

Article 29 — Sustainability and greenhouse gas emissions saving criteria for biofuels, bioliquids and biomass fuels

1. Energy from biofuels, bioliquids and biomass fuels shall be taken into account for the purposes of this Directive only if they fulfil the sustainability and greenhouse gas emissions saving criteria laid down in paragraphs 2 to 7 and 10.

2. Biofuels, bioliquids and biomass fuels produced from agricultural biomass shall not be made from raw material obtained from land with a high biodiversity value.

3. Biofuels, bioliquids and biomass fuels produced from agricultural biomass shall not be made from raw material obtained from land with high carbon stock.

TITLE VI — FINAL PROVISIONS

Article 36 — Transposition

1. Member States shall bring into force the laws, regulations and administrative provisions necessary to comply with Articles 15a and 16 by 1 July 2024 at the latest.

2. Member States shall bring into force the laws necessary to comply with the remaining amended provisions by 21 May 2025 at the latest.

Article 37 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Strasbourg, 11 December 2018.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'energy-efficiency-directive',
    title: 'Directive (EU) 2023/1791 on energy efficiency (recast)',
    short_title: 'Energy Efficiency Directive',
    celex_number: '32023L1791',
    document_type: 'directive',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2023-09-13',
    entry_into_force: '2023-10-10',
    summary: 'Sets a binding EU energy efficiency target of 11.7% reduction in final energy consumption by 2030 compared to 2020 projections. Strengthens the energy efficiency first principle and annual savings obligations.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L1791',
    full_text: `DIRECTIVE (EU) 2023/1791 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 September 2023
on energy efficiency and amending Regulation (EU) 2023/955 (recast)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 194(2) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The European Green Deal confirmed the Union's ambition to become climate neutral by 2050. The European Climate Law established a binding commitment to reduce net greenhouse gas emissions by at least 55% by 2030 compared to 1990 levels. Energy efficiency is key to achieving these objectives, as the most sustainable energy is the energy that is not consumed.

(2) The energy efficiency first principle is an overarching principle that should be taken into account across all sectors, going beyond the energy system, at all levels, including in the financial sector, and be applied in all relevant policy, planning and major investment decisions.

(3) The Union's 2030 energy efficiency target needs to be increased to be consistent with the higher climate ambition. A binding target of 11.7% reduction in final energy consumption by 2030 compared to the 2020 Reference Scenario projections is appropriate.

CHAPTER I — SUBJECT MATTER, SCOPE, DEFINITIONS AND ENERGY EFFICIENCY TARGETS

Article 1 — Subject matter and scope

1. This Directive establishes a common framework of measures for the promotion of energy efficiency within the Union in order to ensure the achievement of the Union's energy efficiency targets and enables further energy efficiency improvements.

2. The requirements laid down in this Directive are minimum requirements and shall not prevent any Member State from maintaining or introducing more stringent measures.

Article 2 — Definitions

For the purposes of this Directive, the following definitions apply:
(1) 'energy efficiency' means the ratio of output of performance, service, goods or energy, to input of energy;
(2) 'energy savings' means an amount of saved energy determined by measuring and/or estimating consumption before and after implementation of an energy efficiency improvement measure;
(3) 'energy efficiency first principle' means taking utmost account in energy planning, and in policy and investment decisions, of alternative cost-efficient energy efficiency measures to make energy demand and energy supply more efficient;
(4) 'energy management system' means a set of interrelated or interacting elements of a plan which sets an energy efficiency objective and a strategy to achieve that objective;
(5) 'energy audit' means a systematic procedure with the purpose of obtaining adequate knowledge of the existing energy consumption profile of a building or group of buildings, an industrial or commercial operation or installation or a private or public service, identifying and quantifying cost-effective energy savings opportunities, and reporting the findings.

Article 4 — Energy efficiency targets

1. Member States shall collectively ensure a reduction of energy consumption of at least 11.7% in 2030 compared to the projections of the 2020 Reference Scenario, so that the Union's final energy consumption amounts to no more than 763 Mtoe in 2030.

2. Each Member State shall set an indicative national energy efficiency contribution based on final energy consumption to collectively achieve the binding Union target referred to in paragraph 1. Member States shall notify those contributions together with an indicative trajectory to the Commission as part of their integrated national energy and climate plans.

3. Where the Commission concludes, on the basis of its assessment, that insufficient progress has been made towards achieving the energy efficiency contributions, Member States that are above their indicative trajectories shall ensure that additional measures are implemented within one year following the date of reception of the Commission's assessment to get back on track.

CHAPTER II — EXEMPLARY ROLE OF THE PUBLIC SECTOR

Article 5 — Public sector leading by example

1. Member States shall ensure that the total final energy consumption of all public bodies combined is reduced by at least 1.9% each year, compared to the year 2021.

2. Member States may take into account climate variations within the Member State when calculating their public sector's final energy consumption.

Article 6 — Renovation of public bodies' buildings

1. Without prejudice to Article 7 of Directive 2010/31/EU, each Member State shall ensure that at least 3% of the total floor area of heated and/or cooled buildings owned by public bodies is renovated each year to meet at least the nearly zero-energy building requirements or the zero-emission building requirements.

2. Member States may decide to apply the requirement to renovate 3% of the total floor area to buildings owned and occupied by central government.

CHAPTER III — ENERGY EFFICIENCY IN ENERGY USE

Article 8 — Energy savings obligation

1. Member States shall achieve cumulative end-use energy savings at least equivalent to:
(a) new savings each year from 1 January 2021 to 31 December 2030 of 0.8% of annual final energy consumption, averaged over the three-year period prior to 1 January 2019;
(b) new savings each year from 1 January 2024 to 31 December 2030 of 1.3% of annual final energy consumption, averaged over the three-year period prior to 1 January 2019;
(c) new savings each year from 1 January 2026 to 31 December 2030 of 1.5% of annual final energy consumption, averaged over the three-year period prior to 1 January 2019;
(d) new savings each year from 1 January 2028 to 31 December 2030 of 1.9% of annual final energy consumption, averaged over the three-year period prior to 1 January 2019.

2. Member States shall achieve the amount of required energy savings among final customers through an energy efficiency obligation scheme, alternative policy measures, or a combination of both.

Article 9 — Energy management systems and energy audits

1. Member States shall ensure that enterprises with an average annual consumption higher than 85 TJ of energy over the previous three years, taking all energy carriers together, implement an energy management system. The energy management system shall be certified by an independent body according to the relevant European or international standards.

2. Member States shall ensure that enterprises with an average annual consumption higher than 10 TJ of energy over the previous three years, and which do not implement an energy management system, are subject to an energy audit. Energy audits shall be carried out in an independent and cost-effective manner by qualified or accredited experts.

CHAPTER IV — ENERGY EFFICIENCY IN ENERGY SUPPLY

Article 23 — Efficient heating and cooling

1. Member States shall carry out a comprehensive assessment of the potential for the application of high-efficiency cogeneration and efficient district heating and cooling.

2. Member States shall adopt policies and measures to exploit the potential identified through the assessment carried out pursuant to paragraph 1, including measures to develop efficient district heating and cooling infrastructure to accommodate the development of high-efficiency cogeneration and the use of heating and cooling from waste heat and renewable energy sources.

3. Member States shall ensure that the share of renewable energy and waste heat and cold in district heating and cooling increases by at least the following:
(a) 2.2 percentage points as an annual average calculated for the period 2021-2025; and
(b) 2.3 percentage points as an annual average calculated for the period 2026-2030.

CHAPTER V — TRANSPARENCY AND CONSUMER INFORMATION

Article 24 — Information and awareness raising

1. Member States shall take appropriate measures to promote and facilitate an efficient use of energy by small energy customers, including domestic customers.

2. Member States shall ensure that information on available energy efficiency improvement measures and on the financial and legal frameworks adopted with a view to promoting the uptake of energy efficiency technologies and/or techniques is transparent and broadly disseminated to all relevant market actors.

Article 25 — Qualification, accreditation and certification schemes

1. Member States shall ensure that appropriate certification, accreditation and/or equivalent qualification schemes are available for providers of energy services, energy audits, energy managers and installers of energy-related building elements.

CHAPTER VI — FINAL PROVISIONS

Article 38 — Transposition

1. Member States shall bring into force the laws, regulations and administrative provisions necessary to comply with this Directive by 11 October 2025.

Article 39 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Strasbourg, 13 September 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'cbam-regulation',
    title: 'Regulation (EU) 2023/956 establishing a Carbon Border Adjustment Mechanism',
    short_title: 'CBAM Regulation',
    celex_number: '32023R0956',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2023-05-10',
    entry_into_force: '2023-05-17',
    summary: 'Introduces a carbon border tax on imports of carbon-intensive goods (cement, iron/steel, aluminium, fertilisers, electricity, hydrogen) to prevent carbon leakage. Transitional phase started October 2023. Definitive regime (certificate surrender) began 1 January 2026.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
    full_text: `REGULATION (EU) 2023/956 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 10 May 2023
establishing a carbon border adjustment mechanism

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The European Green Deal is a strategy for achieving climate neutrality by 2050. The European Climate Law establishes in legislation the binding Union target of reducing net greenhouse gas emissions by at least 55% by 2030 compared to 1990 levels and the binding Union objective of climate neutrality by 2050.

(2) The Paris Agreement calls for holding the increase in the global average temperature to well below 2°C and pursuing efforts to limit it to 1.5°C. There is also a growing concern that international climate policies will increasingly diverge, creating a risk of carbon leakage.

(3) As long as significant numbers of the Union's international partners have policy approaches that do not result in the same level of climate ambition, there is a risk of carbon leakage. Carbon leakage occurs if, for reasons of costs related to climate policies, businesses in certain industry sectors or subsectors were to transfer production to other countries or imports from those countries would replace equivalent but less greenhouse gas emissions intensive products.

(4) The EU ETS is the centrepiece of the Union's climate policy. Through the EU ETS, a price on greenhouse gas emissions creates financial incentives for emissions reductions. Free allocation of EU ETS allowances has been the primary policy tool to mitigate the risk of carbon leakage. CBAM seeks to replace the protection against carbon leakage currently afforded by free allocation.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

1. This Regulation establishes a carbon border adjustment mechanism (the 'CBAM') for addressing greenhouse gas emissions embedded in the goods referred to in Annex I on their importation into the customs territory of the Union, in order to prevent the risk of carbon leakage.

2. The CBAM complements the system for greenhouse gas emission allowance trading within the Union established by Directive 2003/87/EC by applying an equivalent set of rules to imports into the customs territory of the Union of the goods referred to in Annex I.

3. The mechanism will progressively become an alternative to the mechanisms established under Directive 2003/87/EC to prevent the risk of carbon leakage, notably the free allocation of allowances.

Article 2 — Scope

1. This Regulation applies to goods listed in Annex I originating in a third country, when those goods, or processed products from inward processing as referred to in Regulation (EU) No 952/2013 resulting from those goods, are imported into the customs territory of the Union.

2. This Regulation also applies to goods listed in Annex I where those goods are destined for the continental shelf or exclusive economic zone of a Member State.

3. The goods referred to in Annex I are identified by their Combined Nomenclature ('CN') codes and cover the following sectors:
(a) cement;
(b) electricity;
(c) fertilisers;
(d) iron and steel;
(e) aluminium;
(f) hydrogen.

Article 3 — Definitions

For the purposes of this Regulation, the following definitions apply:
(1) 'goods' means the goods listed in Annex I;
(2) 'greenhouse gases' means the greenhouse gases specified in Annex I in respect of each of the goods listed in that Annex;
(3) 'emissions' means the release of greenhouse gases into the atmosphere from the production of goods;
(4) 'embedded emissions' means direct emissions released during the production of goods, calculated pursuant to the methods set out in Annex IV, and indirect emissions;
(5) 'direct emissions' means emissions from the production processes of goods, including emissions from the production of heating and cooling that is consumed during the production processes;
(6) 'indirect emissions' means emissions from the generation of electricity which is consumed during the production processes of goods;
(7) 'CBAM certificate' means a certificate in electronic format corresponding to one tonne of embedded emissions in goods;
(8) 'carbon price' means the monetary amount paid in a third country in the form of a tax, levy or emission allowance under a greenhouse gas emissions trading system, calculated on a tonne of CO2 equivalent;
(9) 'authorised CBAM declarant' means a person who has been authorised by the competent authority to import goods and comply with the obligations under this Regulation.

CHAPTER II — OBLIGATIONS OF AUTHORISED CBAM DECLARANTS

Article 6 — Application for authorisation

1. Any importer established in a Member State shall, prior to importing goods, apply to the competent authority at the place where it is established for the status of authorised CBAM declarant.

2. The application shall include the following information:
(a) the name, address and contact details of the applicant;
(b) the identification number assigned by customs;
(c) the main importing activities and the type and value of goods imported;
(d) the name and address of the installations in third countries where the goods are produced.

Article 7 — CBAM declaration

1. By 31 May of each year, each authorised CBAM declarant shall submit a declaration ('CBAM declaration') to the competent authority for the calendar year preceding that declaration.

2. The CBAM declaration shall contain the following information:
(a) the total quantity of each type of goods imported during the preceding calendar year;
(b) the total embedded emissions in those goods;
(c) the total number of CBAM certificates to be surrendered corresponding to the total embedded emissions, after reduction of any carbon price effectively paid in a country of origin;
(d) copies of the verification reports issued pursuant to Article 8.

Article 8 — Verification of embedded emissions

1. The authorised CBAM declarant shall ensure that the total embedded emissions declared in the CBAM declaration are verified by an accredited verifier.

2. The accredited verifier shall be accredited by a national accreditation body pursuant to Regulation (EC) No 765/2008.

CHAPTER III — CBAM CERTIFICATES

Article 20 — Sale of CBAM certificates

1. The competent authority of each Member State shall sell CBAM certificates to authorised CBAM declarants established in that Member State through the common central platform.

2. The Commission shall calculate the price of CBAM certificates as the average price of the closing prices of EU ETS allowances on the common auction platform for each calendar week.

Article 21 — Surrender of CBAM certificates

1. By 31 May of each year, the authorised CBAM declarant shall surrender, via the CBAM registry, a number of CBAM certificates that corresponds to the embedded emissions declared in accordance with Article 7 for the preceding calendar year.

2. The authorised CBAM declarant shall ensure that the number of CBAM certificates held in its account in the CBAM registry at the end of each quarter corresponds to at least 80% of the embedded emissions determined by reference to default values.

Article 22 — Carbon price paid in a country of origin

1. An authorised CBAM declarant may claim a reduction in the number of CBAM certificates to be surrendered in order to take into account the carbon price effectively paid in the country of origin for the declared embedded emissions.

2. The reduction shall be calculated by converting the carbon price effectively paid into a price per tonne of CO2 emissions and deducting it from the CBAM certificate price.

CHAPTER IV — TRANSITIONAL PROVISIONS

Article 32 — Transitional period

1. During the transitional period from 1 October 2023 to 31 December 2025, the obligations of the importer under this Regulation shall be limited to the reporting obligations set out in Articles 33, 34 and 35.

2. The Commission shall adopt implementing acts establishing detailed rules regarding the information to be reported during the transitional period.

Article 36 — Phase-out of free allocation

From 2026 to 2034, the number of free allowances allocated under the EU ETS to sectors covered by this Regulation shall be gradually reduced, while CBAM obligations increase correspondingly:
- 2026: 97.5% free allocation, 2.5% CBAM
- 2027: 95% free allocation, 5% CBAM
- 2028: 90% free allocation, 10% CBAM
- 2029: 77.5% free allocation, 22.5% CBAM
- 2030: 51.5% free allocation, 48.5% CBAM
- 2031: 39% free allocation, 61% CBAM
- 2032: 26.5% free allocation, 73.5% CBAM
- 2033: 14% free allocation, 86% CBAM
- 2034: 0% free allocation, 100% CBAM

CHAPTER V — FINAL PROVISIONS

Article 37 — Review

By 1 January 2028, the Commission shall present a report to the European Parliament and the Council on the application of this Regulation. The report shall contain an assessment of the possibility of extending the scope to other goods at risk of carbon leakage, including organic chemicals, polymers, and downstream products.

Article 38 — Entry into force

This Regulation shall enter into force on the day following that of its publication in the Official Journal of the European Union. It shall apply from 1 October 2023, with the exception of Articles 20 to 22, Article 25 and Article 26, which shall apply from 1 January 2026.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 10 May 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'taxonomy-regulation',
    title: 'Regulation (EU) 2020/852 on the establishment of a framework to facilitate sustainable investment (EU Taxonomy)',
    short_title: 'EU Taxonomy Regulation',
    celex_number: '32020R0852',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2020-06-18',
    entry_into_force: '2020-07-12',
    summary: 'Creates a classification system for environmentally sustainable economic activities. Defines six environmental objectives and establishes technical screening criteria for determining sustainability.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0852',
    full_text: `REGULATION (EU) 2020/852 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 18 June 2020
on the establishment of a framework to facilitate sustainable investment, and amending Regulation (EU) 2019/2088

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The 2030 Agenda for Sustainable Development, adopted by the United Nations General Assembly on 25 September 2015, sets out universal goals for sustainable development and calls for the mobilisation of private capital to support the transition.

(2) The European Green Deal confirmed the Commission's ambition to make Europe the first climate-neutral continent by 2050. The Taxonomy Regulation supports this objective by channelling private investment into truly sustainable activities.

(3) The absence of a common classification system at Union level has led to divergent practices and 'greenwashing', where financial products are marketed as environmentally sustainable when in fact they do not meet basic environmental standards. This undermines investor confidence and trust.

CHAPTER I — SUBJECT MATTER, SCOPE AND DEFINITIONS

Article 1 — Subject matter and scope

1. This Regulation establishes the criteria for determining whether an economic activity qualifies as environmentally sustainable for the purposes of establishing the degree to which an investment is environmentally sustainable.

2. This Regulation applies to:
(a) measures adopted by Member States or by the Union that set out requirements for financial market participants or issuers in respect of financial products or corporate bonds that are made available as environmentally sustainable;
(b) financial market participants that make available financial products;
(c) undertakings which are subject to the obligation to publish a non-financial statement or a consolidated non-financial statement pursuant to Article 19a or Article 29a of Directive 2013/34/EU respectively.

Article 2 — Definitions

For the purposes of this Regulation, the following definitions apply:
(1) 'environmentally sustainable investment' means an investment in one or several economic activities that qualify as environmentally sustainable under this Regulation;
(2) 'financial market participants' means financial market participants as defined in point (1) of Article 2 of Regulation (EU) 2019/2088;
(3) 'technical screening criteria' means the criteria specified in the delegated acts adopted on the basis of this Regulation that allow determining under which conditions a specific economic activity qualifies as contributing substantially to one of the environmental objectives set out in Article 9;
(4) 'climate change mitigation' means the process of holding the increase in the global average temperature to well below 2°C and pursuing efforts to limit it to 1.5°C above pre-industrial levels, as laid down in the Paris Agreement.

CHAPTER II — ENVIRONMENTALLY SUSTAINABLE ECONOMIC ACTIVITIES

Article 3 — Criteria for environmentally sustainable economic activities

For the purposes of establishing the degree to which an investment is environmentally sustainable, an economic activity shall qualify as environmentally sustainable where that economic activity:
(a) contributes substantially to one or more of the environmental objectives set out in Article 9 in accordance with Articles 10 to 16;
(b) does not significantly harm any of the environmental objectives set out in Article 9 in accordance with Article 17;
(c) is carried out in compliance with the minimum safeguards laid down in Article 18; and
(d) complies with technical screening criteria that have been established by the Commission.

Article 9 — Environmental objectives

For the purposes of this Regulation, the following shall be environmental objectives:
(a) climate change mitigation;
(b) climate change adaptation;
(c) the sustainable use and protection of water and marine resources;
(d) the transition to a circular economy;
(e) pollution prevention and control;
(f) the protection and restoration of biodiversity and ecosystems.

Article 10 — Substantial contribution to climate change mitigation

1. An economic activity shall qualify as contributing substantially to climate change mitigation where that activity contributes substantially to the stabilisation of greenhouse gas concentrations in the atmosphere at a level which prevents dangerous anthropogenic interference with the climate system consistent with the long-term temperature goal of the Paris Agreement through the avoidance or reduction of greenhouse gas emissions or the increase of greenhouse gas removals.

2. An economic activity shall qualify as contributing substantially to climate change mitigation if that activity:
(a) generating, transmitting, storing, distributing or using renewable energy;
(b) improving energy efficiency;
(c) increasing clean or climate-neutral mobility;
(d) switching to the use of sustainably sourced renewable materials;
(e) increasing the use of environmentally safe carbon capture and utilisation (CCU) and carbon capture and storage (CCS) technologies;
(f) strengthening land carbon sinks;
(g) establishing energy infrastructure needed for enabling the decarbonisation of energy systems;
(h) producing clean and efficient fuels from renewable or carbon-neutral sources;
(i) enabling any of the activities listed in points (a) to (h).

Article 11 — Substantial contribution to climate change adaptation

An economic activity shall qualify as contributing substantially to climate change adaptation where that activity:
(a) includes adaptation solutions that either substantially reduce the risk of the adverse impact of the current climate and the expected future climate on that economic activity or substantially reduce that adverse impact, without increasing the risk of an adverse impact on people, nature or assets; or
(b) provides adaptation solutions that contribute substantially to preventing or reducing the risk of the adverse impact of the current climate and the expected future climate on people, nature or assets, without increasing the risk of an adverse impact on other people, nature or assets.

Article 17 — Significant harm to environmental objectives

1. An economic activity shall be considered to significantly harm:
(a) climate change mitigation, where that activity leads to significant greenhouse gas emissions;
(b) climate change adaptation, where that activity leads to an increased adverse impact of the current climate and the expected future climate, on the activity itself or on people, nature or assets;
(c) the sustainable use and protection of water and marine resources, where that activity is detrimental to the good status or the good ecological potential of bodies of water;
(d) the transition to a circular economy, where that activity leads to significant inefficiencies in the use of materials or in the direct or indirect use of natural resources;
(e) pollution prevention and control, where that activity leads to a significant increase in the emissions of pollutants into air, water or land;
(f) the protection and restoration of biodiversity and ecosystems, where that activity is significantly detrimental to the good condition and resilience of ecosystems.

Article 18 — Minimum safeguards

The minimum safeguards referred to in Article 3(c) shall be procedures implemented by an undertaking that is carrying out an economic activity to ensure the alignment with the OECD Guidelines for Multinational Enterprises and the UN Guiding Principles on Business and Human Rights, including the principles and rights set out in the eight fundamental conventions identified in the Declaration of the International Labour Organisation on Fundamental Principles and Rights at Work.

CHAPTER III — DISCLOSURE OBLIGATIONS

Article 5 — Transparency of environmentally sustainable investments in pre-contractual disclosures and periodic reports

Where a financial product makes available underlying investments in economic activities that qualify as environmentally sustainable, the pre-contractual disclosures and periodic reports shall include:
(a) information on the environmental objective or objectives to which the investment underlying the financial product contributes;
(b) a description of how and to what extent the underlying investments of the financial product are in economic activities that qualify as environmentally sustainable.

Article 6 — Transparency of financial products that promote environmental characteristics

Where a financial product promotes environmental characteristics, the disclosures shall include a statement that the investments underlying the financial product do not take into account the EU criteria for environmentally sustainable economic activities, where that is the case.

Article 7 — Transparency in non-financial statements

Undertakings that are required to publish non-financial statements shall include information on how, and to what extent, the undertaking's activities are associated with economic activities that qualify as environmentally sustainable. They shall disclose:
(a) the proportion of their turnover derived from products or services associated with economic activities that qualify as environmentally sustainable;
(b) the proportion of their capital expenditure and the proportion of their operating expenditure related to assets or processes associated with economic activities that qualify as environmentally sustainable.

CHAPTER IV — FINAL PROVISIONS

Article 26 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

Articles 4, 5, 6 and 7 shall apply from 1 January 2022 with regard to the environmental objectives referred to in points (a) and (b) of Article 9 and from 1 January 2023 with regard to the remaining environmental objectives.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 18 June 2020.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'sfdr',
    title: 'Regulation (EU) 2019/2088 on sustainability-related disclosures in the financial services sector (SFDR)',
    short_title: 'Sustainable Finance Disclosure Regulation',
    celex_number: '32019R2088',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2019-11-27',
    entry_into_force: '2019-12-29',
    summary: 'Requires financial market participants and advisers to disclose how they integrate sustainability risks and consider adverse sustainability impacts in their processes, and provide sustainability-related information about financial products.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R2088',
    full_text: `REGULATION (EU) 2019/2088 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 27 November 2019
on sustainability-related disclosures in the financial services sector

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) On 25 September 2015, the UN General Assembly adopted a new global sustainable development framework: the 2030 Agenda for Sustainable Development, which has at its core the Sustainable Development Goals (SDGs). The Commission Communication of 22 November 2016 on the next steps for a sustainable European future links the SDGs to the Union policy framework.

(2) The Paris Agreement adopted under the UNFCCC on 12 December 2015 entered into force on 4 November 2016. In Article 2(1)(c), the Paris Agreement sets the goal of strengthening the response to climate change by, among others, making finance flows consistent with a pathway towards low greenhouse gas emissions and climate-resilient development.

(3) Sustainability considerations are not systematically taken into account in financial advice and investment decisions. A lack of transparency about sustainability risks and sustainable investment opportunities can lead to misallocation of capital and greenwashing.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down harmonised rules for financial market participants and financial advisers on transparency with regard to the integration of sustainability risks and the consideration of adverse sustainability impacts in their processes and the provision of sustainability-related information with respect to financial products.

Article 2 — Definitions

For the purposes of this Regulation, the following definitions apply:
(1) 'financial market participant' means:
(a) an insurance undertaking which makes available an insurance-based investment product (IBIP);
(b) an investment firm which provides portfolio management;
(c) an institution for occupational retirement provision (IORP);
(d) a manufacturer of a pension product;
(e) an alternative investment fund manager (AIFM);
(f) a pan-European personal pension product (PEPP) provider;
(g) a manager of a qualifying venture capital fund;
(h) a manager of a qualifying social entrepreneurship fund;
(i) a management company of an undertaking for collective investment in transferable securities (UCITS management company);
(j) a credit institution which provides portfolio management.

(17) 'sustainability risk' means an environmental, social or governance event or condition that, if it occurs, could cause an actual or a potential material negative impact on the value of the investment;
(18) 'sustainable investment' means an investment in an economic activity that contributes to an environmental objective, as measured, for example, by key resource efficiency indicators on the use of energy, renewable energy, raw materials, water and land, on the production of waste, and greenhouse gas emissions, or on its impact on biodiversity and the circular economy, or an investment in an economic activity that contributes to a social objective, in particular an investment that contributes to tackling inequality or that fosters social cohesion, social integration and labour relations;
(22) 'principal adverse impacts' means those impacts of investment decisions and advice that result in negative effects on sustainability factors;
(24) 'sustainability factors' means environmental, social and employee matters, respect for human rights, anti-corruption and anti-bribery matters.

CHAPTER II — TRANSPARENCY OF SUSTAINABILITY RISK POLICIES

Article 3 — Transparency of sustainability risk policies

1. Financial market participants shall publish on their websites information about their policies on the integration of sustainability risks in their investment decision-making process.

2. Financial advisers shall publish on their websites information about their policies on the integration of sustainability risks in their investment advice or insurance advice.

Article 4 — Transparency of adverse sustainability impacts at entity level

1. Financial market participants shall publish and maintain on their websites:
(a) where they consider principal adverse impacts of investment decisions on sustainability factors, a statement on due diligence policies with respect to those impacts, taking due account of their size, the nature and scale of their activities and the types of financial products they make available;
(b) where they do not consider adverse impacts of investment decisions on sustainability factors, clear reasons for why they do not do so, including, where relevant, information as to whether and when they intend to consider such adverse impacts.

2. Financial market participants that consider principal adverse impacts shall include in their disclosure:
(a) information on their policies on the identification and prioritisation of principal adverse sustainability impacts and indicators;
(b) a description of the principal adverse sustainability impacts and any actions taken in relation thereto or planned;
(c) brief summaries of engagement policies, where applicable;
(d) a reference to adherence to responsible business conduct codes and internationally recognised standards for due diligence and reporting.

Article 5 — Transparency of remuneration policies in relation to the integration of sustainability risks

Financial market participants and financial advisers shall include in their remuneration policies information on how those policies are consistent with the integration of sustainability risks.

CHAPTER III — TRANSPARENCY OF SUSTAINABILITY IMPACTS AT FINANCIAL PRODUCT LEVEL

Article 6 — Transparency of the integration of sustainability risks

1. Financial market participants shall include in pre-contractual disclosures:
(a) the manner in which sustainability risks are integrated into their investment decisions; and
(b) the results of the assessment of the likely impacts of sustainability risks on the returns of the financial products they make available.

Where financial market participants deem sustainability risks not to be relevant, the descriptions shall include a clear and concise explanation of the reasons therefor.

Article 8 — Transparency of the promotion of environmental or social characteristics in pre-contractual disclosures

1. Where a financial product promotes, among other characteristics, environmental or social characteristics, or a combination of those characteristics, provided that the companies in which the investments are made follow good governance practices, the information to be disclosed pursuant to Article 6(1) and (3) shall include the following:
(a) information on how those characteristics are met;
(b) if an index has been designated as a reference benchmark, information on whether and how this index is consistent with those characteristics.

Article 9 — Transparency of sustainable investments in pre-contractual disclosures

1. Where a financial product has sustainable investment as its objective and an index has been designated as a reference benchmark, the information to be disclosed shall include:
(a) information on how the designated index is aligned with that objective;
(b) an explanation as to why and how the designated index aligned with that objective differs from a broad market index.

2. Where a financial product has sustainable investment as its objective and no index has been designated as a reference benchmark, the information to be disclosed shall include an explanation on how that objective is to be attained.

3. Where a financial product has a reduction in carbon emissions as its objective, the information to be disclosed shall include the objective of low carbon emission exposure in view of achieving the long-term global warming objectives of the Paris Agreement.

CHAPTER IV — TRANSPARENCY IN PERIODIC REPORTS

Article 11 — Transparency of the promotion of environmental or social characteristics and of sustainable investments in periodic reports

1. Where a financial product promotes environmental or social characteristics (Article 8 product), the periodic report shall include the extent to which environmental or social characteristics are met.

2. Where a financial product has sustainable investment as its objective (Article 9 product), the periodic report shall include:
(a) the overall sustainability-related impact of the financial product by means of relevant sustainability indicators;
(b) for products with a carbon reduction objective, a comparison between the carbon footprint of the financial product with the designated index.

CHAPTER V — FINAL PROVISIONS

Article 18 — Review

By 30 December 2022, the Commission shall assess the application of this Regulation. The Commission shall in particular assess whether the application of this Regulation has led to a convergence in disclosures and improved sustainability transparency.

Article 20 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 10 March 2021.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 27 November 2019.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'co2-cars-regulation',
    title: 'Regulation (EU) 2019/631 setting CO2 emission performance standards for new passenger cars and light commercial vehicles',
    short_title: 'CO2 Standards for Cars',
    celex_number: '32019R0631',
    document_type: 'regulation',
    domain: 'transport',
    status: 'amended',
    adoption_date: '2019-04-17',
    entry_into_force: '2019-05-15',
    summary: 'Sets CO2 emission reduction targets for new cars and vans. Amended under Fit for 55 to require 100% CO2 reduction for new cars by 2035, effectively banning new internal combustion engine vehicles.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R0631',
    full_text: `REGULATION (EU) 2019/631 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 17 April 2019
setting CO2 emission performance standards for new passenger cars and for new light commercial vehicles, and repealing Regulations (EC) No 443/2009 and (EU) No 510/2011

(as amended by Regulation (EU) 2023/851)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The Paris Agreement sets out, inter alia, a long-term goal in line with the objective of keeping the global temperature increase to well below 2°C above pre-industrial levels and of pursuing efforts to keep it to 1.5°C above pre-industrial levels. The latest science as reflected in the special reports of the IPCC from 2018 and 2019 confirms the need to intensify global climate action.

(2) Road transport is the second-largest greenhouse gas emitting sector in the Union. Emissions from road transport continue to rise, mainly due to increasing transport demand. CO2 emissions from passenger cars and light commercial vehicles, including vans, represent around 15% of the Union's total CO2 emissions.

(3) In order to contribute to achieving the objectives of the Paris Agreement, the transformation of the entire transport sector towards zero emissions needs to be accelerated. The Commission Communication on the European Green Deal stresses the need for a 90% reduction in transport greenhouse gas emissions by 2050, while pursuing the ambition of zero-pollution for a toxic-free environment.

(4) Regulation (EU) 2023/851 amended this Regulation under the Fit for 55 package to increase the level of ambition, setting a 100% CO2 emission reduction target for new cars and vans by 2035.

CHAPTER I — SUBJECT MATTER AND DEFINITIONS

Article 1 — Subject matter and targets

1. This Regulation establishes CO2 emission performance standards for new passenger cars and for new light commercial vehicles in order to contribute to achieving the Union's target of reducing its greenhouse gas emissions.

2. From 1 January 2030, this Regulation sets the following EU fleet-wide targets:
(a) for the average emissions of the new passenger car fleet, an EU fleet-wide target equal to a 55% reduction of the 2021 target determined in accordance with Part A, point 6.1.1, of Annex I;
(b) for the average emissions of the new light commercial vehicles fleet, an EU fleet-wide target equal to a 50% reduction of the 2021 target determined in accordance with Part B, point 6.1.1, of Annex I.

3. From 1 January 2035, the following EU fleet-wide targets shall apply:
(a) for the average emissions of the new passenger car fleet, an EU fleet-wide target equal to a 100% reduction of the 2021 target determined in accordance with Annex I;
(b) for the average emissions of the new light commercial vehicles fleet, an EU fleet-wide target equal to a 100% reduction of the 2021 target determined in accordance with Annex I.

Article 2 — Scope

1. This Regulation shall apply to motor vehicles of categories M1 and N1 as defined in Annex II to Directive 2007/46/EC.

2. This Regulation shall apply to new vehicles that are registered in the Union for the first time and that have not previously been registered outside the Union.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'average specific emissions of CO2' means, in relation to a manufacturer, the average of the specific emissions of CO2 of all new passenger cars or of all new light commercial vehicles of which it is the manufacturer;
(2) 'specific emissions target' means, in relation to each manufacturer, an annual emissions target determined in accordance with Annex I;
(3) 'EU fleet-wide target' means the average CO2 emissions of all new vehicles first registered in a calendar year in the EU;
(4) 'specific emissions of CO2' means the CO2 emissions of a passenger car or light commercial vehicle measured in accordance with Regulation (EU) 2017/1151 and determined as the combined CO2 emissions;
(5) 'zero-emission vehicle' means a motor vehicle with zero tailpipe CO2 emissions;
(6) 'low-emission vehicle' means a passenger car with specific emissions of CO2 from zero up to 50 g CO2/km or a light commercial vehicle with specific emissions of CO2 from zero up to 50 g CO2/km.

CHAPTER II — EMISSION TARGETS AND COMPLIANCE

Article 4 — Specific emission targets

1. For each calendar year, each manufacturer of passenger cars shall ensure that its average specific emissions of CO2 do not exceed its specific emissions target determined in accordance with Annex I.

2. For each calendar year, each manufacturer of light commercial vehicles shall ensure that its average specific emissions of CO2 do not exceed its specific emissions target determined in accordance with Annex I.

3. For the purpose of determining each manufacturer's specific emissions target, account shall be taken of the following:
(a) the number of new passenger cars or new light commercial vehicles registered in the Union of which it is the manufacturer;
(b) the average test mass of each manufacturer's new fleet;
(c) the EU fleet-wide target for the relevant year.

Article 6 — Pooling arrangements

1. Two or more manufacturers may agree to form a pool for the purposes of meeting their obligations under Article 4. An agreement to form a pool may be made for one or more calendar years, provided that the overall duration of each agreement does not exceed five calendar years.

2. The Commission shall be notified of the formation of a pool. The manufacturers forming a pool shall provide the Commission with the following information:
(a) the manufacturers that are included in the pool;
(b) the manufacturer nominated as the pool manager who will be the contact point for the pool and will be responsible for paying any excess emission premiums;
(c) evidence that the pool manager will be able to fulfil those obligations.

Article 7 — Monitoring and reporting of average emissions

1. For each calendar year, the Commission shall record, for each manufacturer, the following:
(a) the number of new passenger cars and new light commercial vehicles registered in the Union;
(b) the average specific emissions of CO2 of each manufacturer's fleet;
(c) the difference between the manufacturer's average specific emissions of CO2 and its specific emission target, including any adjustments.

2. By 31 October of each year, the Commission shall publish a provisional list, by means of implementing acts, setting out for each manufacturer:
(a) the provisional specific emission target;
(b) the provisional average specific emissions of CO2 in the preceding calendar year;
(c) the difference between the average specific emissions and the specific emissions target.

CHAPTER III — EXCESS EMISSION PREMIUMS AND ECO-INNOVATION

Article 8 — Excess emission premiums

1. Where the average specific emissions of CO2 of a manufacturer's fleet exceed the manufacturer's specific emission target, the Commission shall impose an excess emission premium on the manufacturer or the pool manager.

2. The excess emission premium shall be calculated using the following formula:
Excess emissions × EUR 95 × number of newly registered vehicles.

3. The excess emission premium shall be considered as revenue for the general budget of the European Union.

Article 11 — Eco-innovation

1. Upon application by a supplier or a manufacturer, CO2 savings achieved through the use of innovative technologies or a combination of innovative technologies ('innovative technology packages') shall be considered.

2. The total contribution of those technologies to reducing the average specific emissions of a manufacturer shall be no more than 7 g CO2/km.

3. Innovative technologies shall meet the following criteria:
(a) the methodology used to assess CO2 savings shall be verifiable, repeatable and comparable;
(b) they shall not be covered by the standard test cycle CO2 measurement;
(c) they shall not fall under provisions having the same effect as mandatory regulatory standards.

CHAPTER IV — REVIEW AND ADAPTATION

Article 14 — Review and report

1. In 2026, the Commission shall review the effectiveness of this Regulation and, where appropriate, submit a legislative proposal to amend this Regulation.

2. In the review referred to in paragraph 1, the Commission shall consider, among others:
(a) the real-world representativeness of the CO2 emission and fuel or energy consumption values determined pursuant to Regulation (EU) 2017/1151;
(b) the deployment on the Union market of zero- and low-emission vehicles, in particular with regard to light commercial vehicles;
(c) the deployment of recharging and refuelling infrastructure;
(d) the potential contribution of the use of synthetic and advanced alternative fuels, including e-fuels, produced with renewable energy to emissions reductions;
(e) the impact of this Regulation on consumers, particularly those on low and medium incomes;
(f) a methodology for the assessment of CO2 emissions over the full life cycle of vehicles;
(g) the social aspects of the transition.

3. In 2027, the Commission shall assess the possibility of developing a common Union methodology for the assessment and the consistent data reporting of the full life-cycle CO2 emissions of passenger cars and light commercial vehicles placed on the Union market.

Article 14a — Post-2035 review of zero-emission target

By 2026, the Commission shall assess the progress towards zero-emission road mobility and the need to take into account the use of vehicles running exclusively on CO2 neutral fuels, outside the scope of the EU fleet-wide CO2 targets, and, if appropriate, make a proposal.

CHAPTER V — FINAL PROVISIONS

Article 15 — Penalties

1. Where the Commission finds that a manufacturer has failed to comply with the reporting obligations laid down in Article 7, it may impose an administrative fine on the manufacturer.

2. The Commission shall adopt delegated acts to supplement this Regulation by establishing the detailed rules for the administration of the penalties system.

Article 17 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 17 April 2019.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'afir-regulation',
    title: 'Regulation (EU) 2023/1804 on the deployment of alternative fuels infrastructure (AFIR)',
    short_title: 'Alternative Fuels Infrastructure Regulation',
    celex_number: '32023R1804',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2023-09-13',
    entry_into_force: '2023-10-13',
    summary: 'Sets mandatory deployment targets for electric vehicle charging and hydrogen refuelling infrastructure across the TEN-T network. Requires minimum coverage by 2025 and 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1804',
    full_text: `REGULATION (EU) 2023/1804 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 September 2023
on the deployment of alternative fuels infrastructure, and repealing Directive 2014/94/EU

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 91 thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Directive 2014/94/EU laid down a framework for the deployment of alternative fuels infrastructure. The Commission Communication on the European Green Deal underlined the need to accelerate the transition to zero-emission mobility. Regulation (EU) 2023/851 set a target of 100% CO2 emission reductions for new cars and vans from 2035, requiring a dense and reliable network of recharging and refuelling infrastructure.

(2) Infrastructure deployment has so far been uneven across the Union. The lack of infrastructure remains a key barrier to the uptake of zero-emission vehicles. Binding deployment targets are therefore necessary.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation establishes mandatory national targets for the deployment of sufficient alternative fuels infrastructure in the Union for road vehicles, vessels and stationary aircraft, and for the supply of shore-side electricity for seagoing ships and electricity for stationary aircraft.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'alternative fuels' means fuels or power sources which serve, at least partly, as a substitute for fossil oil sources in the energy supply to transport, including electricity, hydrogen, natural gas (CNG and LNG), biofuels and synthetic fuels;
(2) 'recharging point' means an interface that is capable of charging one electric vehicle at a time or swapping a battery of one electric vehicle at a time;
(3) 'publicly accessible recharging point' means a recharging point that provides non-discriminatory access to users;
(4) 'hydrogen refuelling point' means a refuelling facility which provides hydrogen to motor vehicles;
(5) 'normal power recharging point' means a recharging point that allows for a transfer of electricity to an electric vehicle with a power output of up to 22 kW;
(6) 'high power recharging point' means a recharging point that allows for a transfer of electricity to an electric vehicle with a power output of more than 22 kW.

CHAPTER II — ELECTRIC RECHARGING INFRASTRUCTURE FOR LIGHT-DUTY VEHICLES

Article 3 — Mandatory targets for electric recharging infrastructure for light-duty vehicles

1. Member States shall ensure that, in their territory, publicly accessible recharging stations for light-duty electric vehicles are deployed that provide sufficient power output relative to the number of battery electric light-duty vehicles registered in their territory.

2. To that end, Member States shall ensure that, at the end of each year, starting from the year 2024:
(a) the total power output provided through publicly accessible recharging stations for light-duty vehicles is at least 1.3 kW per battery electric light-duty vehicle registered in their territory; and
(b) the total power output provided through publicly accessible recharging stations for light-duty vehicles is at least 0.80 kW per plug-in hybrid light-duty vehicle registered in their territory.

3. Member States shall ensure that, along the TEN-T core network:
(a) publicly accessible recharging pools dedicated to light-duty vehicles are deployed at a maximum distance of 60 km between each pool and in each direction of travel by 31 December 2025;
(b) each recharging pool offers a power output of at least 400 kW by 31 December 2025, and of at least 600 kW by 31 December 2027, including at least one recharging point with an individual power output of at least 150 kW.

4. Along the TEN-T comprehensive network, Member States shall ensure by 31 December 2030 that recharging pools are deployed at a maximum distance of 60 km.

CHAPTER III — ELECTRIC RECHARGING INFRASTRUCTURE FOR HEAVY-DUTY VEHICLES

Article 4 — Mandatory targets for electric recharging infrastructure for heavy-duty vehicles

1. Member States shall ensure that along the TEN-T core network, publicly accessible recharging pools dedicated to heavy-duty vehicles are deployed at each safe and secure parking area by 31 December 2025.

2. Those recharging pools shall offer a combined power output of at least 1400 kW by 31 December 2025 and at least 3500 kW by 31 December 2030, including at least one recharging point with an individual power output of at least 350 kW.

3. Along the TEN-T comprehensive network, publicly accessible recharging pools shall be deployed by 31 December 2030 at a maximum distance of 100 km, with a combined power output of at least 1400 kW.

CHAPTER IV — HYDROGEN REFUELLING INFRASTRUCTURE

Article 6 — Mandatory targets for hydrogen refuelling infrastructure

1. Member States shall ensure that, by 31 December 2030, publicly accessible hydrogen refuelling stations serving both hydrogen fuel cell heavy-duty vehicles and hydrogen fuel cell light-duty vehicles are deployed along the TEN-T core network at a maximum distance of 200 km between stations.

2. Each hydrogen refuelling station deployed pursuant to paragraph 1 shall have a minimum daily capacity of 1 tonne and shall be equipped with at least a 700 bar dispenser.

CHAPTER V — USER INFORMATION, PAYMENT AND PRICING

Article 7 — Information and payment

1. Operators of publicly accessible recharging and refuelling points shall ensure that relevant static and dynamic data is available free of charge and is accessible through national access points.

2. Operators of recharging points shall ensure that all publicly accessible recharging points operated by them offer the possibility for end users to recharge on an ad hoc basis without the need to enter into a contract with the operator or a mobility service provider. Payment by card or contactless device shall be accepted.

3. Prices charged by operators shall be reasonable, easily and clearly comparable, transparent and non-discriminatory. Operators shall display prices per kWh, per minute, or per session.

Article 8 — National policy frameworks

1. Each Member State shall prepare and submit to the Commission a national policy framework for the development of the market as regards alternative fuels in the transport sector and the deployment of the relevant infrastructure.

2. National policy frameworks shall contain national targets and objectives for achieving the targets set out in Articles 3, 4, and 6.

CHAPTER VI — REPORTING AND ENFORCEMENT

Article 14 — Reporting

1. Each Member State shall submit to the Commission a standalone progress report on the implementation of its national policy framework every two years.

2. The Commission shall assess the reports and may issue country-specific recommendations to Member States that are not on track to meet the targets.

Article 15 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 13 April 2024.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 13 September 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'epbd-recast',
    title: 'Directive (EU) 2024/1275 on the energy performance of buildings (recast)',
    short_title: 'Energy Performance of Buildings Directive',
    celex_number: '32024L1275',
    document_type: 'directive',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2024-04-12',
    entry_into_force: '2024-05-28',
    summary: 'Requires all new buildings to be zero-emission from 2030 (public buildings from 2028). Sets minimum energy performance standards and renovation requirements for existing buildings to achieve a zero-emission building stock by 2050.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1275',
    full_text: `DIRECTIVE (EU) 2024/1275 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 12 April 2024
on the energy performance of buildings (recast)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 194(2) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Buildings account for 40% of final energy consumption and 36% of energy-related greenhouse gas emissions in the Union. The renovation wave strategy aims to at least double the annual energy renovation rate of buildings by 2030 and to foster deep energy renovations.

(2) The European Climate Law established a binding Union objective of climate neutrality by 2050. Achieving a highly energy efficient and decarbonised building stock by 2050 is a key element in achieving that objective.

(3) The current building stock in the Union is largely energy inefficient: approximately 75% of buildings have poor energy performance. The annual energy renovation rate is only about 1% and deep renovations that reduce energy consumption by at least 60% account for only 0.2% of building stock per year.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

1. This Directive promotes the improvement of the energy performance of buildings and the reduction of greenhouse gas emissions from buildings within the Union, with a view to achieving a zero-emission building stock by 2050, taking into account outdoor climatic and local conditions, as well as indoor climate requirements and cost-effectiveness.

2. This Directive lays down requirements regarding:
(a) the common general framework for a methodology for calculating the integrated energy performance of buildings and building units;
(b) the application of minimum energy performance requirements to new buildings and building units;
(c) the application of minimum energy performance standards to existing buildings and building units;
(d) national building renovation plans;
(e) energy performance certificates for buildings and building units;
(f) the installation of solar energy systems in buildings;
(g) the infrastructure for sustainable mobility in and adjacent to buildings;
(h) smart readiness of buildings.

Article 2 — Definitions

For the purposes of this Directive:
(1) 'building' means a roofed construction having walls, for which energy is used to condition the indoor climate;
(2) 'zero-emission building' means a building with a very high energy performance, where the very low amount of energy still required is fully covered by energy from renewable sources generated on-site, from a renewable energy community, or from a district heating and cooling system;
(3) 'nearly zero-energy building' means a building that has a very high energy performance. The nearly zero or very low amount of energy required should be covered to a very significant extent by energy from renewable sources;
(4) 'energy performance certificate' means a certificate recognised by a Member State or by a legal person designated by it, which indicates the energy performance of a building or building unit, calculated according to a methodology adopted pursuant to this Directive;
(5) 'building renovation passport' means a document that provides a tailored roadmap for the renovation of a specific building in a maximum number of steps that will transform it into a zero-emission building by 2050 at the latest.

CHAPTER II — ZERO-EMISSION AND NEARLY ZERO-ENERGY BUILDINGS

Article 7 — New buildings

1. Member States shall ensure that new buildings are zero-emission buildings:
(a) as from 1 January 2028 for new buildings owned by public bodies; and
(b) as from 1 January 2030 for all new buildings.

2. Member States shall ensure that new buildings are designed to optimise their solar energy generation potential on the basis of the solar irradiance of the site, enabling the later cost-effective installation of solar energy technologies.

3. Member States shall ensure that new zero-emission buildings contribute to renewable energy generation on-site sufficient to cover at a minimum the building's energy needs for lighting, domestic hot water, space heating, space cooling and ventilation.

Article 8 — Existing buildings — minimum energy performance standards

1. Member States shall establish minimum energy performance standards for existing non-residential buildings to ensure that those buildings do not exceed maximum energy performance thresholds.

2. Member States shall ensure that non-residential buildings, by the following deadlines, meet at a minimum the following energy performance levels:
(a) by 1 January 2030, at least energy performance class E; and
(b) by 1 January 2033, at least energy performance class D.

3. For residential buildings, Member States shall ensure that the average primary energy use of the residential building stock decreases by:
(a) at least 16% by 2030; and
(b) at least 20-22% by 2035.
At least 55% of the decrease shall be achieved through the renovation of the worst-performing 43% of the residential buildings.

CHAPTER III — RENOVATION PLANS AND FINANCING

Article 3 — National building renovation plans

1. Each Member State shall establish a national building renovation plan to ensure the renovation of the national stock of residential and non-residential buildings into a highly energy efficient and decarbonised building stock by 2050.

2. National building renovation plans shall include:
(a) an overview of the national building stock based on sampling data and the expected share of renovated buildings;
(b) a roadmap with nationally established targets and measurable progress indicators;
(c) an overview of implemented and planned policies and measures;
(d) an overview of investment needs and the financing mechanisms available;
(e) an outline of the policies and actions to target the worst-performing buildings and split-incentive dilemmas, and of national contributions to address energy poverty.

Article 15 — Energy performance certificates

1. Member States shall ensure that the energy performance of buildings is certified in accordance with this Directive. The energy performance certificate shall include the energy performance of a building and reference values such as minimum energy performance requirements, in order to make it possible for owners or tenants to compare and assess its energy performance.

2. The energy performance certificate shall include:
(a) the energy performance class on a scale from A (best) to G (worst);
(b) the calculated or metered annual primary energy use;
(c) the annual greenhouse gas emissions;
(d) recommendations for cost-effective or cost-optimal improvements of the energy performance;
(e) a reference to the building renovation passport, where available.

CHAPTER IV — SOLAR ENERGY AND SUSTAINABLE MOBILITY

Article 9a — Solar energy in buildings

1. Member States shall ensure that the installation of suitable solar energy installations:
(a) by 31 December 2026 on all new public and commercial buildings with useful floor area larger than 250 m2;
(b) by 31 December 2027 on all existing public and commercial buildings with useful floor area larger than 250 m2 undergoing major renovation;
(c) by 31 December 2029 on all new residential buildings.

Article 12 — Infrastructure for sustainable mobility

1. Member States shall ensure that the construction of new buildings with more than five car parking spaces includes:
(a) at least one recharging point for every parking space for non-residential buildings;
(b) the pre-cabling for every parking space for residential buildings;
(c) at least two bicycle parking spaces for every car parking space.

CHAPTER V — FINAL PROVISIONS

Article 30 — Transposition

1. Member States shall bring into force the laws, regulations and administrative provisions necessary to comply with this Directive by 29 May 2026.

Article 31 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Strasbourg, 12 April 2024.`,
    last_updated: '2024-06-01',
  },
  {
    id: 'eu-green-deal',
    title: 'Communication COM(2019) 640 - The European Green Deal',
    short_title: 'European Green Deal',
    celex_number: '52019DC0640',
    document_type: 'communication',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2019-12-11',
    entry_into_force: null,
    summary: 'The overarching policy framework setting out the EU strategy to become climate-neutral by 2050. Covers climate, energy, transport, industry, agriculture, biodiversity, and pollution. Serves as the blueprint for the Fit for 55 legislative package.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52019DC0640',
    full_text: `COMMUNICATION FROM THE COMMISSION TO THE EUROPEAN PARLIAMENT, THE EUROPEAN COUNCIL, THE COUNCIL, THE EUROPEAN ECONOMIC AND SOCIAL COMMITTEE AND THE COMMITTEE OF THE REGIONS

The European Green Deal

COM(2019) 640 final — Brussels, 11 December 2019

1. INTRODUCTION

This Communication sets out a European Green Deal for the European Union (EU) and its citizens. It resets the Commission's commitment to tackling climate and environmental-related challenges that is this generation's defining task. The atmosphere is warming and the climate is changing with each passing year. One million of the eight million species on the planet are at risk of being lost. Forests and oceans are being polluted and destroyed.

The European Green Deal is a response to these challenges. It is a new growth strategy that aims to transform the EU into a fair and prosperous society, with a modern, resource-efficient and competitive economy where there are no net emissions of greenhouse gases in 2050 and where economic growth is decoupled from resource use.

It also aims to protect, conserve and enhance the EU's natural capital, and protect the health and well-being of citizens from environment-related risks and impacts. At the same time, this transition must be just and inclusive. It must put people first, and pay attention to the regions, industries and workers who will face the greatest challenges. Since it will bring substantial change, active public participation and confidence in the transition is paramount.

The European Green Deal is an integral part of this Commission's strategy to implement the United Nation's 2030 Agenda and the sustainable development goals. The Commission will refocus the European Semester process of macroeconomic coordination to integrate the United Nations' sustainable development goals.

2. TRANSFORMING THE EU'S ECONOMY FOR A SUSTAINABLE FUTURE

2.1. Increasing the EU's climate ambition for 2030 and 2050

The Commission will present an impact-assessed plan to increase the EU's greenhouse gas emission reductions target for 2030 to at least 50% and towards 55% compared with 1990 levels, in a responsible way. To deliver on these targets and the broader climate neutrality objective, the Commission will:

- By June 2021, review and where necessary propose to revise all relevant climate-related policy instruments under the 'Fit for 55' package.
- Propose a European Climate Law to enshrine the 2050 climate neutrality objective in legislation.
- Extend the scope of the EU Emissions Trading System (ETS) to cover additional sectors and strengthen the system.
- Propose a Carbon Border Adjustment Mechanism to reduce the risk of carbon leakage.

2.2. Supplying clean, affordable and secure energy

The energy sector accounts for more than 75% of the EU's greenhouse gas emissions. Decarbonising the energy system is critical to reach the climate objectives in 2030 and 2050. The Commission will:

- Prioritise energy efficiency, with the principle of 'energy efficiency first' becoming an overarching principle of EU energy policy and beyond.
- Continue to pursue the decarbonisation of the gas sector, including through the development of renewable hydrogen and promoting clean hydrogen for industries that cannot decarbonise through electrification alone.
- Ensure consumers are empowered and enabled to actively participate in the energy transition.
- Develop and interconnect the energy systems and networks needed for the clean energy transition through smart infrastructure.

2.3. Mobilising industry for a clean and circular economy

The EU industry needs a 'green transition' and new business models. Only 12% of the materials used by EU industry come from recycling. The Commission will:

- Adopt an EU industrial strategy in March 2020 to address the twin challenge of the green and the digital transformation.
- Adopt a new circular economy action plan that will focus on sustainable resource use, especially in resource-intensive sectors such as textiles, construction, electronics and plastics.
- Propose legislation on batteries to ensure a sustainable battery value chain.
- Propose to review the Ecodesign Directive to extend its scope beyond energy-related products.

2.4. Building and renovating in an energy and resource efficient way

Building construction, use and renovation account for about 40% of energy consumed. The Commission will:

- Rigorously enforce the legislation related to the energy performance of buildings, starting with an assessment of the national long-term renovation strategies of Member States.
- Launch a 'renovation wave' initiative for the building sector as a key initiative to boost energy efficiency.
- Review the construction products regulation to ensure the regulatory framework for buildings is consistent with climate neutrality.

2.5. Accelerating the shift to sustainable and smart mobility

Transport accounts for a quarter of the EU's greenhouse gas emissions, and still growing. The Commission will:

- Adopt a strategy for sustainable and smart mobility to address all emission sources from transport.
- Support deployment of public recharging and refuelling points and extend the European emissions trading to road transport.
- Support the shift to more sustainable transport modes, including through the TEN-T regulation revision.
- Promote multimodal transport to shift a substantial part of inland freight currently going by road onto rail and inland waterways.

2.6. From 'Farm to Fork': designing a fair, healthy and environmentally-friendly food system

The food system is one of the key drivers of climate change and environmental degradation. The Commission will:

- Present a 'Farm to Fork' strategy in 2020 with measures to significantly reduce the use and risk of chemical pesticides, reduce the use of fertilisers and increase organic farming.
- Examine the tax rules and support schemes under the Common Agricultural Policy to ensure coherence with the Green Deal objectives.

2.7. Preserving and restoring ecosystems and biodiversity

The EU will lead international negotiations and strengthen the existing legislative framework, including with the EU's biodiversity strategy for 2030.

2.8. A zero pollution ambition for a toxic-free environment

The Commission will adopt a zero pollution action plan for air, water and soil, and will review EU measures to address pollution from large industrial installations.

3. THE EU AS A GLOBAL LEADER

The EU will continue to lead international climate and biodiversity negotiations. It will use diplomacy, trade policy and development support to advance the Green Deal internationally. The Commission will propose that the European Green Deal should be part of the EU's trade agreements.

4. FINANCING THE TRANSITION

The European Green Deal Investment Plan will mobilise at least EUR 1 trillion of sustainable investments over the next decade. A Just Transition Mechanism, including a Just Transition Fund, will ensure that no one is left behind.

5. LEAVING NO ONE BEHIND — A JUST TRANSITION

A Just Transition Mechanism will focus on the regions, industries and workers who will face the greatest challenges. It will include:
- A Just Transition Fund of EUR 7.5 billion (2021-2027 MFF)
- A dedicated just transition scheme under InvestEU
- A public sector loan facility with the EIB

The Commission will work closely with Member States to ensure that national energy and climate plans fully reflect the European Green Deal ambition.

Brussels, 11 December 2019.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'fit-for-55',
    title: 'Communication COM(2021) 550 - Fit for 55: delivering the EU\'s 2030 climate target',
    short_title: 'Fit for 55 Package',
    celex_number: '52021DC0550',
    document_type: 'strategy',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2021-07-14',
    entry_into_force: null,
    summary: 'Legislative package of interconnected proposals to revise and update EU legislation and put in place new initiatives to ensure EU policies are in line with the 55% emission reduction target by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0550',
    full_text: `COMMUNICATION FROM THE COMMISSION TO THE EUROPEAN PARLIAMENT, THE COUNCIL, THE EUROPEAN ECONOMIC AND SOCIAL COMMITTEE AND THE COMMITTEE OF THE REGIONS

'Fit for 55': delivering the EU's 2030 climate target on the way to climate neutrality

COM(2021) 550 final — Brussels, 14 July 2021

1. INTRODUCTION

In December 2019, the Commission presented the European Green Deal, setting out a new growth strategy for Europe. At the heart of the Green Deal is the objective of making Europe the first climate-neutral continent by 2050. The European Climate Law, adopted in June 2021, has enshrined both this objective and the intermediate target of reducing net greenhouse gas emissions by at least 55% by 2030 compared to 1990 levels into binding legislation.

The 'Fit for 55' package is the most comprehensive and interconnected set of proposals the Commission has ever presented. It translates the climate ambition of the European Green Deal and the European Climate Law into concrete legislative changes. The package contains proposals to revise several pieces of EU climate and energy legislation and to introduce new legislative initiatives.

2. AN INTERCONNECTED AND BALANCED PACKAGE

The package recognises the interplay between sectors and policy instruments. The proposals cover the following areas:

2.1. Strengthening the EU Emissions Trading System

The Commission proposes to:
- Lower the overall emission cap and increase the annual reduction rate (linear reduction factor) from 2.2% to 4.3% from 2024, and 4.4% from 2028
- Phase out free emission allowances for aviation by 2026 and apply the full Carbon Offsetting and Reduction Scheme for International Aviation (CORSIA)
- Include maritime transport emissions in the EU ETS from 2024
- Establish a new, separate emissions trading system (ETS2) for buildings and road transport from 2024 (MRV), with compliance obligations on fuel distributors from 2027

2.2. Carbon Border Adjustment Mechanism (CBAM)

The CBAM will put a carbon price on imports of a targeted selection of products to ensure that ambitious climate action in Europe does not lead to 'carbon leakage':
- Products covered: cement, iron and steel, aluminium, fertilisers, electricity, and hydrogen
- Transitional period from 2023-2025 (reporting only)
- Gradual phase-in from 2026 as free ETS allowances are phased out
- Full implementation by 2034

2.3. Effort Sharing Regulation

- Increase the EU-wide reduction target for ESR sectors from -30% to -40% compared to 2005 levels by 2030
- Update national targets based on GDP per capita and cost-effectiveness
- Tighten flexibility mechanisms

2.4. LULUCF Regulation

- Set an EU-wide net removal target of 310 million tonnes CO2 equivalent by 2030
- Establish national targets for each Member State
- From 2031, expand scope to cover all land emissions under a broader 'AFOLU' (agriculture, forestry and other land use) pillar

2.5. Renewable Energy Directive (RED)

- Increase the renewable energy target from 32% to at least 40% (subsequently raised to 42.5% with an aspiration of 45%)
- Introduce binding sectoral sub-targets for transport (29%), buildings (49% renewables in heating/cooling), and industry (1.6% annual increase in renewable use)
- Strengthen sustainability criteria for bioenergy

2.6. Energy Efficiency Directive (EED)

- Set a binding EU energy efficiency target of reducing final energy consumption by 11.7% by 2030 compared to 2020 projections
- Annual energy savings obligation set at 1.3% of final energy consumption from 2024 (rising to 1.5% from 2026 and 1.9% from 2028)
- Public sector required to reduce energy consumption by 1.9% annually and renovate 3% of public buildings

2.7. CO2 emission standards for cars and vans

- Increase the 2030 CO2 reduction target for new cars from -37.5% to -55% (compared to 2021)
- Increase the 2030 CO2 reduction target for new vans from -31% to -50%
- Set a new 100% CO2 reduction target for both cars and vans from 2035, effectively ending the sale of new internal combustion engine vehicles

2.8. Alternative Fuels Infrastructure Regulation (AFIR)

- Require Member States to deploy publicly accessible EV charging infrastructure in line with zero-emission vehicle uptake
- Mandatory targets: recharging pools every 60 km along TEN-T core network by 2025
- Hydrogen refuelling stations every 200 km along TEN-T core network by 2030
- Minimum power output and payment requirements

2.9. ReFuelEU Aviation

- Mandate increasing shares of sustainable aviation fuels (SAF) in jet fuel supplied at EU airports:
  - 2% by 2025
  - 6% by 2030
  - 20% by 2035
  - 34% by 2040
  - 42% by 2045
  - 70% by 2050
- Of which a sub-quota for synthetic fuels (e-kerosene) rising from 0.7% in 2030 to 35% in 2050

2.10. FuelEU Maritime

- Set progressively stricter limits on the greenhouse gas intensity of the energy used by ships calling at EU ports:
  - 2% reduction by 2025
  - 6% by 2030
  - 14.5% by 2035
  - 31% by 2040
  - 62% by 2045
  - 80% by 2050
- Require container ships and passenger ships to use on-shore power supply in major EU ports from 2030

2.11. Energy Taxation Directive

- Align taxation of energy products with EU energy and climate policies
- Remove outdated exemptions and reduced rates that encourage fossil fuel use
- Set minimum tax rates based on energy content and environmental performance rather than volume

2.12. Social Climate Fund

- Establish a EUR 65 billion fund (2026-2032) to address the social impacts of emissions trading for buildings and road transport (ETS2), with mandatory 25% national co-financing
- Finance temporary direct income support, investments in building renovation, zero-emission mobility, and access to affordable transport
- Funded by 25% of the expected revenues from the new ETS2

3. ENSURING A SOCIALLY FAIR TRANSITION

The transition must be fair and inclusive. Several mechanisms are included:
- The Social Climate Fund to support vulnerable households, micro-enterprises and transport users
- The Modernisation Fund under the ETS to help lower-income Member States
- Revenues from ETS auctioning to fund climate and social measures
- Enhanced financing through the Just Transition Fund under the MFF and the Recovery and Resilience Facility

4. CONCLUSION

The Fit for 55 package represents a coherent and balanced framework for reaching the EU's ambitious climate targets while ensuring fairness, preserving competitiveness and strengthening European innovation leadership. All elements of the package are interconnected and complementary, requiring a comprehensive approach to implementation.

Brussels, 14 July 2021.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'social-climate-fund',
    title: 'Regulation (EU) 2023/955 establishing a Social Climate Fund',
    short_title: 'Social Climate Fund',
    celex_number: '32023R0955',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2023-05-10',
    entry_into_force: '2023-06-05',
    summary: 'Creates a dedicated fund of EUR 65 billion (2026-2032) to address the social impact of emissions trading on vulnerable households, micro-enterprises, and transport users. Funded by revenues from the new ETS for buildings and road transport. Application from 30 June 2024.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0955',
    full_text: `REGULATION (EU) 2023/955 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 10 May 2023
establishing a Social Climate Fund and amending Regulation (EU) 2021/1060

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 91(1)(d), Article 192(1), Article 194(1)(c) and Article 322(1)(a) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The social and distributional impacts of the green transition need to be addressed to ensure that the transition is fair and just. The extension of emissions trading to the buildings and road transport sectors will have economic and social effects that could disproportionately affect vulnerable households, vulnerable micro-enterprises and vulnerable transport users.

(2) The Social Climate Fund should be established to address these social impacts and provide temporary direct income support and support measures and investments to reduce reliance on fossil fuels.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation establishes the Social Climate Fund ('the Fund') for the period from 2026 to 2032. The Fund shall provide financial support to Member States to finance measures and investments included in their social climate plans to address the impact of emissions trading on vulnerable households, vulnerable micro-enterprises and vulnerable transport users.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'energy poverty' means a household's lack of access to essential energy services that underpin a decent standard of living and health, including adequate warmth, cooling, lighting, and energy to power appliances;
(2) 'vulnerable households' means households in energy poverty or households, including lower middle-income ones, that are significantly affected by the price impacts of the inclusion of greenhouse gas emissions from buildings in the scope of the EU ETS;
(3) 'vulnerable micro-enterprises' means micro-enterprises that are significantly affected by the price impacts of the inclusion of greenhouse gas emissions from buildings or road transport in the scope of the EU ETS;
(4) 'vulnerable transport users' means transport users, including from lower middle-income households, that are significantly affected by the price impacts of the inclusion of greenhouse gas emissions from road transport in the scope of the EU ETS and that lack access to alternative, affordable transport solutions;
(5) 'social climate plan' means the document submitted by a Member State setting out the measures and investments to be financed by the Fund.

Article 3 — Objectives

1. The general objective of the Fund is to contribute to a socially fair transition towards climate neutrality by addressing the social impacts of the inclusion of greenhouse gas emissions from buildings and road transport in the scope of the EU ETS.

2. The specific objectives of the Fund shall be to support vulnerable households, vulnerable micro-enterprises and vulnerable transport users through:
(a) temporary direct income support measures;
(b) measures and investments intended to reduce dependence on fossil fuels through increased energy efficiency of buildings, decarbonisation of heating and cooling of buildings, and improved access to zero- and low-emission mobility and transport.

CHAPTER II — SOCIAL CLIMATE PLANS

Article 4 — Social climate plans

1. Each Member State shall submit to the Commission a social climate plan together with the update of its integrated national energy and climate plan.

2. The social climate plan shall contain the following elements:
(a) an assessment of the expected effects of emissions trading for buildings and road transport on vulnerable households, vulnerable micro-enterprises and vulnerable transport users;
(b) a description of the measures and investments to address those effects;
(c) an estimated total cost of the plan;
(d) the milestones, targets and an indicative timetable for the implementation of the measures and investments;
(e) an assessment of the consistency with the national energy and climate plan, the national long-term renovation strategy and the just transition plans.

Article 6 — Measures and investments to be included in social climate plans

1. Social climate plans may include the following measures and investments:
(a) measures to reduce taxation on heating fuels;
(b) targeted reductions or exemptions from carbon pricing;
(c) temporary direct income support;
(d) support for building renovation, particularly deep renovation;
(e) support for the integration of renewable energy in buildings;
(f) support for the purchase of zero- and low-emission vehicles;
(g) support for the development of public transport and cycling infrastructure;
(h) support for car-sharing and car-pooling;
(i) support for mobility as a service and combined mobility services.

2. Temporary direct income support measures shall not exceed 37.5% of the estimated total cost of each Member State's social climate plan.

CHAPTER III — FINANCIAL PROVISIONS

Article 9 — Maximum financial allocation

1. The maximum financial allocation of the Fund shall be EUR 65 billion for the period 2026-2032.

2. The maximum financial allocation for each Member State shall be determined in accordance with the methodology set out in Annex I, taking into account:
(a) the population at risk of poverty in rural areas;
(b) the percentage of households at risk of poverty;
(c) the number of households in energy poverty;
(d) GNI per capita;
(e) the share of reference CO2 emissions from fuel combustion by households.

Article 10 — National contribution

Member States shall contribute at least 25% of the estimated total costs of their social climate plans from national resources.

CHAPTER IV — MONITORING AND EVALUATION

Article 22 — Reporting by Member States

Each Member State shall report to the Commission biennially on the implementation of its social climate plan, including:
(a) the progress achieved in the implementation of each measure and investment;
(b) the number of vulnerable households, vulnerable micro-enterprises and vulnerable transport users that have benefited;
(c) the estimated impact on greenhouse gas emission reductions and energy poverty.

Article 24 — Evaluation

By 1 July 2032, the Commission shall provide the European Parliament and the Council with an independent evaluation report on the implementation and functioning of the Fund.

Article 25 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 30 June 2024.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 10 May 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'methane-regulation',
    title: 'Regulation (EU) 2024/1787 on the reduction of methane emissions in the energy sector',
    short_title: 'Methane Emissions Regulation',
    celex_number: '32024R1787',
    document_type: 'regulation',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2024-05-27',
    entry_into_force: '2024-08-04',
    summary: 'First EU legislation targeting methane emissions. Requires oil, gas, and coal operators to detect, measure, report, and reduce methane emissions. Introduces import standards for fossil energy to address global methane leakage.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787',
    full_text: `REGULATION (EU) 2024/1787 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 27 May 2024
on the reduction of methane emissions in the energy sector and amending Regulation (EU) 2019/942

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) and Article 194(2) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Methane is the second-largest contributor to climate change after carbon dioxide. It is a potent greenhouse gas with a global warming potential approximately 80 times that of CO2 over a 20-year period. The energy sector (oil, gas and coal) is responsible for approximately 37% of global anthropogenic methane emissions.

(2) The Global Methane Pledge, launched at COP26 in November 2021 and endorsed by over 150 countries, aims to reduce global methane emissions by at least 30% from 2020 levels by 2030. Targeted action on methane from the energy sector offers the most cost-effective abatement potential.

(3) The EU currently lacks a comprehensive regulatory framework for addressing methane emissions in the energy sector. This Regulation addresses that gap by introducing obligations for measurement, reporting, verification and reduction of methane emissions.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

1. This Regulation establishes rules for the accurate measurement, reporting and verification of methane emissions in the energy sector, and lays down obligations to mitigate those emissions, including obligations for leak detection and repair and for limiting venting and flaring.

2. This Regulation applies to:
(a) upstream, midstream and downstream oil and gas operations in the territory of the Member States;
(b) operational, temporarily closed and permanently closed underground and surface coal mines in the territory of the Member States;
(c) as regards methane emissions from imported fossil energy, to importers of crude oil, natural gas and coal.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'methane emissions' means the release of methane (CH4) into the atmosphere from sources related to the energy sector;
(2) 'venting' means the intentional release of methane into the atmosphere from oil, gas or coal operations;
(3) 'flaring' means the controlled combustion of gas without energy recovery, including gas that is directed to a combustion device (flare);
(4) 'leak detection and repair' or 'LDAR' means the systematic process of detecting, locating, and repairing or replacing leaking components;
(5) 'super-emitter event' means a single methane emission source or event resulting in a methane emission rate equal to or greater than 500 kg per hour.

CHAPTER II — MEASUREMENT, REPORTING AND VERIFICATION

Article 4 — Source-level measurement

1. Operators shall measure methane emissions at source level from their operations.

2. Measurements shall be performed at least quarterly, or more frequently where required by the competent authority, using direct measurement methods including, but not limited to:
(a) continuous emission monitoring systems;
(b) periodic measurements using portable instruments;
(c) aerial surveys or satellite-based monitoring;
(d) other measurement methods accepted by the competent authority.

Article 5 — Reporting

1. Operators shall submit an annual methane emissions report to the competent authority by 30 March of each year for the preceding calendar year.

2. The report shall include:
(a) the total methane emissions from the operator's activities in tonnes of methane;
(b) methane emissions disaggregated by source category (venting, flaring, fugitive emissions, other);
(c) the measurement methodology and frequency used;
(d) any remedial actions taken during the reporting period;
(e) information on detected and repaired leaks.

Article 6 — Verification

1. Methane emissions reports shall be verified by an independent accredited verifier.

2. The verifier shall verify that the emissions data is accurate, complete and consistent with the measurements conducted.

CHAPTER III — MITIGATION MEASURES FOR OIL AND GAS

Article 12 — Leak detection and repair

1. Operators of oil and gas installations shall conduct surveys of all components in their installations to detect methane leaks:
(a) at onshore installations: at least every three months;
(b) at offshore installations: at least every six months.

2. Each detected leak shall be repaired or replaced as soon as possible and no later than:
(a) five days for safety-critical leaks;
(b) thirty days for all other leaks.

3. A re-survey shall be conducted within 15 days of the repair to confirm it was effective.

Article 14 — Venting and flaring ban

1. Venting and flaring from oil and gas production sites shall be prohibited, except in the following circumstances:
(a) for safety reasons (emergency venting);
(b) in the case of equipment malfunction, provided the malfunction is reported and repaired within 48 hours;
(c) where technically unavoidable and specifically authorised by the competent authority.

2. Where flaring is permitted under paragraph 1(c), the flare shall operate with a destruction efficiency of at least 98%.

3. Routine venting and flaring from production sites shall be prohibited from 5 February 2025 for new sites and 5 February 2026 for existing sites (Art. 15-16, Reg. 2024/1787).

Article 15 — Inactive, temporarily closed and permanently closed wells

1. Operators shall ensure that methane emissions from inactive wells are monitored at least annually.

2. Within one year of the closure of a well, the operator shall ensure that methane emissions from the closed well do not exceed 0.5 tonnes of methane per year, or take remedial action to reduce emissions below that threshold.

3. Member States shall establish inventories of all orphaned and abandoned wells and develop plans for addressing methane emissions from such wells.

CHAPTER IV — MITIGATION MEASURES FOR COAL

Article 20 — Methane emissions from coal mines

1. Operators of underground coal mines shall install methane drainage systems where technically feasible and where methane concentrations exceed 1%.

2. Methane captured through drainage shall be utilised for energy purposes where technically and economically feasible.

3. Venting of drained methane shall be prohibited from 1 January 2025 where utilisation or flaring is technically feasible (Art. 22, Reg. 2024/1787).

Article 21 — Closed and abandoned coal mines

1. Member States shall identify all closed and abandoned coal mines with significant methane emissions.

2. Where methane emissions from a closed or abandoned mine exceed 0.5 tonnes per hour, the competent authority shall require the implementation of mitigation measures.

CHAPTER V — METHANE EMISSIONS FROM IMPORTED FOSSIL ENERGY

Article 27 — Methane performance of imported fossil energy

1. By 1 January 2027, importers of crude oil, natural gas and coal shall report to the competent authority the methane emissions associated with the production and transport of the imported fossil energy.

2. By 1 January 2030, the Commission shall set maximum methane intensity values for imported fossil energy. Imports exceeding those values shall not be permitted unless the importer demonstrates compliance through verified emission reduction measures at the production site.

3. The Commission shall establish a global methane transparency platform to facilitate data sharing and verification of methane emissions across supply chains.

Article 28 — Methane performance database

1. The Commission shall establish a methane performance database containing information on the methane emission intensity of fossil energy produced and imported into the Union.

2. The database shall be publicly accessible and updated regularly.

CHAPTER VI — FINAL PROVISIONS

Article 30 — Review

By 1 January 2028, the Commission shall review this Regulation and assess the need to:
(a) extend its scope to the agricultural sector;
(b) lower the thresholds for measurement and mitigation requirements;
(c) strengthen the import performance standards.

Article 32 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 4 August 2024.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 27 May 2024.`,
    last_updated: '2024-08-15',
  },
  {
    id: 'nature-restoration-law',
    title: 'Regulation (EU) 2024/1991 on nature restoration',
    short_title: 'Nature Restoration Law',
    celex_number: '32024R1991',
    document_type: 'regulation',
    domain: 'climate',
    status: 'in_force',
    adoption_date: '2024-06-17',
    entry_into_force: '2024-08-18',
    summary: 'Requires Member States to put restoration measures in place covering at least 20% of EU land and sea areas by 2030 and all ecosystems in need of restoration by 2050. Addresses ecosystem restoration as both a biodiversity and climate mitigation measure.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1991',
    full_text: `REGULATION (EU) 2024/1991 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 17 June 2024
on nature restoration

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The EU Biodiversity Strategy for 2030 commits to putting Europe's biodiversity on a path to recovery by 2030. Legally binding targets are necessary to drive restoration action across Member States. Over 80% of European habitats are in poor condition and ecosystems continue to degrade.

(2) Healthy ecosystems provide essential services including carbon sequestration, flood protection, water purification, pollination, and food security. The degradation of ecosystems costs the EU economy approximately EUR 50 billion per year.

(3) The European Climate Law requires climate neutrality by 2050. Nature-based solutions, including ecosystem restoration, can contribute approximately 25% of the climate mitigation effort needed, while also supporting adaptation and resilience.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation establishes rules to contribute to:
(a) the continuous, long-term and sustained recovery of biodiverse and resilient nature across the Union's land and sea areas through the restoration of ecosystems;
(b) achieving the Union's overarching objectives on climate change mitigation and climate change adaptation;
(c) meeting the Union's international commitments.

Article 2 — Scope

This Regulation applies to the restoration of terrestrial, coastal, freshwater, and marine ecosystems across the territory of the Member States, including the outermost regions.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'restoration' means the process of actively or passively assisting the recovery of an ecosystem towards or to good condition, including by re-establishing or improving the structure, functions, composition and connectivity of an ecosystem;
(2) 'good condition' of an ecosystem means a state in which the key characteristics of the ecosystem, namely its physical, chemical, compositional, structural and functional state, and its landscape and seascape characteristics, reflect the high level of ecological integrity, stability and resilience;
(3) 'favourable conservation status' means the conservation status as defined in Article 1(e) of Directive 92/43/EEC (Habitats Directive);
(4) 'national restoration plan' means the plan developed by each Member State setting out how it will achieve the restoration targets set out in this Regulation;
(5) 'nature-based solutions' means actions to protect, conserve, restore, sustainably use and manage natural or modified terrestrial, freshwater, coastal and marine ecosystems.

CHAPTER II — RESTORATION TARGETS AND OBLIGATIONS

Article 4 — Restoration of terrestrial, coastal and freshwater ecosystems

1. Member States shall put in place restoration measures that together cover, by 2030, at least 30% of the area of each group of habitat types listed in Annexes I and II that is not in good condition.

2. By 2040, restoration measures shall cover at least 60% of the area of each group of habitat types that is not in good condition.

3. By 2050, restoration measures shall cover areas sufficient to achieve good condition across all habitat types.

4. Member States shall ensure that the area covered by restoration measures shows a continuous improvement towards good condition, until at least 90% of the restored area has reached good condition.

Article 5 — Restoration of marine ecosystems

1. Member States shall put in place restoration measures necessary to restore marine habitats listed in Annex II to good condition in areas where they are not in good condition.

2. The targets and timelines set out in Article 4(1), (2), and (3) shall apply to marine habitat types.

3. Member States shall ensure that restoration does not lead to a deterioration of the condition of marine areas that are already in good condition.

Article 6 — Restoration of urban ecosystems

1. Member States shall ensure that there is no net loss of urban green space and urban tree canopy cover by 31 December 2030.

2. Member States shall achieve an increasing trend in the total national area of urban green space from 2030 until a satisfactory level is reached.

3. Member States shall achieve an increasing trend in tree canopy cover in urban areas from 2030 until a satisfactory level is reached.

Article 7 — Connectivity

Member States shall endeavour to increase the connectivity of the habitat types listed in Annexes I and II and of habitats of the species listed in Annexes III and IV, and shall take into account the needs of species for connectivity when implementing restoration measures.

Article 8 — Restoration of freshwater ecosystems

1. Member States shall restore the natural connectivity of rivers and natural functions of the related floodplains. Member States shall identify and remove the barriers to longitudinal and lateral connectivity of surface waters so that at least 25,000 km of rivers are restored into free-flowing rivers in the Union by 2030.

2. Member States shall, by 2030, ensure that there is no reduction in the total length of free-flowing rivers achieved through restoration measures.

Article 9 — Restoration of pollinator populations

1. Member States shall put in place the restoration measures necessary to reverse the decline of pollinator populations by 2030 at the latest and to achieve thereafter an increasing trend of pollinator populations, measured every three years.

2. Member States shall establish a monitoring system for pollinator populations using a standardised methodology by 30 June 2025.

Article 10 — Restoration of forest ecosystems

1. Member States shall put in place restoration measures to enhance biodiversity of forest ecosystems, in addition to the targets set out in Article 4.

2. Member States shall achieve an increasing trend at national level of each of the following forest ecosystem indicators:
(a) standing deadwood;
(b) lying deadwood;
(c) share of forests with uneven-aged structure;
(d) forest connectivity;
(e) common forest bird index;
(f) stock of organic carbon.

Article 11 — Restoration of agricultural ecosystems

1. Member States shall put in place restoration measures to achieve an increasing trend at national level of each of the following indicators:
(a) grassland butterfly index;
(b) share of agricultural land with high-diversity landscape features;
(c) stock of organic carbon in cropland mineral soils.

2. Member States shall ensure that the farmland bird index, at national level, reaches satisfactory levels by 2030.

CHAPTER III — NATIONAL RESTORATION PLANS

Article 12 — Preparation of national restoration plans

1. Each Member State shall prepare and submit to the Commission a national restoration plan covering the period to 2050, with intermediate milestones for 2030 and 2040.

2. National restoration plans shall include:
(a) quantified restoration targets and obligations for each habitat type and ecosystem;
(b) a mapping of the areas where restoration measures are needed;
(c) a description of the restoration measures planned or put in place;
(d) an indicative timeline for putting in place the restoration measures;
(e) an estimate of the financing needs and sources of funding;
(f) a description of stakeholder consultations carried out;
(g) monitoring, assessment and reporting arrangements.

Article 14 — Monitoring and reporting

1. Member States shall monitor the status of restored areas and the achievement of restoration targets using the indicators set out in this Regulation.

2. Member States shall submit a progress report to the Commission every three years, starting from 2028.

CHAPTER IV — FINAL PROVISIONS

Article 18 — Review

By 31 December 2033, the Commission shall evaluate the application of this Regulation and submit a report to the European Parliament and the Council, accompanied, where appropriate, by legislative proposals.

Article 19 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Luxembourg, 17 June 2024.`,
    last_updated: '2024-09-01',
  },
  {
    id: 'csrd',
    title: 'Directive (EU) 2022/2464 regarding corporate sustainability reporting (CSRD)',
    short_title: 'Corporate Sustainability Reporting Directive',
    celex_number: '32022L2464',
    document_type: 'directive',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2022-12-14',
    entry_into_force: '2023-01-05',
    summary: 'Expands mandatory sustainability reporting to nearly 50,000 companies in the EU. Requires disclosure on climate risks, emissions, and transition plans using European Sustainability Reporting Standards (ESRS).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464',
    full_text: `DIRECTIVE (EU) 2022/2464 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 14 December 2022
amending Regulation (EU) No 537/2014, Directive 2004/109/EC, Directive 2006/43/EC and Directive 2013/34/EU, as regards corporate sustainability reporting

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 50(1) thereof,

Having regard to the proposal from the European Commission,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Stakeholders and civil society have increasingly called for companies to be required to disclose comprehensive, comparable and reliable sustainability information. The European Green Deal and the Capital Markets Union Action Plan identified a need for improved corporate sustainability reporting.

(2) The Non-Financial Reporting Directive (NFRD, Directive 2014/95/EU) was a first step but has shown shortcomings: information reported is often not sufficiently comparable, reliable, or easy to find. Many companies that users of information consider should be reporting are not currently required to do so.

(3) This Directive therefore significantly extends the scope, introduces more detailed and standardised reporting requirements, requires third-party assurance, and mandates digital tagging of reported information.

CHAPTER I — SCOPE AND GENERAL PROVISIONS

Article 1 — Scope of application

1. This Directive applies to the following categories of undertakings:

(a) Large undertakings that are public-interest entities exceeding on their balance sheet dates the criteria of:
- balance sheet total: EUR 25 million;
- net turnover: EUR 50 million;
- average number of employees during the financial year: 250.
Application: from financial year 2024 (reports published in 2025).

(b) Other large undertakings exceeding at least two of the three criteria above.
Application: from financial year 2025 (reports published in 2026).

(c) Listed SMEs (excluding micro-undertakings).
Application: from financial year 2026 (reports published in 2027), with opt-out possible until 2028.

(d) Third-country undertakings with net turnover of more than EUR 150 million in the Union if they have at least one subsidiary or branch in the Union exceeding certain thresholds.
Application: from financial year 2028.

2. Approximately 50,000 companies will be covered, up from roughly 11,700 under the NFRD.

CHAPTER II — REPORTING REQUIREMENTS

Article 19a — Sustainability reporting

1. Large undertakings and parent undertakings of large groups shall include in the management report, in a clearly identifiable dedicated section, the information necessary to understand the undertaking's impacts on sustainability matters, and the information necessary to understand how sustainability matters affect the undertaking's development, performance and position (double materiality).

2. The information referred to in paragraph 1 shall include:
(a) a brief description of the undertaking's business model and strategy, including:
(i) the resilience of the undertaking's business model and strategy in relation to risks related to sustainability matters;
(ii) the opportunities for the undertaking related to sustainability matters;
(iii) the plans of the undertaking to ensure that its business model and strategy are compatible with the transition to a sustainable economy and with the limiting of global warming to 1.5°C in line with the Paris Agreement;
(iv) how the undertaking's business model and strategy take account of the interests of the undertaking's stakeholders and the impacts of the undertaking on sustainability matters;
(v) how the undertaking's strategy has been implemented with regard to sustainability matters.

(b) a description of the time-bound targets related to sustainability matters set by the undertaking, including, where appropriate, absolute greenhouse gas emission reduction targets at least for 2030 and 2050, a description of the progress the undertaking has made towards achieving those targets, and a statement of whether the undertaking's targets related to environmental factors are based on conclusive scientific evidence;

(c) a description of the role of the administrative, management and supervisory bodies with regard to sustainability matters;

(d) a description of the undertaking's policies in relation to sustainability matters;

(e) information about the existence of incentive schemes linked to sustainability matters which are offered to members of the administrative, management and supervisory bodies;

(f) a description of:
(i) the due diligence process implemented by the undertaking with regard to sustainability matters;
(ii) the principal actual or potential adverse impacts connected with the undertaking's own operations and with its value chain;
(iii) any actions taken by the undertaking to identify, monitor, prevent, mitigate or remediate actual or potential adverse impacts, and the result of such actions;

(g) a description of the principal risks to the undertaking related to sustainability matters, including the undertaking's main dependencies on such matters, and how the undertaking manages those risks;

(h) indicators relevant to the disclosures referred to in points (a) to (g).

3. The information shall cover the undertaking's own operations and its value chain, including its products and services, its business relationships and its supply chain.

Article 19b — Sustainability reporting standards

1. The Commission shall adopt delegated acts to establish sustainability reporting standards — the European Sustainability Reporting Standards (ESRS). These standards shall specify:
(a) cross-cutting standards;
(b) topical standards on environmental matters, including:
(i) climate change, including Scope 1, 2, and 3 greenhouse gas emissions;
(ii) pollution;
(iii) water and marine resources;
(iv) biodiversity and ecosystems;
(v) resource use and circular economy;
(c) topical standards on social matters, including:
(i) own workforce;
(ii) workers in the value chain;
(iii) affected communities;
(iv) consumers and end-users;
(d) topical standards on governance matters.

2. The standards shall:
(a) be consistent with the European Green Deal objectives;
(b) avoid disproportionate administrative burden on undertakings;
(c) take into account the work of global standard-setting initiatives, including the ISSB and GRI standards;
(d) cover the information needs of investors and other stakeholders.

CHAPTER III — ASSURANCE AND DIGITAL TAGGING

Article 19c — Assurance of sustainability reporting

1. Member States shall ensure that the statutory auditor or audit firm carries out an assurance engagement of sustainability reporting.

2. Initially, the assurance engagement shall be a limited assurance engagement. The Commission shall adopt standards for limited assurance by 1 October 2026.

3. The Commission shall assess, by 1 October 2028, whether reasonable assurance is feasible and, if so, shall adopt reasonable assurance standards.

Article 19d — Digital tagging

Undertakings subject to this Directive shall prepare their management report in XHTML format and shall mark up their sustainability reporting in accordance with a digital taxonomy, to be established by EFRAG.

CHAPTER IV — FINAL PROVISIONS

Article 5 — Transposition

1. Member States shall bring into force the laws, regulations and administrative provisions necessary to comply with this Directive by 6 July 2024.

Article 6 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Strasbourg, 14 December 2022.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'fueleu-maritime',
    title: 'Regulation (EU) 2023/1805 on the use of renewable and low-carbon fuels in maritime transport (FuelEU Maritime)',
    short_title: 'FuelEU Maritime',
    celex_number: '32023R1805',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2023-09-13',
    entry_into_force: '2023-10-13',
    summary: 'Sets a maximum limit on the greenhouse gas intensity of energy used on board ships calling at EU ports. Progressively reduces the carbon intensity from -2% in 2025 to -80% by 2050.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805',
    full_text: `REGULATION (EU) 2023/1805 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 September 2023
on the use of renewable and low-carbon fuels in maritime transport, and amending Directive 2009/16/EC

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 100(2) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Maritime transport accounts for around 75% of EU external trade and 31% of EU internal trade by volume. Around 400 million passengers embark or disembark in ports of Member States each year. Maritime transport is responsible for about 3-4% of total EU CO2 emissions.

(2) To contribute to the Union's economy-wide climate goals and the objectives of the Paris Agreement, the greenhouse gas intensity of the energy used in maritime transport should be progressively reduced over time.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and objective

This Regulation establishes a framework to reduce the greenhouse gas intensity of the energy used on board ships in order to increase consistent use of renewable and low-carbon fuels and substitute sources of energy across the Union, while ensuring the proper functioning of maritime traffic and avoiding distortions in the internal market.

Article 2 — Scope

1. This Regulation applies to all ships above a gross tonnage of 5000, regardless of their flag:
(a) in respect of the entirety of the energy used during voyages between ports of call under the jurisdiction of a Member State;
(b) in respect of 50% of the energy used during voyages where either the port of departure or port of arrival is under the jurisdiction of a Member State and the other port is outside the jurisdiction of a Member State;
(c) in respect of the entirety of the energy used while at berth in a port under the jurisdiction of a Member State.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'greenhouse gas intensity of the energy used on board' means the amount of greenhouse gas emissions per unit of energy, including CO2, methane (CH4) and nitrous oxide (N2O) emissions on a lifecycle (well-to-wake) basis;
(2) 'renewable fuels of non-biological origin' or 'RFNBO' means liquid and gaseous fuels the energy content of which is derived from renewable sources other than biomass;
(3) 'port of call' means a port where a ship stops to load or unload cargo or to embark or disembark passengers.

CHAPTER II — GREENHOUSE GAS INTENSITY LIMITS

Article 4 — Greenhouse gas intensity limit for energy used on board

1. The annual average greenhouse gas intensity of the energy used on board by a ship shall not exceed the limit set out below, expressed as a percentage reduction compared to the reference value of 91.16 gCO2eq/MJ:
(a) from 1 January 2025: 2% reduction;
(b) from 1 January 2030: 6% reduction;
(c) from 1 January 2035: 14.5% reduction;
(d) from 1 January 2040: 31% reduction;
(e) from 1 January 2045: 62% reduction;
(f) from 1 January 2050: 80% reduction.

Article 5 — Sub-target for renewable fuels of non-biological origin

1. From 1 January 2034, at least 2% of the energy used on board by a ship in a reporting period shall be from RFNBO.

2. A multiplier of 2 shall apply to the share of RFNBO used on board by a ship, for the purpose of compliance with Article 4.

CHAPTER III — ON-SHORE POWER SUPPLY

Article 6 — Use of on-shore power supply

1. From 1 January 2030, a container ship or a passenger ship at berth in a port under the jurisdiction of a Member State that is part of the TEN-T core network shall connect to on-shore power supply and use it for all energy needs while at berth.

2. Exemptions may be granted where:
(a) the ship is at berth for less than two hours;
(b) the ship uses zero-emission technology while at berth;
(c) there is an unplanned port call for reasons of safety or saving life at sea;
(d) on-shore power supply is unavailable due to force majeure or an emergency.

CHAPTER IV — COMPLIANCE AND ENFORCEMENT

Article 8 — Monitoring plan

1. Each company shall submit a monitoring plan to the verifier for each of its ships. The monitoring plan shall describe the methodology that will be used to monitor and report the greenhouse gas intensity of the energy used on board.

Article 14 — Penalties

1. Where a ship has excess greenhouse gas intensity compared to the limit in Article 4, the company shall pay a penalty calculated as follows:
Penalty = (excess GHG intensity) × (total energy used) × EUR 2400 per tonne of VLSFO equivalent.

2. Where a ship fails to comply with the on-shore power supply requirements, the company shall pay a penalty of EUR 1.50 per kWh of estimated energy not supplied from on-shore power.

Article 15 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 1 January 2025.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 13 September 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'refueleu-aviation',
    title: 'Regulation (EU) 2023/2405 on ensuring a level playing field for sustainable air transport (ReFuelEU Aviation)',
    short_title: 'ReFuelEU Aviation',
    celex_number: '32023R2405',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2023-10-09',
    entry_into_force: '2023-11-20',
    summary: 'Mandates minimum shares of sustainable aviation fuels (SAF) at EU airports: 2% from 2025, 6% from 2030, rising to 70% by 2050. Includes a sub-mandate for synthetic fuels (e-kerosene).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2405',
    full_text: `REGULATION (EU) 2023/2405 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 18 October 2023
on ensuring a level playing field for sustainable air transport (ReFuelEU Aviation)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 100(2) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Aviation accounts for approximately 3.8% of total EU CO2 emissions, and emissions from the sector have been rising. To meet the objectives of the European Climate Law and the Paris Agreement, all sectors must contribute, including aviation.

(2) Sustainable aviation fuels (SAF) are currently the most promising pathway to decarbonise aviation in the short and medium term, particularly for long-haul flights where electric or hydrogen propulsion is not yet feasible.

(3) A mandated minimum share of SAF ensures demand certainty for producers, drives investment, and levels the playing field by applying the obligation equally to all aviation fuel suppliers operating at EU airports.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and objectives

This Regulation lays down harmonised obligations on aviation fuel suppliers and aircraft operators to increase the uptake of sustainable aviation fuels, including synthetic aviation fuels, in order to reduce the lifecycle greenhouse gas emissions of the aviation sector.

Article 2 — Scope

This Regulation applies to:
(a) aviation fuel suppliers delivering aviation fuel at EU airports;
(b) aircraft operators departing from EU airports with commercial air transport operations.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'sustainable aviation fuel' or 'SAF' means a drop-in aviation fuel that meets the sustainability and greenhouse gas emissions saving criteria laid down in the Renewable Energy Directive, including:
(a) biofuels produced from feedstock listed in Parts A and B of Annex IX to the Renewable Energy Directive;
(b) renewable fuels of non-biological origin (synthetic aviation fuels or e-kerosene);
(c) recycled carbon fuels meeting the requirements of the Renewable Energy Directive;

(2) 'synthetic aviation fuel' means a renewable fuel of non-biological origin, as defined in the Renewable Energy Directive, used as aviation fuel, produced from renewable hydrogen and CO2 captured from direct air capture or industrial point sources;

(3) 'aviation fuel supplier' means a fuel supplier as defined in the Renewable Energy Directive, that supplies aviation fuel at a Union airport.

CHAPTER II — OBLIGATIONS

Article 4 — Obligation on aviation fuel suppliers

1. Aviation fuel suppliers shall ensure that all aviation fuel made available at EU airports contains a minimum share of SAF as follows:
(a) from 1 January 2025: 2%;
(b) from 1 January 2030: 6%;
(c) from 1 January 2035: 20%;
(d) from 1 January 2040: 34%;
(e) from 1 January 2045: 42%;
(f) from 1 January 2050: 70%.

2. Within the shares of SAF referred to in paragraph 1, the aviation fuel suppliers shall ensure a minimum share of synthetic aviation fuel as follows:
(a) from 1 January 2030: 1.2%;
(b) from 1 January 2032: 2%;
(c) from 1 January 2035: 5%;
(d) from 1 January 2040: 10%;
(e) from 1 January 2045: 15%;
(f) from 1 January 2050: 35%.

Article 5 — Obligation on aircraft operators — tankering prevention

1. Aircraft operators departing from a Union airport shall ensure that the annual quantity of aviation fuel uplifted at that Union airport is at least 90% of the annual aviation fuel required for departures from that airport.

2. This provision aims to prevent the practice of 'tankering' — carrying excess fuel from airports outside the EU where fuel is cheaper to avoid purchasing SAF-blended fuel at EU airports.

Article 6 — Union database for SAF

1. The Commission shall establish and maintain a Union database for the tracking, certification and monitoring of SAF volumes.

2. Aviation fuel suppliers shall report to the database:
(a) the total volume of aviation fuel supplied at each EU airport;
(b) the volume and type of SAF supplied;
(c) the lifecycle greenhouse gas emissions of the SAF supplied;
(d) the feedstock used in the production of SAF.

CHAPTER III — REPORTING AND MONITORING

Article 7 — Reporting by aviation fuel suppliers

By 31 March of each year, aviation fuel suppliers shall report to the competent authority:
(a) the total volume of aviation fuel supplied at each EU airport;
(b) the volume and type of SAF;
(c) the synthetic aviation fuel share;
(d) the lifecycle greenhouse gas emission reduction achieved compared to the fossil fuel comparator.

Article 8 — Reporting by aircraft operators

By 31 March of each year, aircraft operators shall report to the competent authority:
(a) the total annual aviation fuel required for departures from each EU airport;
(b) the total annual aviation fuel uplifted at each EU airport;
(c) an explanation where the 90% minimum uptake was not met, including any force majeure circumstances.

CHAPTER IV — ENFORCEMENT

Article 10 — Penalties for non-compliance by aviation fuel suppliers

1. Where an aviation fuel supplier fails to meet the minimum SAF share, the competent authority shall impose an administrative fine calculated as:
Fine = (shortfall in SAF volume in tonnes) × 2 × (the difference between the average price of SAF and the average price of conventional aviation fuel per tonne).

2. Where an aviation fuel supplier fails to meet the minimum synthetic aviation fuel share, the administrative fine shall be:
Fine = (shortfall in synthetic fuel volume in tonnes) × 2 × (the difference between the average price of synthetic aviation fuel and the average price of conventional aviation fuel per tonne).

Article 11 — Penalties for non-compliance by aircraft operators

Where an aircraft operator fails to meet the 90% minimum fuel uptake requirement, the competent authority shall impose an administrative fine calculated as:
Fine = (shortfall volume in tonnes) × 2 × (the average price of conventional aviation fuel per tonne at the relevant EU airport).

CHAPTER V — FINAL PROVISIONS

Article 14 — Review

By 1 January 2028 and every four years thereafter, the Commission shall report on the application of this Regulation to the European Parliament and the Council. The report shall assess:
(a) the development of the SAF market and production capacity;
(b) the impact on ticket prices and airline competitiveness;
(c) the need to adjust the SAF mandates;
(d) technological developments in electric and hydrogen-powered aviation.

Article 15 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 1 January 2024, with the exception of Article 4 and Article 5 which shall apply from 1 January 2025.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 18 October 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'governance-regulation',
    title: 'Regulation (EU) 2018/1999 on the Governance of the Energy Union and Climate Action',
    short_title: 'Governance Regulation',
    celex_number: '32018R1999',
    document_type: 'regulation',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2018-12-11',
    entry_into_force: '2018-12-24',
    summary: 'Establishes the governance mechanism for the Energy Union, requiring Member States to draft integrated National Energy and Climate Plans (NECPs) and long-term strategies. Creates a monitoring and reporting framework.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R1999',
    full_text: `REGULATION (EU) 2018/1999 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 11 December 2018
on the Governance of the Energy Union and Climate Action, amending Regulations (EC) No 663/2009 and (EC) No 715/2009, Directives 94/22/EC, 98/70/EC, 2009/31/EC, 2009/73/EC, 2010/31/EU, 2012/27/EU and 2013/30/EU, Council Directives 2009/119/EC and (EU) 2015/652 and repealing Regulation (EU) No 525/2013

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) and Article 194(2) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The Energy Union Strategy of February 2015 set out the vision of an Energy Union with citizens at its core, where citizens take ownership of the energy transition and benefit from new technologies. The governance mechanism should ensure proper planning, reporting and monitoring.

(2) Integrated national energy and climate plans (NECPs) should cover all five dimensions of the Energy Union: energy security, the internal energy market, energy efficiency, decarbonisation, and research and innovation.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

1. This Regulation establishes a governance mechanism to:
(a) implement strategies and measures designed to meet the Union's 2030 targets and the long-term greenhouse gas emission reduction objectives consistent with the Paris Agreement;
(b) stimulate cooperation between Member States in the five dimensions of the Energy Union;
(c) ensure the timeliness, transparency, accuracy, consistency, comparability and completeness of the information reported by the Union and its Member States.

2. The governance mechanism is based on:
(a) integrated national energy and climate plans covering 10-year periods;
(b) integrated national energy and climate progress reports;
(c) a monitoring process by the Commission;
(d) long-term strategies.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'five dimensions of the Energy Union' means: energy security, internal energy market, energy efficiency, decarbonisation, and research, innovation and competitiveness;
(2) 'integrated national energy and climate plan' means a comprehensive plan drawn up by a Member State covering the five dimensions of the Energy Union;
(3) 'policies and measures' means all instruments which contribute to meeting the objectives of integrated national energy and climate plans.

CHAPTER II — INTEGRATED NATIONAL ENERGY AND CLIMATE PLANS

Article 3 — Integrated national energy and climate plans

1. By 31 December 2019, and by 1 January 2029 and every ten years thereafter, each Member State shall notify to the Commission an integrated national energy and climate plan. The plans shall contain:
(a) an overview of the process followed for establishing the plan, including public consultations;
(b) a description of national objectives, targets and contributions for each of the five dimensions;
(c) a description of existing and planned policies and measures;
(d) a description of the current situation of the five dimensions;
(e) an assessment of the impacts of planned policies and measures;
(f) an assessment of the investment needs;
(g) an assessment of the impacts on energy poverty.

2. Member States shall ensure coherence between their NECPs and their long-term strategies and their national adaptation strategies.

Article 4 — National objectives, targets and contributions

Each Member State shall set out in its NECP the following main objectives, targets and contributions:
(a) Decarbonisation:
(i) the Member State's binding national target for greenhouse gas emissions under the Effort Sharing Regulation;
(ii) the Member State's commitments under the LULUCF Regulation;
(iii) the Member State's national contribution to the Union renewable energy target;
(iv) trajectories for the share of renewable energy in electricity, heating and cooling, and transport.

(b) Energy efficiency:
(i) the indicative national energy efficiency contribution;
(ii) cumulative amounts of end-use energy savings;
(iii) the long-term strategy for building renovation.

(c) Energy security:
(i) national objectives for increasing diversification of energy sources and supply;
(ii) national objectives for reducing energy import dependency.

(d) Internal energy market:
(i) the level of electricity interconnectivity;
(ii) national objectives for gas and electricity infrastructure.

(e) Research, innovation and competitiveness:
(i) national objectives and funding targets for public and private research;
(ii) national objectives for the deployment of innovative technologies.

Article 9 — Draft integrated national energy and climate plans

1. By 1 January 2018, and by 1 January 2028 and every ten years thereafter, each Member State shall prepare and submit to the Commission a draft of the NECP.

2. The Commission shall assess the draft plans and may issue country-specific recommendations within six months.

3. Member States shall take due account of the Commission's recommendations in their final plans.

CHAPTER III — LONG-TERM STRATEGIES

Article 15 — Long-term strategies

1. By 1 January 2020, and by 1 January 2029 and every ten years thereafter, each Member State shall prepare and report to the Commission its long-term strategy with a perspective of at least 30 years.

2. Long-term strategies shall include:
(a) total greenhouse gas emission reductions and enhancement of removals by sinks;
(b) emission reductions and enhancements of removals in individual sectors, including electricity, industry, transport, heating and cooling, buildings, agriculture and LULUCF;
(c) expected progress on the transition to a low greenhouse gas emission economy;
(d) links to other national long-term objectives and planning.

CHAPTER IV — REPORTING

Article 17 — Integrated national energy and climate progress reports

1. By 15 March 2023 and every two years thereafter, each Member State shall report to the Commission on the status of implementation of its NECP.

2. The reports shall cover:
(a) information on progress towards national objectives, targets and contributions;
(b) information on policies and measures implemented;
(c) an assessment of progress on the five dimensions of the Energy Union.

Article 26 — Greenhouse gas inventories

1. Each Member State shall report to the Commission its annual greenhouse gas inventory, covering emissions and removals of CO2, CH4, N2O, HFCs, PFCs, SF6 and NF3.

2. Inventories shall be submitted by 15 January of each year for the year two years before that year.

CHAPTER V — COMMISSION ASSESSMENT AND RESPONSE

Article 29 — Assessment by the Commission

1. By 31 October 2023 and every two years thereafter, the Commission shall assess:
(a) the progress made by each Member State towards meeting its NECP objectives;
(b) the progress made by the Union as a whole towards meeting the Energy Union objectives.

2. Where the Commission finds that a Member State has made insufficient progress, it may issue recommendations and the Member State shall take due account of those recommendations or make its reasoning public if it decides not to follow them.

Article 32 — Gap-filling mechanism for renewables

Where the Commission finds that the Union as a whole is not on track to collectively meet the renewable energy target, it shall take additional measures at Union level or issue recommendations to Member States with gaps.

Article 33 — Gap-filling mechanism for energy efficiency

Where the Commission finds that the Union is not on track to meet the energy efficiency target, it shall take additional measures and propose Union-level measures as appropriate.

CHAPTER VI — FINAL PROVISIONS

Article 57 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 11 December 2018.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'industrial-emissions-directive',
    title: 'Directive 2010/75/EU on industrial emissions (integrated pollution prevention and control)',
    short_title: 'Industrial Emissions Directive',
    celex_number: '32010L0075',
    document_type: 'directive',
    domain: 'industry',
    status: 'amended',
    adoption_date: '2010-11-24',
    entry_into_force: '2011-01-06',
    summary: 'Sets permit conditions and emission limits for approximately 75,000 industrial installations across the EU (extended from ~50,000 by the 2024 revision, Directive 2024/1785). Covers emissions to air, water, and soil, and applies best available techniques (BAT).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32010L0075',
    full_text: `DIRECTIVE 2010/75/EU OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 24 November 2010
on industrial emissions (integrated pollution prevention and control)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Several amendments to Directive 2008/1/EC concerning integrated pollution prevention and control are to be made. In the interests of clarity, that Directive should be recast, integrating also the sectoral directives on large combustion plants, waste incineration, solvents, and titanium dioxide.

(2) Industrial activities have a significant share in the overall pollution in Europe. The prevention and control of pollution from industrial installations is essential for achieving the EU's environmental objectives.

CHAPTER I — COMMON PROVISIONS

Article 1 — Subject matter

This Directive lays down rules on integrated prevention and control of pollution arising from industrial activities. It also lays down rules designed to prevent or, where that is not practicable, to reduce emissions into air, water and land and to prevent the generation of waste, in order to achieve a high level of protection of the environment taken as a whole.

Article 2 — Scope

1. This Directive shall apply to the industrial activities giving rise to pollution referred to in Chapters II to VI.

2. This Directive shall not apply to research activities, development activities or the testing of new products and processes.

Article 3 — Definitions

For the purposes of this Directive:
(1) 'installation' means a stationary technical unit within which one or more activities listed in Annex I or in Part 1 of Annex VII are carried out, and any other directly associated activities on the same site which have a technical connection with the activities listed in those Annexes and which could have an effect on emissions and pollution;
(2) 'emission' means the direct or indirect release of substances, vibrations, heat or noise from individual or diffuse sources in the installation into air, water or land;
(3) 'emission limit value' means the mass, expressed in terms of certain specific parameters, concentration and/or level of an emission, which may not be exceeded during one or more periods of time;
(4) 'best available techniques' or 'BAT' means the most effective and advanced stage in the development of activities and their methods of operation which indicates the practical suitability of particular techniques for providing the basis for emission limit values and other permit conditions;
(5) 'BAT reference document' or 'BREF' means a document drawn up for defined activities, describing in particular applied techniques, present emissions and consumption levels, techniques considered for the determination of best available techniques, as well as BAT conclusions;
(6) 'BAT conclusions' means a document containing the parts of a BAT reference document laying down the conclusions on best available techniques, their description, the associated emission levels, and the associated monitoring measures.

CHAPTER II — PROVISIONS FOR ACTIVITIES LISTED IN ANNEX I

Article 4 — Obligation to hold a permit

Member States shall take the necessary measures to ensure that no installation or combustion plant, waste incineration plant or waste co-incineration plant is operated without a permit.

Article 11 — General principles governing the basic obligations of the operator

Member States shall take the necessary measures to ensure that installations are operated in accordance with the following principles:
(a) all the appropriate preventive measures are taken against pollution;
(b) the best available techniques are applied;
(c) no significant pollution is caused;
(d) the generation of waste is prevented in accordance with the Waste Framework Directive;
(e) where waste is generated, it is prepared for re-use, recycled, recovered or disposed of;
(f) energy is used efficiently;
(g) the necessary measures are taken to prevent accidents and limit their consequences;
(h) the necessary measures are taken upon definitive cessation of activities to avoid any risk of pollution and to return the site to a satisfactory state.

Article 13 — BAT reference documents and exchange of information

1. The Commission shall organise an exchange of information between Member States, the industries concerned, non-governmental organisations and the Commission, and shall publish the results in BAT reference documents.

2. The Commission shall establish and regularly convene a forum composed of representatives of Member States, the industries and non-governmental organisations, to give its opinion on the practical arrangements for the exchange of information.

Article 14 — Permit conditions

1. Member States shall ensure that the permit includes all measures necessary to comply with the conditions required under Articles 11 and 18.

2. Permit conditions shall include emission limit values for polluting substances, which shall be based on the best available techniques, without prescribing the use of any technique or specific technology.

3. The emission limit values set in permits shall not exceed the emission levels associated with the best available techniques as laid down in BAT conclusions. Those emission limit values shall be set for the same or shorter periods of time and under the same reference conditions as those associated emission levels.

Article 15 — Emission limit values, equivalent parameters and technical measures

1. The emission limit values for polluting substances shall apply at the point where the emissions leave the installation, and any dilution prior to that point shall be disregarded when determining those values.

2. Without prejudice to Article 18, the emission limit values and the equivalent parameters and technical measures referred to in Article 14 shall be based on the best available techniques, without prescribing the use of any technique or specific technology.

Article 21 — Reconsideration and updating of permit conditions

1. Member States shall take the necessary measures to ensure that the competent authority periodically reconsiders all the permit conditions and, where necessary, updates those conditions.

2. The reconsideration shall be carried out in any case where:
(a) the pollution caused by the installation is of such significance that the existing emission limit values of the permit need to be revised or new emission limit values need to be included in the permit;
(b) substantial changes in the best available techniques make it possible to reduce emissions significantly without imposing excessive costs;
(c) BAT conclusions are adopted or updated.

3. Within four years of publication of a BAT conclusion, the competent authority shall ensure that all permit conditions for the installation are reconsidered and, if necessary, updated.

CHAPTER III — SPECIAL PROVISIONS FOR COMBUSTION PLANTS

Article 28 — Scope

This Chapter shall apply to combustion plants with a total rated thermal input equal to or greater than 50 MW, irrespective of the type of fuel used.

Article 30 — Emission limit values

Emission limit values for large combustion plants shall comply with Parts 1 and 2 of Annex V, covering sulphur dioxide (SO2), nitrogen oxides (NOx), and dust/particulate matter.

CHAPTER VII — FINAL PROVISIONS

Article 82 — Transposition

Member States shall bring into force the laws, regulations and administrative provisions necessary to comply with this Directive by 7 January 2013.

Article 84 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Strasbourg, 24 November 2010.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'net-zero-industry-act',
    title: 'Regulation (EU) 2024/1735 establishing a framework for ensuring a secure and sustainable supply of net-zero technologies',
    short_title: 'Net-Zero Industry Act',
    celex_number: '32024R1735',
    document_type: 'regulation',
    domain: 'industry',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-07-29',
    summary: 'Aims to scale up EU manufacturing of clean energy technologies (solar, wind, batteries, heat pumps, electrolysers, CCS, grid). Sets a benchmark of 40% domestic manufacturing capacity for deployment needs by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735',
    full_text: `REGULATION (EU) 2024/1735 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 June 2024
establishing a framework for ensuring a secure and sustainable supply of net-zero technologies and amending Regulation (EU) 2018/1724

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The transition to climate neutrality creates enormous industrial opportunities. Global markets for key clean energy technologies are set to triple by 2030. The EU must ensure that it captures a fair share of this growing market.

(2) The EU currently relies heavily on imports for many clean energy technologies. For solar photovoltaic panels, over 90% of manufacturing capacity is located in China. This concentration creates supply chain risks.

(3) The Net-Zero Industry Act aims to strengthen the EU's manufacturing capacity for net-zero technologies, streamline permitting, and ensure that public procurement and auctions support domestic production.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and objectives

1. This Regulation establishes a framework to improve the conditions for the establishment and scaling up of net-zero technology manufacturing capacity in the Union.

2. This Regulation pursues the following objectives:
(a) the Union's net-zero technology manufacturing capacity approaches or reaches a benchmark of at least 40% of the Union's annual deployment needs for the corresponding technologies by 2030;
(b) the Union achieves a CO2 injection capacity of at least 50 million tonnes per year by 2030;
(c) the Union increases its share of the global manufacturing of net-zero technologies.

Article 2 — Scope

This Regulation applies to the following net-zero technologies:
(a) solar photovoltaic and solar thermal technologies;
(b) onshore wind and offshore renewable energy technologies;
(c) battery and energy storage technologies;
(d) heat pumps and geothermal energy technologies;
(e) electrolysers and fuel cells;
(f) sustainable biogas and biomethane technologies;
(g) carbon capture, utilisation and storage (CCUS) technologies;
(h) grid technologies;
(i) nuclear fission energy technologies (including small modular reactors and related fuel cycle technologies);
(j) sustainable alternative fuels technologies;
(k) technologies for energy system-related energy efficiency.

CHAPTER II — ENABLING CONDITIONS FOR NET-ZERO TECHNOLOGY MANUFACTURING

Article 6 — Net-zero strategic projects

1. Member States shall recognise as net-zero strategic projects those projects that contribute significantly to achieving the objectives of this Regulation.

2. Net-zero strategic projects shall benefit from:
(a) streamlined permitting procedures;
(b) priority status in permitting processes;
(c) faster administrative procedures;
(d) access to financial support.

Article 9 — Permit-granting process

1. The permit-granting process for net-zero technology manufacturing projects shall not exceed:
(a) 12 months for net-zero strategic projects with an annual manufacturing capacity of less than 1 GW;
(b) 18 months for all other net-zero strategic projects;
(c) 18 months for other net-zero technology manufacturing projects.

2. Member States shall establish or designate one national competent authority as a single point of contact for the permit-granting process.

CHAPTER III — CO2 STORAGE

Article 18 — Union CO2 injection capacity target

1. By 2030, the total annual CO2 injection capacity in storage sites located in the territory of the Union shall reach at least 50 million tonnes.

2. Licensed holders of oil and gas production authorisations in the territory of the Union shall contribute proportionally to the target, based on their share of EU oil and gas production.

CHAPTER IV — ACCESS TO MARKETS

Article 22 — Sustainability and resilience criteria in public procurement

1. Contracting authorities shall include sustainability and resilience criteria when procuring net-zero technology products or when awarding concessions.

2. Those criteria shall include:
(a) the environmental sustainability of the technology;
(b) the contribution to energy system integration and energy efficiency;
(c) the contribution to resilience by considering the diversification of supply;
(d) the cybersecurity performance of the product.

Article 25 — Resilience criteria in auctions for renewable energy

1. When designing auctions for the deployment of renewable energy, Member States shall include pre-qualification criteria or award criteria assessing the contribution of the project to sustainability and resilience.

2. The contribution to resilience shall have a minimum weight of 5% and a maximum weight of 30% in the award criteria.

CHAPTER V — SKILLS AND WORKFORCE

Article 29 — Net-Zero Industry Academies

1. The Commission shall support the establishment of Net-Zero Industry Academies to develop and deploy education and training programmes for net-zero technologies.

2. The Academies shall aim to train 100,000 workers within three years of their establishment.

3. The Academies shall develop standardised learning programmes and credentials to be recognised across Member States.

CHAPTER VI — GOVERNANCE AND FINAL PROVISIONS

Article 36 — Net-Zero Europe Platform

1. A Net-Zero Europe Platform is established to advise and assist the Commission and Member States on the implementation of this Regulation.

2. The Platform shall be composed of representatives of Member States, the Commission, and relevant stakeholders.

Article 42 — Review

The Commission shall evaluate this Regulation by 30 June 2028 and every three years thereafter, and present a report on progress towards the targets.

Article 44 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 13 June 2024.`,
    last_updated: '2024-07-15',
  },
  {
    id: 'critical-raw-materials-act',
    title: 'Regulation (EU) 2024/1252 establishing a framework for ensuring a secure and sustainable supply of critical raw materials',
    short_title: 'Critical Raw Materials Act',
    celex_number: '32024R1252',
    document_type: 'regulation',
    domain: 'industry',
    status: 'in_force',
    adoption_date: '2024-04-11',
    entry_into_force: '2024-05-23',
    summary: 'Strengthens EU supply chains for critical raw materials needed for the green and digital transitions. Sets benchmarks for domestic extraction (10%), processing (40%), and recycling (25%) by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252',
    full_text: `REGULATION (EU) 2024/1252 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 11 May 2024
establishing a framework for ensuring a secure and sustainable supply of critical raw materials and amending Regulations (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1724 and (EU) 2019/1020

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Critical raw materials are essential for a broad set of strategic sectors including renewable energy, digital industry, aerospace and defence. The EU's strategic autonomy and the green and digital transitions depend on a secure supply of these materials.

(2) The EU is highly dependent on imports for many critical raw materials. For example, 98% of rare earth elements used in the EU are imported from China. This concentration of supply creates significant vulnerabilities.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and objectives

1. This Regulation establishes a framework to ensure the Union's access to a secure, diversified, affordable and sustainable supply of critical raw materials.

2. To achieve that objective, this Regulation sets the following benchmarks to be achieved by 2030:
(a) Union extraction capacity is able to extract the ores, minerals or concentrates needed to produce at least 10% of the Union's annual consumption of strategic raw materials;
(b) Union processing capacity is able to process at least 40% of the Union's annual consumption of strategic raw materials;
(c) Union recycling capacity is able to produce at least 25% of the Union's annual consumption of strategic raw materials from waste;
(d) not more than 65% of the Union's annual consumption of each strategic raw material at any relevant stage of processing is from a single third country.

Article 2 — Lists of critical and strategic raw materials

1. The list of strategic raw materials is set out in Annex I and includes: bismuth, boron, cobalt, copper, gallium, germanium, lithium, magnesium, manganese, natural graphite, nickel, platinum group metals, rare earth elements, silicon metal, titanium metal, and tungsten.

2. The list of critical raw materials is set out in Annex II and includes the strategic raw materials and additional materials assessed as critical based on economic importance and supply risk.

CHAPTER II — STRATEGIC PROJECTS

Article 5 — Recognition of strategic projects

1. Strategic projects shall contribute to:
(a) increasing the Union's extraction, processing, or recycling capacity for strategic raw materials;
(b) diversifying the Union's supply by increasing imports from third countries that are not dominant suppliers;
(c) improving the circularity of strategic raw materials.

2. The permit-granting process for strategic projects shall not exceed:
(a) 27 months for extraction projects;
(b) 15 months for processing and recycling projects.

Article 8 — Acceleration of permit-granting

1. Strategic projects shall be considered to be of overriding public interest for the purpose of environmental legislation.

2. Member States shall designate a single national competent authority responsible for facilitating and coordinating the permit-granting process.

CHAPTER III — MONITORING AND RISK MITIGATION

Article 19 — Monitoring

1. The Commission shall regularly monitor the supply chains of critical raw materials, including:
(a) trade flows and trade barriers;
(b) supply and demand dynamics;
(c) concentration of supply;
(d) Union extraction, processing, and recycling capacity.

Article 22 — Stress tests

1. The Commission shall carry out regular stress tests of the supply chains of strategic raw materials at least every three years.

2. The stress tests shall assess the vulnerability of the supply chain to potential disruptions.

Article 24 — Strategic reserves

1. Member States shall assess whether their strategic reserves of strategic raw materials are sufficient to mitigate supply disruptions.

2. Where strategic reserves are below the safe minimum level, Member States shall develop plans to build up reserves.

CHAPTER IV — SUSTAINABILITY AND CIRCULARITY

Article 25 — Recycling and recovery

1. Member States shall adopt and implement national measures to increase the collection and recycling of waste containing significant amounts of critical raw materials, including from waste electrical and electronic equipment, end-of-life vehicles, and waste batteries.

2. Large companies that place products containing permanent magnets on the Union market shall make available information on the quantity and type of permanent magnets contained in the product and on how to remove them.

Article 29 — Environmental footprint

1. The Commission may adopt delegated acts establishing calculation and verification rules for the environmental footprint of critical raw materials.

2. Those rules shall cover greenhouse gas emissions, water use, land use, and waste generation.

CHAPTER V — FINAL PROVISIONS

Article 46 — Review

The Commission shall review this Regulation by 24 May 2028, and shall assess the need to update the lists of strategic and critical raw materials and the benchmarks.

Article 48 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 11 May 2024.`,
    last_updated: '2024-06-01',
  },
  {
    id: 'deforestation-regulation',
    title: 'Regulation (EU) 2023/1115 on deforestation-free supply chains',
    short_title: 'Deforestation Regulation',
    celex_number: '32023R1115',
    document_type: 'regulation',
    domain: 'agriculture',
    status: 'in_force',
    adoption_date: '2023-05-31',
    entry_into_force: '2023-06-29',
    summary: 'Bans placing commodities linked to deforestation (cattle, cocoa, coffee, oil palm, rubber, soya, wood) on the EU market. Requires companies to trace and verify that products are deforestation-free. Following two postponements (most recently Reg. 2025/2650), obligations apply from 30 December 2026 for large and medium operators and from 30 June 2027 for micro and small operators.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115',
    full_text: `REGULATION (EU) 2023/1115 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 31 May 2023
on the making available on the Union market and the export from the Union of certain commodities and products associated with deforestation and forest degradation and repealing Regulation (EU) No 995/2010

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Forests cover approximately 30% of the Earth's land surface. They are the main reservoir of global biodiversity, hosting over 80% of terrestrial animal and plant species. Deforestation and forest degradation are major drivers of biodiversity loss and climate change, contributing approximately 11% of global greenhouse gas emissions.

(2) The European Green Deal and the EU Biodiversity Strategy for 2030 recognised the need for the EU to reduce its consumption footprint on land and committed to minimising the EU's contribution to global deforestation and forest degradation.

(3) The EU is a major consumer and trader of commodities associated with deforestation. This Regulation aims to ensure that products consumed in the EU do not contribute to deforestation or forest degradation globally.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down rules regarding the making available on the Union market, as well as the export from the Union, of the relevant commodities and products, with the aim of:
(a) minimising the Union's contribution to deforestation and forest degradation worldwide;
(b) reducing the Union's contribution to greenhouse gas emissions and global biodiversity loss.

Article 2 — Scope

1. This Regulation applies to the following relevant commodities and relevant products containing, having been fed with, or having been made using:
(a) cattle;
(b) cocoa;
(c) coffee;
(d) oil palm;
(e) rubber;
(f) soya;
(g) wood.

2. The relevant products include derived products such as leather, chocolate, palm oil, furniture, printed paper, charcoal, and numerous other downstream products listed in Annex I.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'deforestation' means the conversion of forest to agricultural use, whether human-induced or not;
(2) 'forest degradation' means structural changes to forest cover, taking the form of the conversion of primary forests or naturally regenerating forests into plantation forests or into other wooded land, or the conversion of primary forests into planted forests;
(3) 'deforestation-free' means that the relevant commodities were produced on land that has not been subject to deforestation after 31 December 2020 and that wood has been harvested from the forest without inducing forest degradation after 31 December 2020;
(4) 'due diligence' means the measures set out in Article 8;
(5) 'geolocation' means the geographical location of the plot of land where the relevant commodity was produced, described by latitude and longitude coordinates;
(6) 'country benchmarking' means a system classifying countries or parts thereof according to the level of risk of deforestation associated with the relevant commodities produced in those countries.

CHAPTER II — OBLIGATIONS OF OPERATORS AND TRADERS

Article 4 — Prohibition

Relevant commodities and relevant products shall not be placed on the Union market or exported from the Union unless:
(a) they are deforestation-free;
(b) they have been produced in accordance with the relevant legislation of the country of production; and
(c) they are covered by a due diligence statement.

Article 8 — Due diligence

1. Operators shall exercise due diligence prior to placing relevant commodities or products on the Union market or prior to their export.

2. The due diligence system shall include:
(a) Information requirements — the operator shall collect:
(i) a description of the product, including the trade name and type;
(ii) the country of production and geolocation of all plots of land where the relevant commodities were produced;
(iii) the quantity of the relevant product;
(iv) the name, postal address and email address of any business or person from whom the operator has been supplied;
(v) evidence that the relevant commodities and products are deforestation-free;
(vi) evidence that they comply with the legislation of the country of production.

(b) Risk assessment — the operator shall assess the risk that the relevant commodities or products are not compliant, taking into account:
(i) country of production risk, including the country benchmarking;
(ii) presence of forests in the country or region of production;
(iii) prevalence of deforestation in the area;
(iv) concerns relating to the country of production or origin, including corruption levels;
(v) the complexity of the relevant supply chain.

(c) Risk mitigation — where the risk identified is non-negligible, the operator shall carry out risk mitigation measures, including:
(i) requesting additional information from suppliers;
(ii) carrying out independent surveys and audits;
(iii) use of satellite monitoring, aerial imagery, or other technology to verify geolocation data.

Article 10 — Due diligence statement

1. Before placing relevant commodities or products on the Union market, the operator shall submit a due diligence statement to the competent authority through the EU information system.

2. The due diligence statement shall contain:
(a) the name and registration details of the operator;
(b) the description and quantity of the relevant products;
(c) the country of production and geolocation coordinates;
(d) a confirmation that due diligence has been exercised;
(e) a statement that no or only negligible risk was found.

CHAPTER III — COUNTRY BENCHMARKING

Article 29 — Country benchmarking system

1. The Commission shall classify countries, or parts thereof, into three categories of risk:
(a) low risk;
(b) standard risk;
(c) high risk.

2. The classification shall be based on criteria including:
(a) rate of deforestation and forest degradation;
(b) rate of expansion of agricultural land for the relevant commodities;
(c) production trends for the relevant commodities;
(d) the existence and enforcement of national or subnational laws on deforestation.

3. Simplified due diligence shall apply for low-risk countries; enhanced due diligence shall apply for high-risk countries.

CHAPTER IV — COMPETENT AUTHORITIES AND CHECKS

Article 14 — Checks

1. Competent authorities shall carry out checks on operators and traders to verify compliance with this Regulation.

2. The checks shall cover at least 9% of operators placing products from high-risk countries on the Union market, at least 3% from standard-risk countries, and at least 1% from low-risk countries.

CHAPTER V — FINAL PROVISIONS

Article 36 — Application dates

This Regulation shall apply:
(a) from 30 December 2026 for operators that are not micro or small enterprises (as postponed by Regulation (EU) 2025/2650);
(b) from 30 June 2027 for micro and small enterprises (as postponed by Regulation (EU) 2025/2650).

Article 38 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 31 May 2023.`,
    last_updated: '2024-01-15',
  },
  // ─── Digital / Tech ─────────────────────────────────────────────────────────
  {
    id: 'ai-act',
    title: 'Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act)',
    short_title: 'AI Act',
    celex_number: '32024R1689',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-08-01',
    summary: 'Establishes a comprehensive, risk-based legal framework for artificial intelligence in the EU. Classifies AI systems by risk level and prohibits certain practices such as social scoring. Sets conformity-assessment and transparency obligations for high-risk AI systems.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689',
    full_text: `REGULATION (EU) 2024/1689 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 June 2024
laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Articles 16 and 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) The purpose of this Regulation is to improve the functioning of the internal market by laying down a uniform legal framework for the development, placing on the market, putting into service and use of artificial intelligence systems in the Union, while ensuring a high level of protection of health, safety and fundamental rights.

(2) AI systems can be easily deployed across borders and circulate throughout the Union. A Union legal framework is needed to establish harmonised rules and avoid fragmentation.

(3) AI should be a tool for people and should serve the well-being of society. AI should therefore be trustworthy and human-centric, ensuring a high level of protection of fundamental rights.

TITLE I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down:
(a) harmonised rules for the placing on the market, the putting into service, and the use of AI systems in the Union;
(b) prohibitions of certain artificial intelligence practices;
(c) specific requirements for high-risk AI systems and obligations for operators of such systems;
(d) harmonised transparency rules for certain AI systems;
(e) harmonised rules for the placing on the market of general-purpose AI models;
(f) rules on market monitoring, market surveillance, governance and enforcement;
(g) measures in support of innovation.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'AI system' means a machine-based system that is designed to operate with varying levels of autonomy, that may exhibit adaptiveness after deployment and that, for explicit or implicit objectives, infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions that can influence physical or virtual environments;
(2) 'provider' means a natural or legal person that develops an AI system or a general-purpose AI model and places it on the market or puts it into service under its own name or trademark;
(3) 'deployer' means a natural or legal person that uses an AI system under its authority;
(4) 'high-risk AI system' means an AI system referred to in Article 6;
(5) 'general-purpose AI model' means an AI model that is trained with a large amount of data using self-supervision at scale, that displays significant generality and is capable of competently performing a wide range of distinct tasks.

TITLE II — PROHIBITED AI PRACTICES

Article 5 — Prohibited AI practices

1. The following AI practices shall be prohibited:
(a) the placing on the market, the putting into service or the use of an AI system that deploys subliminal techniques beyond a person's consciousness or purposefully manipulative or deceptive techniques, with the objective, or the effect, of materially distorting the behaviour of a person or group of persons;
(b) the placing on the market, the putting into service or the use of an AI system that exploits any of the vulnerabilities of a natural person or a specific group of persons due to their age, disability or a specific social or economic situation;
(c) the placing on the market, the putting into service or the use of AI systems for the evaluation or classification of natural persons based on their social behaviour or personal characteristics (social scoring);
(d) the use of AI systems for real-time remote biometric identification in publicly accessible spaces for law enforcement purposes, except in strictly limited, narrowly defined situations;
(e) the use of AI systems to infer emotions of a natural person in the areas of workplace and education, except for medical or safety reasons;
(f) the use of AI systems that create or expand facial recognition databases through the untargeted scraping of facial images from the internet or CCTV footage;
(g) the placing on the market, the putting into service, or the use of biometric categorisation systems that categorise individually natural persons based on their biometric data to deduce or infer their race, political opinions, trade union membership, religious beliefs, sex life or sexual orientation.

TITLE III — HIGH-RISK AI SYSTEMS

Article 6 — Classification rules for high-risk AI systems

1. An AI system shall be considered high-risk where it is a product or a safety component of a product covered by Union harmonisation legislation listed in Annex I and is required to undergo a third-party conformity assessment.

2. In addition, AI systems referred to in Annex III shall be considered high-risk. Annex III includes AI systems used in:
(a) biometric identification and categorisation;
(b) management and operation of critical infrastructure;
(c) education and vocational training;
(d) employment, workers management and access to self-employment;
(e) access to and enjoyment of essential private and public services and benefits;
(f) law enforcement;
(g) migration, asylum and border control management;
(h) administration of justice and democratic processes.

Article 9 — Risk management system

1. A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems. It shall be a continuous iterative process planned and run throughout the entire lifecycle of a high-risk AI system.

Article 10 — Data and data governance

1. High-risk AI systems which make use of techniques involving the training of AI models with data shall be developed on the basis of training, validation and testing data sets that meet the quality criteria referred to in paragraphs 2 to 5.

TITLE IV — TRANSPARENCY OBLIGATIONS

Article 50 — Transparency obligations for providers and deployers of certain AI systems

1. Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural person is informed that they are interacting with an AI system, unless this is obvious from the circumstances.

2. Providers of AI systems that generate synthetic audio, image, video or text content shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated.

3. Deployers of an emotion recognition system or a biometric categorisation system shall inform the natural persons exposed thereto of the operation of the system.

4. Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose that the content has been artificially generated or manipulated.

TITLE V — GENERAL-PURPOSE AI MODELS

Article 51 — Classification of general-purpose AI models as general-purpose AI models with systemic risk

A general-purpose AI model shall be classified as a general-purpose AI model with systemic risk if it has high impact capabilities, which shall be presumed when the cumulative amount of compute used for its training measured in floating point operations is greater than 10^25.

Article 53 — Obligations for providers of general-purpose AI models

1. Providers of general-purpose AI models shall:
(a) draw up and keep up-to-date the technical documentation of the model;
(b) draw up, keep up-to-date and make available information and documentation to providers of AI systems who intend to integrate the general-purpose AI model into their AI systems;
(c) put in place a policy to comply with Union copyright law;
(d) draw up and make publicly available a sufficiently detailed summary about the content used for training of the general-purpose AI model.

Article 55 — Obligations for providers of general-purpose AI models with systemic risk

1. In addition to the obligations listed in Article 53, providers of general-purpose AI models with systemic risk shall:
(a) perform model evaluation, including conducting and documenting adversarial testing;
(b) assess and mitigate possible systemic risks;
(c) keep track of, document and report serious incidents to the AI Office;
(d) ensure an adequate level of cybersecurity protection.

TITLE VI — FINAL PROVISIONS

Article 113 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 2 August 2026, with the following exceptions:
(a) Title II (prohibited practices) shall apply from 2 February 2025;
(b) Title V (general-purpose AI models) shall apply from 2 August 2025;
(c) Annex III high-risk systems shall apply from 2 August 2027.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Brussels, 13 June 2024.`,
    last_updated: '2024-08-15',
  },
  {
    id: 'digital-services-act',
    title: 'Regulation (EU) 2022/2065 on a Single Market For Digital Services (Digital Services Act)',
    short_title: 'Digital Services Act',
    celex_number: '32022R2065',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2022-10-19',
    entry_into_force: '2022-11-16',
    summary: 'Creates a comprehensive framework for the responsibilities of online intermediaries and platforms. Introduces due-diligence obligations, transparency requirements, and content-moderation accountability for digital services, with stricter rules for very large online platforms and search engines.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2065',
    full_text: `REGULATION (EU) 2022/2065 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 19 October 2022
on a Single Market For Digital Services and amending Directive 2000/31/EC (Digital Services Act)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Information society services and especially intermediary services have become an important part of the Union's economy and daily life. Twenty years after the adoption of the e-Commerce Directive, new and innovative business models and services have emerged, reshaping the role of intermediary services and their use by citizens and business.

(2) Intermediary services are used for a large variety of everyday activities, including commercial transactions and civic participation. The digital transformation and increased use of those services have also created new risks and challenges, notably for certain groups such as minors.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

1. This Regulation lays down harmonised rules for a safe, predictable and trusted online environment in which fundamental rights enshrined in the Charter are effectively protected and innovation is facilitated.

2. This Regulation establishes:
(a) a framework for the conditional exemption from liability of providers of intermediary services;
(b) rules on specific due diligence obligations tailored to certain specific categories of providers of intermediary services;
(c) rules on the implementation and enforcement of this Regulation, including as regards cooperation and coordination between authorities.

Article 3 — Definitions

For the purposes of this Regulation:
(g) 'online platform' means a hosting service that, at the request of a recipient of the service, stores and disseminates information to the public;
(h) 'online search engine' means an intermediary service that allows users to input queries in order to perform searches of all websites on the basis of a query;
(i) 'very large online platform' means an online platform which has a number of average monthly active recipients of the service in the Union equal to or higher than 45 million;
(j) 'very large online search engine' means an online search engine which has a number of average monthly active recipients of the service in the Union equal to or higher than 45 million.

CHAPTER III — DUE DILIGENCE OBLIGATIONS

Article 11 — Transparency reporting obligations for providers of intermediary services

Providers of intermediary services shall make publicly available, at least once a year, clear, comprehensible reports on any content moderation they engaged in during the relevant period.

Article 14 — Terms and conditions

1. Providers of intermediary services shall include information on any restrictions that they impose in relation to the use of their service in respect of information provided by recipients of the service, in their terms and conditions.

Article 16 — Notice and action mechanisms

1. Providers of hosting services shall put mechanisms in place to allow any individual or entity to notify them of the presence on their service of specific items of information that the individual or entity considers to be illegal content.

Article 17 — Statement of reasons

1. Where a provider of hosting services decides to remove or disable access to specific information, it shall provide a clear and specific statement of reasons to the recipient of the service.

Article 20 — Internal complaint-handling system

1. Providers of online platforms shall provide recipients of the service with access to an effective internal complaint-handling system, which enables them to lodge complaints, free of charge, against decisions taken by the provider.

Article 22 — Trusted flaggers

Competent authorities shall award the status of trusted flagger to entities that demonstrate expertise and competence for the purposes of detecting, identifying and notifying illegal content.

Article 27 — Transparency of recommender systems

1. Providers of online platforms that use recommender systems shall set out in their terms and conditions, in a clear, accessible and easily comprehensible manner, the main parameters used in their recommender systems, as well as any options for the recipients of the service to modify or influence those main parameters.

CHAPTER IV — ADDITIONAL OBLIGATIONS FOR VERY LARGE ONLINE PLATFORMS AND SEARCH ENGINES

Article 34 — Risk assessment

1. Providers of very large online platforms and of very large online search engines shall diligently identify, analyse and assess any systemic risks in the Union stemming from the design or functioning of their service and its related systems, including algorithmic systems.

2. The systemic risks shall include:
(a) the dissemination of illegal content through their services;
(b) any actual or foreseeable negative effects for the exercise of fundamental rights;
(c) any actual or foreseeable negative effects on civic discourse, electoral processes, and public security;
(d) any actual or foreseeable negative effects in relation to gender-based violence, public health, and the protection of minors.

Article 35 — Mitigation of risks

1. Providers of very large online platforms and of very large online search engines shall put in place reasonable, proportionate and effective mitigation measures, tailored to the specific systemic risks identified.

Article 37 — Independent audit

1. Providers of very large online platforms and of very large online search engines shall, at their own expense and at least once a year, be subject to independent audits to assess compliance with this Regulation.

Article 40 — Data access and scrutiny

1. Providers of very large online platforms and of very large online search engines shall provide the Digital Services Coordinator of establishment or the Commission, upon their reasoned request, access to data that are necessary to monitor and assess compliance.

2. Providers shall also provide access to data to vetted researchers for the purpose of conducting research that contributes to the detection, identification and understanding of systemic risks.

CHAPTER V — FINAL PROVISIONS

Article 93 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 17 February 2024.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 19 October 2022.`,
    last_updated: '2024-02-17',
  },
  {
    id: 'digital-markets-act',
    title: 'Regulation (EU) 2022/1925 on contestable and fair markets in the digital sector (Digital Markets Act)',
    short_title: 'Digital Markets Act',
    celex_number: '32022R1925',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2022-09-14',
    entry_into_force: '2022-11-01',
    summary: 'Lays down harmonised rules for core platform services designated as "gatekeepers". Imposes ex-ante obligations on large platforms to ensure contestability and fairness, including interoperability, data portability, and prohibitions on self-preferencing.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R1925',
    full_text: `REGULATION (EU) 2022/1925 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 14 September 2022
on contestable and fair markets in the digital sector and amending Directives (EU) 2019/1937 and (EU) 2020/1828 (Digital Markets Act)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Digital services and in particular online platforms play an increasingly important role in the economy, in particular in the internal market. A small number of large platforms act as gateways for a large number of business users to reach end users and vice versa.

(2) Those large platforms have emerged with characteristics that allow them to shape and control entire platform ecosystems. Self-preferencing, lock-in effects, and lack of data access create structural problems that general competition law alone cannot adequately address in a timely manner.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

1. This Regulation lays down harmonised rules ensuring contestability and fairness of markets in the digital sector across the Union where gatekeepers are present.

2. This Regulation applies to core platform services provided or offered by gatekeepers to business users and end users established or located in the Union.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'gatekeeper' means an undertaking providing core platform services that is designated pursuant to Article 3;
(2) 'core platform service' means any of the following:
(a) online intermediation services;
(b) online search engines;
(c) online social networking services;
(d) video-sharing platform services;
(e) number-independent interpersonal communications services;
(f) operating systems;
(g) web browsers;
(h) virtual assistants;
(i) cloud computing services;
(j) online advertising services.

Article 3 — Designation of gatekeepers

1. An undertaking shall be designated as a gatekeeper if:
(a) it has a significant impact on the internal market;
(b) it provides a core platform service which is an important gateway for business users to reach end users; and
(c) it enjoys an entrenched and durable position, in its operations, or it is foreseeable that it will enjoy such a position in the near future.

2. An undertaking that provides a core platform service shall be presumed to satisfy the respective requirements in paragraph 1 where:
(a) it achieves an annual Union turnover equal to or above EUR 7.5 billion in each of the last three financial years, or its average market capitalisation or equivalent fair market value amounts to at least EUR 75 billion;
(b) it provides the same core platform service in at least three Member States; and
(c) the core platform service has at least 45 million monthly active end users established or located in the Union and at least 10,000 yearly active business users.

CHAPTER III — OBLIGATIONS FOR GATEKEEPERS

Article 5 — Obligations for gatekeepers

1. A gatekeeper shall not:
(a) process personal data of end users using services from third parties that make use of the gatekeeper's core platform services, for the purpose of providing online advertising, unless consent has been given;
(b) require business users to use, offer, or interoperate with the gatekeeper's own identification service or payment service;
(c) prevent business users from offering the same products or services to end users through third-party online intermediation services or through their own direct online sales channel at different prices or conditions;
(d) prevent or restrict end users from raising issues with any relevant public authority relating to any practice of gatekeepers.

Article 6 — Further obligations for gatekeepers

1. A gatekeeper shall:
(a) allow end users to un-install any pre-installed software applications on its operating system;
(b) allow the installation and effective use of third-party software applications or software application stores;
(c) refrain from treating more favourably, in ranking and related indexing and crawling, services and products offered by the gatekeeper itself;
(d) allow business users access to the data that they generate on the core platform service;
(e) provide advertisers and publishers with free-of-charge access to performance measuring tools and information;
(f) allow end users to freely choose their default web browser, virtual assistant and online search engine;
(g) provide effective portability of data generated through the activity of end users.

Article 7 — Interoperability of number-independent interpersonal communications services

1. Where a gatekeeper provides number-independent interpersonal communications services, it shall make the basic functionalities of its services interoperable with a third-party provider of such services at the request of that provider.

CHAPTER IV — MARKET INVESTIGATION

Article 16 — Non-compliance investigation

1. Where the Commission suspects that a gatekeeper does not comply with the obligations laid down in this Regulation, it shall conduct a non-compliance investigation.

2. Where the Commission finds non-compliance, it may impose fines of up to 10% of the total worldwide annual turnover of the undertaking, or up to 20% in case of repeated non-compliance.

CHAPTER V — FINAL PROVISIONS

Article 54 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication. It shall apply from 2 May 2023.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 14 September 2022.`,
    last_updated: '2024-03-07',
  },
  {
    id: 'data-act',
    title: 'Regulation (EU) 2023/2854 on harmonised rules on fair access to and use of data (Data Act)',
    short_title: 'Data Act',
    celex_number: '32023R2854',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2023-12-13',
    entry_into_force: '2024-01-11',
    summary: 'Establishes harmonised rules on fair access to and use of data generated by connected products and related services. Empowers users to access and share data, regulates data-sharing contracts, and enables public-sector access to privately held data in exceptional circumstances.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2854',
    full_text: `REGULATION (EU) 2023/2854 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 December 2023
on harmonised rules on fair access to and use of data and amending Regulation (EU) 2017/2394 and Directive (EU) 2020/1828 (Data Act)

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Data is at the centre of the digital transformation. An exponentially growing volume of data is generated by connected products and related services. The economic potential of this data remains largely untapped, partly due to legal and contractual barriers.

(2) This Regulation ensures fairness in the allocation of data value among actors in the data economy and facilitates access to and use of data.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

This Regulation lays down harmonised rules on:
(a) making data generated by the use of connected products and related services accessible to the user of such products and services;
(b) making data available by data holders to data recipients;
(c) making data available by data holders to public sector bodies, the Commission, the European Central Bank, and Union bodies where there is an exceptional need;
(d) facilitating switching between data processing services;
(e) introducing safeguards against unlawful third-country government access to non-personal data held in the Union;
(f) developing interoperability standards for data to be accessed and transferred.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'data' means any digital representation of acts, facts or information and any compilation of such acts, facts or information, including in the form of sound, visual or audiovisual recording;
(2) 'connected product' means an item that obtains, generates or collects data concerning its use or environment and that is able to communicate product data via an electronic communications service;
(3) 'related service' means a digital service, including software, which is connected with the product at the time of the purchase, rent or lease in such a way that its absence would prevent the connected product from performing one or more of its functions;
(4) 'user' means a natural or legal person that owns, rents or leases a connected product, or receives a related service;
(5) 'data holder' means a natural or legal person that has the right or obligation, in accordance with this Regulation, applicable Union law or national legislation, to use and make available data.

CHAPTER II — BUSINESS-TO-CONSUMER AND BUSINESS-TO-BUSINESS DATA SHARING

Article 3 — Obligation to make data generated by the use of connected products accessible

1. Connected products shall be designed and manufactured, and related services shall be provided, in such a way that data generated by their use are, by default, easily, securely and, where relevant, directly accessible to the user.

2. Before concluding a contract for the purchase, rent, or lease of a connected product, the data holder shall provide the user with information including:
(a) the nature, volume and collection frequency of the product data;
(b) whether the data is continuously generated and how it can be accessed;
(c) the purposes for which the manufacturer uses the data and whether it shares data with any third parties.

Article 4 — Right of users to access and use data

1. The user shall have the right to access data generated by the use of the connected product or related service. The data holder shall make such data available to the user without undue delay, free of charge and in a comprehensive, structured, commonly used and machine-readable format.

Article 5 — Right to share data with third parties

1. Where a user requests a data holder to make data available to a third party, the data holder shall make the data available to the third party without undue delay, free of charge to the user, and of the same quality as is available to the data holder.

CHAPTER IV — UNFAIR CONTRACTUAL TERMS

Article 13 — Unfair contractual terms related to data access and use

1. A contractual term concerning the access to and use of data shall not be binding on an enterprise if it is unfair.

2. A contractual term shall be considered unfair if it grossly deviates from good commercial practice, contrary to good faith, and to the detriment of one party.

CHAPTER V — MAKING DATA AVAILABLE TO PUBLIC SECTOR BODIES

Article 14 — Obligation to make data available based on exceptional need

1. A public sector body shall demonstrate exceptional need to use the data requested, including:
(a) a public emergency;
(b) the need to respond to or recover from a public emergency;
(c) the lack of available data through other means.

CHAPTER VI — SWITCHING BETWEEN DATA PROCESSING SERVICES

Article 23 — Removing obstacles to effective switching

1. Providers of data processing services shall enable customers to switch to another data processing service. Switching charges shall be reduced to zero by 12 January 2027.

2. Providers shall support data portability and ensure functional equivalence for a transitional period of at least 30 days.

CHAPTER VII — FINAL PROVISIONS

Article 50 — Entry into force and application

This Regulation shall enter into force on the twentieth day following that of its publication. It shall apply from 12 September 2025.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 13 December 2023.`,
    last_updated: '2024-01-15',
  },
  {
    id: 'cyber-resilience-act',
    title: 'Regulation (EU) 2024/2847 on horizontal cybersecurity requirements for products with digital elements (Cyber Resilience Act)',
    short_title: 'Cyber Resilience Act',
    celex_number: '32024R2847',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2024-10-23',
    entry_into_force: '2024-12-10',
    summary: 'Introduces mandatory cybersecurity requirements for hardware and software products placed on the EU market. Requires manufacturers to ensure security throughout the product lifecycle, report actively exploited vulnerabilities, and provide security updates.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847',
    last_updated: '2024-12-15',
  },
  // ─── Trade ──────────────────────────────────────────────────────────────────
  {
    id: 'eu-uk-tca',
    title: 'Decision (EU) 2021/689 on the conclusion of the Trade and Cooperation Agreement between the EU and the UK',
    short_title: 'EU-UK Trade and Cooperation Agreement',
    celex_number: '32021D0689',
    document_type: 'decision',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2021-04-29',
    entry_into_force: '2021-05-01',
    summary: 'Governs the post-Brexit trade and cooperation relationship between the EU and the United Kingdom. Covers trade in goods and services, fisheries, law enforcement, and judicial cooperation. Includes provisions on level playing field commitments for environment, climate, and labour standards.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021D0689',
    last_updated: '2024-01-15',
  },
  // ─── Circular Economy ───────────────────────────────────────────────────────
  {
    id: 'batteries-regulation',
    title: 'Regulation (EU) 2023/1542 concerning batteries and waste batteries',
    short_title: 'Batteries Regulation',
    celex_number: '32023R1542',
    document_type: 'regulation',
    domain: 'circular_economy',
    status: 'in_force',
    adoption_date: '2023-07-12',
    entry_into_force: '2023-08-17',
    summary: 'Establishes comprehensive sustainability, safety, and labelling requirements for all batteries placed on the EU market. Mandates recycled-content targets, carbon footprint declarations, digital battery passports, and collection and recycling obligations across the full battery lifecycle.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542',
    full_text: `REGULATION (EU) 2023/1542 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 12 July 2023
concerning batteries and waste batteries, amending Directive 2008/98/EC and Regulation (EU) 2019/1020 and repealing Directive 2006/66/EC

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Batteries are a key enabler of the clean energy transition and the shift to zero-emission mobility. The EU's ambition of climate neutrality by 2050 and the European Green Deal require a comprehensive regulatory framework for batteries that covers their entire lifecycle.

(2) The current Directive 2006/66/EC on batteries and accumulators and waste batteries does not adequately address the environmental and social challenges of the rapidly growing battery market, particularly for electric vehicle batteries and energy storage systems.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter and scope

1. This Regulation establishes requirements for the sustainability, performance, safety, collection, recycling and second-life use of batteries, as well as for the information to be provided about batteries.

2. This Regulation applies to all batteries, namely portable batteries, light means of transport batteries, starting, lighting and ignition (SLI) batteries, industrial batteries, and electric vehicle batteries, regardless of their shape, volume, weight, design, material composition, chemistry, use or purpose.

Article 2 — Definitions

For the purposes of this Regulation:
(1) 'battery' means any device that converts chemical energy into electrical energy by an electrochemical reaction;
(2) 'electric vehicle battery' means any battery specifically designed to provide traction to electric vehicles, including battery electric vehicles and plug-in hybrid vehicles;
(3) 'battery passport' means an electronic record for each industrial battery and each electric vehicle battery placed on the market or put into service, containing specific information about the battery;
(4) 'carbon footprint' means the sum of greenhouse gas emissions and greenhouse gas removals in a product system, expressed as CO2 equivalents;
(5) 'state of health' means a measure of the general condition of a rechargeable battery and its ability to deliver the specified performance compared with its initial conditions.

CHAPTER II — SUSTAINABILITY AND SAFETY REQUIREMENTS

Article 7 — Carbon footprint of electric vehicle batteries and industrial batteries

1. Electric vehicle batteries and rechargeable industrial batteries shall be accompanied by a carbon footprint declaration, from 18 February 2025.

2. From 18 August 2026, each electric vehicle battery and rechargeable industrial battery shall bear a carbon footprint performance class label ranging from A (lowest footprint) to E (highest footprint).

3. From 18 February 2028, electric vehicle batteries and rechargeable industrial batteries shall comply with maximum lifecycle carbon footprint thresholds established by the Commission.

Article 8 — Recycled content

1. From 18 August 2031, industrial batteries, electric vehicle batteries and SLI batteries shall contain the following minimum shares of recycled content:
(a) 16% cobalt;
(b) 6% lithium;
(c) 6% nickel.

2. From 18 August 2036, those shares shall increase to:
(a) 26% cobalt;
(b) 12% lithium;
(c) 15% nickel.

Article 10 — Performance and durability

1. Portable batteries of general use shall comply with minimum electrochemical performance and durability requirements. From 18 August 2027, they shall achieve minimum average duration values.

2. Rechargeable industrial batteries and electric vehicle batteries shall be accompanied by technical documentation containing:
(a) the rated capacity and expected lifetime;
(b) the state of health at 80% of rated capacity;
(c) the number of charging and discharging cycles.

Article 11 — Removability and replaceability

1. Portable batteries incorporated in appliances shall be readily removable and replaceable by the end user at any time during the lifetime of the appliance.

2. This requirement shall apply from 18 February 2027.

CHAPTER III — LABELLING, MARKING AND INFORMATION

Article 13 — Labelling and marking

1. Batteries shall bear a label containing:
(a) the manufacturer's name and trademark;
(b) the battery type and chemistry;
(c) the capacity;
(d) the date of manufacture;
(e) a symbol indicating separate collection;
(f) a QR code linking to the battery passport.

Article 14 — Battery passport

1. From 18 February 2027, each industrial battery and each electric vehicle battery placed on the market shall have an electronic battery passport.

2. The battery passport shall contain:
(a) manufacturing information;
(b) sustainability information (carbon footprint, recycled content, due diligence);
(c) performance and durability information;
(d) information on the state of health of the battery;
(e) information on the composition and materials;
(f) end-of-life management information.

CHAPTER IV — DUE DILIGENCE

Article 39 — Due diligence policies for raw materials

1. Economic operators that place batteries on the market shall comply with due diligence obligations regarding the sourcing of raw materials (cobalt, natural graphite, lithium, nickel, and manganese).

2. The due diligence shall be consistent with the OECD Due Diligence Guidance for Responsible Supply Chains of Minerals from Conflict-Affected and High-Risk Areas.

CHAPTER V — WASTE MANAGEMENT

Article 55 — Collection targets for portable batteries

1. The following minimum collection rates for waste portable batteries shall apply:
(a) 45% by 31 December 2023;
(b) 63% by 31 December 2027;
(c) 73% by 31 December 2030.

Article 57 — Collection targets for waste light means of transport batteries

1. The following minimum collection rates shall apply:
(a) 51% by 31 December 2028;
(b) 61% by 31 December 2031.

Article 71 — Recycling efficiencies

1. The following minimum recycling efficiencies shall be achieved:
(a) recycling of 80% by average weight of lithium-ion batteries by 31 December 2025, increasing to 90% by 31 December 2030;
(b) recycling of 75% by average weight of lead-acid batteries by 31 December 2025;
(c) recycling of 80% by average weight of nickel-cadmium batteries by 31 December 2025.

Article 72 — Material recovery targets

1. The following minimum levels of materials recovery shall be achieved:
(a) 90% for cobalt by 31 December 2027, increasing to 95% by 31 December 2031;
(b) 90% for copper by 31 December 2027, increasing to 95% by 31 December 2031;
(c) 90% for nickel by 31 December 2027, increasing to 95% by 31 December 2031;
(d) 50% for lithium by 31 December 2027, increasing to 80% by 31 December 2031.

CHAPTER VI — FINAL PROVISIONS

Article 95 — Review

The Commission shall, by 31 December 2030, review this Regulation and assess the need to extend requirements to other battery chemistries and technologies.

Article 96 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 12 July 2023.`,
    last_updated: '2024-02-01',
  },
  {
    id: 'ecodesign-sustainable-products',
    title: 'Regulation (EU) 2024/1781 establishing a framework for setting ecodesign requirements for sustainable products',
    short_title: 'Ecodesign for Sustainable Products Regulation',
    celex_number: '32024R1781',
    document_type: 'regulation',
    domain: 'circular_economy',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-07-18',
    summary: 'Extends the ecodesign framework beyond energy-related products to cover nearly all physical goods on the EU market. Introduces digital product passports, bans on destruction of unsold goods, and sets requirements for durability, reparability, recyclability, and environmental footprint.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781',
    last_updated: '2024-07-20',
  },
  // ─── Agriculture ────────────────────────────────────────────────────────────
  {
    id: 'cap-strategic-plans',
    title: 'Regulation (EU) 2021/2115 establishing rules on support for strategic plans to be drawn up by Member States under the common agricultural policy (CAP Strategic Plans)',
    short_title: 'CAP Strategic Plans Regulation',
    celex_number: '32021R2115',
    document_type: 'regulation',
    domain: 'agriculture',
    status: 'in_force',
    adoption_date: '2021-12-02',
    entry_into_force: '2021-12-07',
    summary: 'Reforms the Common Agricultural Policy for 2023-2027 by requiring each Member State to submit a CAP Strategic Plan. Integrates enhanced environmental and climate conditionality, eco-schemes for farmers, and alignment with the European Green Deal objectives.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R2115',
    last_updated: '2024-01-15',
  },
  // ─── Health / Pharma ────────────────────────────────────────────────────────
  {
    id: 'ehds',
    title: 'Regulation (EU) 2025/327 on the European Health Data Space',
    short_title: 'European Health Data Space',
    celex_number: '32025R0327',
    document_type: 'regulation',
    domain: 'health',
    status: 'in_force',
    adoption_date: '2025-02-11',
    entry_into_force: '2025-03-26',
    summary: 'Establishes a common framework for the use and exchange of electronic health data across the EU. Empowers individuals to access and control their health data, enables secondary use for research and policy-making, and establishes interoperability and security requirements for health data infrastructure.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0327',
    last_updated: '2025-03-26',
  },
  // ─── Water & Environment ──────────────────────────────────────────────────
  {
    id: 'water-framework-directive',
    title: 'Directive 2000/60/EC establishing a framework for Community action in the field of water policy',
    short_title: 'Water Framework Directive',
    celex_number: '32000L0060',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2000-10-23',
    entry_into_force: '2000-12-22',
    summary: 'Establishes a comprehensive framework for the protection of inland surface waters, transitional waters, coastal waters, and groundwater across the EU. Requires Member States to achieve good ecological and chemical status for all water bodies through river basin management plans.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32000L0060',
    last_updated: '2024-01-15',
  },
  {
    id: 'marine-strategy-framework-directive',
    title: 'Directive 2008/56/EC establishing a framework for community action in the field of marine environmental policy',
    short_title: 'Marine Strategy Framework Directive',
    celex_number: '32008L0056',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2008-06-17',
    entry_into_force: '2008-07-15',
    summary: 'Requires Member States to achieve or maintain good environmental status in their marine waters by 2020 and to protect the marine environment. Establishes marine regions and requires development of marine strategies including assessment, targets, and monitoring programmes.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0056',
    last_updated: '2024-01-15',
  },
  {
    id: 'zero-pollution-action-plan',
    title: 'Communication COM(2021) 400 - Pathway to a Healthy Planet for All: EU Action Plan for Zero Pollution',
    short_title: 'Zero Pollution Action Plan',
    celex_number: '52021DC0400',
    document_type: 'communication',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2021-05-12',
    entry_into_force: null,
    summary: 'Sets a vision for reducing pollution to levels no longer harmful to health and the environment by 2050, with key 2030 targets to reduce air, water, and soil pollution. Integrates pollution prevention across all EU policies and proposes cross-cutting measures aligned with the Green Deal.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0400',
    last_updated: '2024-01-15',
  },
  {
    id: 'reach-regulation',
    title: 'Regulation (EC) No 1907/2006 concerning the Registration, Evaluation, Authorisation and Restriction of Chemicals (REACH)',
    short_title: 'REACH Regulation',
    celex_number: '32006R1907',
    document_type: 'regulation',
    domain: 'environment',
    status: 'amended',
    adoption_date: '2006-12-18',
    entry_into_force: '2007-06-01',
    summary: 'Establishes a comprehensive system for the registration, evaluation, authorisation, and restriction of chemicals in the EU. Places the burden of proof on industry to demonstrate chemical safety, managed by the European Chemicals Agency (ECHA). Covers approximately 30,000 chemical substances.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1907',
    last_updated: '2024-01-15',
  },
  {
    id: 'f-gas-regulation',
    title: 'Regulation (EU) 2024/573 on fluorinated greenhouse gases',
    short_title: 'F-Gas Regulation',
    celex_number: '32024R0573',
    document_type: 'regulation',
    domain: 'climate',
    status: 'in_force',
    adoption_date: '2024-02-07',
    entry_into_force: '2024-03-11',
    summary: 'Strengthens rules to reduce emissions of fluorinated greenhouse gases, which have very high global warming potential. Introduces a phase-down schedule aiming to cut HFC use by approximately 98% by 2050 (to 2.4% of baseline) and bans F-gases in certain new equipment such as refrigeration and air conditioning.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0573',
    full_text: `REGULATION (EU) 2024/573 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 7 February 2024
on fluorinated greenhouse gases, amending Directive (EU) 2019/1937 and repealing Regulation (EU) No 517/2014

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 192(1) thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Fluorinated greenhouse gases (F-gases) are potent greenhouse gases with a global warming potential (GWP) up to 25,000 times greater than CO2. They are primarily used in refrigeration, air conditioning, heat pumps, fire protection, and as insulation in electrical switchgear.

(2) The Kigali Amendment to the Montreal Protocol commits parties to phasing down the production and consumption of hydrofluorocarbons (HFCs) by more than 80% by 2047.

(3) This Regulation strengthens the EU's HFC phase-down, aligning it with the European Climate Law's objective of climate neutrality by 2050, and goes beyond the Kigali Amendment requirements.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Regulation lays down rules on the containment, use, recovery, and destruction of fluorinated greenhouse gases, and conditions on the placing on the market and related trade of specific products and equipment containing or relying on fluorinated greenhouse gases.

Article 2 — Scope

This Regulation applies to fluorinated greenhouse gases listed in Annexes I, II and III, including:
(a) hydrofluorocarbons (HFCs);
(b) perfluorocarbons (PFCs);
(c) sulphur hexafluoride (SF6);
(d) nitrogen trifluoride (NF3);
(e) other fluorinated greenhouse gases listed in Annex II.

Article 3 — Definitions

For the purposes of this Regulation:
(1) 'fluorinated greenhouse gases' means HFCs, PFCs, SF6, NF3 and other substances listed in Annexes I, II and III;
(2) 'global warming potential' or 'GWP' means the climatic warming potential of a greenhouse gas relative to that of CO2 over a 100-year time horizon;
(3) 'CO2 equivalent' means the quantity of greenhouse gas expressed as the product of its mass and its GWP;
(4) 'placing on the market' means supplying or making available to another party in the Union for the first time;
(5) 'hermetically sealed equipment' means equipment in which all F-gas containing parts are sealed by welding, brazing or a similar permanent connection, which may include capped valves or capped service ports that allow proper repair or disposal.

CHAPTER II — CONTAINMENT AND EMISSION REDUCTION

Article 4 — Prevention of emissions

1. The intentional release of fluorinated greenhouse gases into the atmosphere shall be prohibited where the release is not technically necessary for the intended use.

2. Operators of equipment that contains fluorinated greenhouse gases shall take precautions to prevent the unintentional release and shall take all measures which are technically and economically feasible to minimise leakage.

Article 5 — Leak checks

1. Operators of equipment that contains F-gases in quantities of 5 tonnes of CO2 equivalent or more shall ensure that the equipment is checked for leaks at the following intervals:
(a) equipment containing 5 to less than 50 tonnes CO2 equivalent: at least every 12 months;
(b) equipment containing 50 to less than 500 tonnes CO2 equivalent: at least every 6 months;
(c) equipment containing 500 tonnes CO2 equivalent or more: at least every 3 months.

2. Where a leak detection system is installed, the intervals in paragraph 1 shall be halved.

Article 8 — Recovery of F-gases

1. Operators of stationary equipment shall ensure that fluorinated greenhouse gases contained in such equipment are recovered by certified personnel prior to the final disposal of the equipment, and where possible during servicing and maintenance.

2. The recovered F-gases shall be recycled, reclaimed or destroyed.

CHAPTER III — PROHIBITIONS AND RESTRICTIONS

Article 11 — Prohibitions on placing on the market

1. The placing on the market of the products and equipment listed in Annex IV shall be prohibited from the dates specified in that Annex. Key prohibitions include:

(a) Domestic refrigerators and freezers containing HFCs with GWP of 150 or more: from 1 January 2015;
(b) Commercial stand-alone refrigeration equipment containing HFCs with GWP of 150 or more: from 1 January 2022;
(c) Stationary refrigeration equipment containing HFCs with GWP of 150 or more: from 1 January 2025 for new installations;
(d) Split air conditioning systems containing F-gases with GWP of 750 or more: from 1 January 2025;
(e) Self-contained air conditioning with GWP of 150 or more: from 1 January 2025;
(f) Monobloc heat pumps with F-gases of GWP 150 or more: from 1 January 2027;
(g) Split heat pumps with F-gases of GWP 750 or more: from 1 January 2027; with GWP 150 or more from 1 January 2032;
(h) New medium-voltage switchgear using SF6: from 1 January 2026; high-voltage from 1 January 2028;
(i) Foams containing F-gases with GWP of 150 or more: from 1 January 2025.

CHAPTER IV — HFC PHASE-DOWN

Article 16 — Phase-down of HFCs

1. The total quantity of HFCs placed on the market each year shall not exceed the maximum quantities set out in Annex VII, expressed in CO2 equivalents:
(a) 2025-2026: 42.8% of baseline;
(b) 2027-2029: 26.7% of baseline;
(c) 2030-2032: 14.3% of baseline;
(d) 2033-2035: 8.1% of baseline;
(e) 2036-2038: 5.2% of baseline;
(f) 2039-2041: 4.3% of baseline;
(g) 2042-2044: 3.8% of baseline;
(h) 2045-2047: 3.3% of baseline;
(i) 2048-2049: 2.8% of baseline;
(j) from 2050: 2.4% of baseline (effectively a 97.6% phase-down).

2. The phase-down shall be implemented through a quota system. The Commission shall allocate quotas to producers and importers.

CHAPTER V — CERTIFICATION AND TRAINING

Article 10 — Certification

1. Personnel carrying out activities including installation, servicing, maintenance, repair, or decommissioning of equipment containing F-gases shall hold relevant certificates.

2. Member States shall establish certification programmes based on minimum requirements.

CHAPTER VI — REPORTING AND FINAL PROVISIONS

Article 26 — Reporting

1. Producers, importers and exporters of F-gases shall submit annual reports to the Commission including:
(a) the quantities of each F-gas produced, imported and exported;
(b) the quantities recycled, reclaimed or destroyed;
(c) the stocks at the end of the reporting period.

Article 34 — Review

The Commission shall, by 1 January 2030, review this Regulation and assess the feasibility of further strengthening the phase-down schedule.

Article 37 — Entry into force

This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. It shall apply from 11 March 2024.

This Regulation shall be binding in its entirety and directly applicable in all Member States.

Done at Strasbourg, 7 February 2024.`,
    last_updated: '2024-03-15',
  },
  // ─── Waste & Circular Economy ─────────────────────────────────────────────
  {
    id: 'waste-framework-directive',
    title: 'Directive 2008/98/EC on waste (Waste Framework Directive)',
    short_title: 'Waste Framework Directive',
    celex_number: '32008L0098',
    document_type: 'directive',
    domain: 'circular_economy',
    status: 'amended',
    adoption_date: '2008-11-19',
    entry_into_force: '2008-12-12',
    summary: 'Establishes the fundamental concepts and definitions for EU waste management, including the waste hierarchy (prevention, reuse, recycling, recovery, disposal). Sets recycling targets and requires Member States to adopt waste management plans and prevention programmes.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0098',
    last_updated: '2024-01-15',
  },
  {
    id: 'single-use-plastics-directive',
    title: 'Directive (EU) 2019/904 on the reduction of the impact of certain plastic products on the environment',
    short_title: 'Single-Use Plastics Directive',
    celex_number: '32019L0904',
    document_type: 'directive',
    domain: 'circular_economy',
    status: 'in_force',
    adoption_date: '2019-06-05',
    entry_into_force: '2019-07-02',
    summary: 'Bans the ten most common single-use plastic items found on European beaches, including cutlery, plates, straws, and expanded polystyrene containers. Introduces consumption reduction targets, extended producer responsibility schemes, and collection targets for plastic bottles.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L0904',
    last_updated: '2024-01-15',
  },
  {
    id: 'packaging-waste-regulation',
    title: 'Regulation (EU) 2025/40 on packaging and packaging waste',
    short_title: 'Packaging and Packaging Waste Regulation',
    celex_number: '32025R0040',
    document_type: 'regulation',
    domain: 'circular_economy',
    status: 'in_force',
    adoption_date: '2025-01-16',
    entry_into_force: '2025-02-11',
    summary: 'Replaces the existing Packaging Directive with directly applicable rules to reduce packaging waste. Sets binding reuse and refill targets, restricts unnecessary packaging, requires all packaging to be recyclable by 2030, and mandates minimum recycled content for plastic packaging.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040',
    last_updated: '2025-02-15',
  },
  // ─── Security & Defence ───────────────────────────────────────────────────
  {
    id: 'nis2-directive',
    title: 'Directive (EU) 2022/2555 on measures for a high common level of cybersecurity across the Union (NIS2)',
    short_title: 'NIS2 Directive',
    celex_number: '32022L2555',
    document_type: 'directive',
    domain: 'security',
    status: 'in_force',
    adoption_date: '2022-12-14',
    entry_into_force: '2023-01-16',
    summary: 'Replaces the original NIS Directive to strengthen cybersecurity requirements across the EU. Expands the scope to cover more sectors and entities, introduces harmonised security and incident reporting obligations, and establishes stronger enforcement and cooperation mechanisms.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555',
    last_updated: '2024-01-15',
  },
  {
    id: 'dora-regulation',
    title: 'Regulation (EU) 2022/2554 on digital operational resilience for the financial sector (DORA)',
    short_title: 'DORA (Digital Operational Resilience Act)',
    celex_number: '32022R2554',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2022-12-14',
    entry_into_force: '2023-01-16',
    summary: 'Establishes uniform requirements for the security of network and information systems of financial entities, including banks, insurers, and investment firms. Requires ICT risk management frameworks, incident reporting, digital operational resilience testing, and oversight of critical third-party ICT providers.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554',
    last_updated: '2024-01-15',
  },
  {
    id: 'european-defence-industrial-strategy',
    title: 'Joint Communication JOIN(2024) 10 - A new European Defence Industrial Strategy',
    short_title: 'European Defence Industrial Strategy',
    celex_number: '52024JC0010',
    document_type: 'communication',
    domain: 'security',
    status: 'in_force',
    adoption_date: '2024-03-05',
    entry_into_force: null,
    summary: 'Sets out the EU strategy to strengthen the European defence technological and industrial base. Proposes measures to boost defence investment, enhance procurement cooperation among Member States, and ensure the EU defence industry can meet emerging security challenges.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024JC0010',
    last_updated: '2024-03-15',
  },
  // ─── Space ────────────────────────────────────────────────────────────────
  {
    id: 'eu-space-programme',
    title: 'Regulation (EU) 2021/696 establishing the Union Space Programme',
    short_title: 'EU Space Programme Regulation',
    celex_number: '32021R0696',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2021-04-28',
    entry_into_force: '2021-05-12',
    summary: 'Establishes the EU Space Programme for 2021-2027, consolidating Galileo (navigation), Copernicus (Earth observation), and EGNOS under a single framework. Provides EUR 14.8 billion in funding and strengthens the EU Agency for the Space Programme (EUSPA).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0696',
    last_updated: '2024-01-15',
  },
  // ─── Trade & Foreign Policy ───────────────────────────────────────────────
  {
    id: 'foreign-subsidies-regulation',
    title: 'Regulation (EU) 2022/2560 on foreign subsidies distorting the internal market',
    short_title: 'Foreign Subsidies Regulation',
    celex_number: '32022R2560',
    document_type: 'regulation',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2022-12-14',
    entry_into_force: '2023-01-12',
    summary: 'Empowers the Commission to investigate and address distortive subsidies granted by non-EU countries to companies operating in the EU internal market. Introduces notification obligations for large concentrations and public procurement bids involving foreign financial contributions.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2560',
    last_updated: '2024-01-15',
  },
  {
    id: 'anti-coercion-instrument',
    title: 'Regulation (EU) 2023/2675 on the protection of the Union and its Member States from economic coercion by third countries',
    short_title: 'Anti-Coercion Instrument',
    celex_number: '32023R2675',
    document_type: 'regulation',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2023-11-22',
    entry_into_force: '2023-12-27',
    summary: 'Provides the EU with a tool to deter and respond to economic coercion by third countries seeking to influence EU or Member State policy choices. Establishes a graduated response mechanism ranging from dialogue to countermeasures such as trade restrictions.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2675',
    last_updated: '2024-01-15',
  },
  {
    id: 'csddd',
    title: 'Directive (EU) 2024/1760 on corporate sustainability due diligence',
    short_title: 'Corporate Sustainability Due Diligence Directive (CSDDD)',
    celex_number: '32024L1760',
    document_type: 'directive',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-07-25',
    summary: 'Requires large companies to identify, prevent, mitigate, and account for adverse human rights and environmental impacts in their operations and value chains. Obliges companies to adopt climate transition plans aligned with the Paris Agreement 1.5 degree C objective.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1760',
    full_text: `DIRECTIVE (EU) 2024/1760 OF THE EUROPEAN PARLIAMENT AND OF THE COUNCIL
of 13 June 2024
on corporate sustainability due diligence and amending Directive (EU) 2019/1937 and Regulation (EU) 2023/2859

THE EUROPEAN PARLIAMENT AND THE COUNCIL OF THE EUROPEAN UNION,

Having regard to the Treaty on the Functioning of the European Union, and in particular Article 50(1), Article 50(2)(g) and Article 114 thereof,

Acting in accordance with the ordinary legislative procedure,

Whereas:

(1) Companies have a key role in building a sustainable economy and society. They should be required to identify, prevent, bring to an end and mitigate the principal adverse impacts on human rights and the environment connected to their operations, subsidiaries and value chains.

(2) Several international frameworks call on companies to exercise due diligence, including the UN Guiding Principles on Business and Human Rights, the OECD Guidelines for Multinational Enterprises, and the ILO Declaration on Fundamental Principles and Rights at Work.

(3) Climate change is one of the most pressing challenges, and companies have an important role to play in the transition to a climate-neutral economy. They should be required to adopt and implement climate transition plans.

CHAPTER I — GENERAL PROVISIONS

Article 1 — Subject matter

This Directive lays down rules on:
(a) obligations for companies regarding actual and potential adverse human rights impacts and adverse environmental impacts, with respect to their own operations, the operations of their subsidiaries, and the operations carried out by their business partners in the chains of activities of those companies;
(b) liability for violations of the obligations in point (a);
(c) the obligation of companies to adopt and put into effect a climate transition plan.

Article 2 — Scope

1. This Directive applies to companies that meet the following criteria:

(a) EU companies with:
(i) more than 1,000 employees on average; and
(ii) a worldwide net turnover of more than EUR 450 million.
Application: from 26 July 2027.

(b) Non-EU companies with:
(i) a net turnover generated in the Union of more than EUR 450 million.
Application: from 26 July 2029.

2. Approximately 5,500 EU companies and 900 non-EU companies will be covered.

Article 3 — Definitions

For the purposes of this Directive:
(1) 'adverse environmental impact' means an adverse impact on the environment resulting from the violation of one of the prohibitions and obligations listed in the Annex, Part II;
(2) 'adverse human rights impact' means an adverse impact on protected persons resulting from the violation of one of the rights or prohibitions listed in the Annex, Part I;
(3) 'chain of activities' means the activities of a company's upstream business partners related to the production of goods or the provision of services by the company, and the activities of the company's downstream business partners related to the distribution, transport and storage of the product;
(4) 'business partner' means an entity with whom the company has a commercial agreement related to the operations, products or services of the company;
(5) 'climate transition plan' means a plan for climate change mitigation which aims to ensure, through best efforts, that the business model and strategy of the company are compatible with the transition to a sustainable economy and with the limiting of global warming to 1.5°C in line with the Paris Agreement.

CHAPTER II — DUE DILIGENCE

Article 5 — Due diligence

1. Member States shall ensure that companies conduct human rights and environmental due diligence by carrying out the actions set out in Articles 7 to 16.

Article 7 — Integration into policies

1. Companies shall integrate due diligence into all their relevant policies and risk management systems.

2. The due diligence policy shall contain:
(a) a description of the company's approach to due diligence;
(b) a code of conduct describing the rules and principles to be followed;
(c) a description of the processes put in place to implement due diligence, including the measures taken to verify compliance with the code of conduct and to extend its application to established business partners.

Article 8 — Identifying adverse impacts

1. Companies shall take appropriate measures to identify actual and potential adverse human rights impacts and adverse environmental impacts arising from their own operations, those of their subsidiaries and those of their business partners in their chains of activities.

2. For the purposes of identifying the adverse impacts, companies shall, based on appropriate quantitative and qualitative information, carry out:
(a) a mapping of the company's own operations, those of its subsidiaries and business partners, to identify general areas where adverse impacts are most likely to occur;
(b) an in-depth assessment of the operations, subsidiaries and business partners identified in the mapping, taking into account the severity and likelihood of the impacts.

Article 10 — Preventing potential adverse impacts

1. Companies shall take appropriate measures to prevent, or where prevention is not possible or not immediately possible, adequately mitigate potential adverse human rights impacts and potential adverse environmental impacts that have been, or should have been, identified.

Article 11 — Bringing actual adverse impacts to an end

1. Companies shall take appropriate measures to bring actual adverse impacts that have been, or should have been, identified to an end, and where this is not possible, to minimise the extent of such impacts.

CHAPTER III — CLIMATE TRANSITION PLANS

Article 22 — Climate transition plans

1. Member States shall ensure that companies adopt and put into effect a transition plan for climate change mitigation which aims to ensure, through best efforts, that the business model and strategy of the company are compatible with the transition to a sustainable economy and with the limiting of global warming to 1.5°C in line with the Paris Agreement and the objective of achieving climate neutrality by 2050.

2. The plan shall include:
(a) time-bound targets related to climate change for 2030 and in five-year steps up to 2050, based on conclusive scientific evidence and, where appropriate, absolute emission reduction targets for Scope 1, 2 and 3 greenhouse gas emissions;
(b) a description of identified decarbonisation levers and planned key actions to reach the targets, including changes in the company's product and service portfolio and adoption of new technologies;
(c) an explanation and quantification of the investments and funding supporting the implementation of the transition plan;
(d) a description of the role of the administrative, management and supervisory bodies with regard to the transition plan.

3. The company shall update its plan every 12 months.

CHAPTER IV — CIVIL LIABILITY

Article 29 — Civil liability

1. Member States shall ensure that a company is liable for damages to a natural or legal person, provided that:
(a) the company intentionally or negligently failed to comply with its due diligence obligations under Articles 7 to 16;
(b) as a result of that failure, an adverse impact that should have been identified, prevented, mitigated, brought to an end or its extent minimised through the appropriate measures occurred and led to damage to the natural or legal person's legal interest.

2. A company shall not be liable if the damage was caused only by its business partners in its chain of activities.

CHAPTER V — SUPERVISORY AUTHORITY AND PENALTIES

Article 24 — Supervisory authorities

1. Each Member State shall designate one or more supervisory authorities to supervise compliance with the obligations laid down in this Directive.

Article 27 — Penalties

1. Member States shall lay down rules on the penalties applicable for infringements of national provisions adopted pursuant to this Directive. Penalties shall be effective, proportionate and dissuasive.

2. Pecuniary penalties shall be based on the company's worldwide net turnover and shall be at least 5% of the net worldwide turnover of the company.

CHAPTER VI — FINAL PROVISIONS

Article 37 — Transposition

Member States shall adopt and publish the laws, regulations and administrative provisions necessary to comply with this Directive by 26 July 2026.

Article 39 — Entry into force

This Directive shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union.

This Directive is addressed to the Member States.

Done at Brussels, 13 June 2024.`,
    last_updated: '2024-08-01',
  },
  // ─── Mobility & Transport ─────────────────────────────────────────────────
  {
    id: 'ten-t-regulation',
    title: 'Regulation (EU) 2024/1679 on Union guidelines for the development of the trans-European transport network (TEN-T)',
    short_title: 'TEN-T Regulation',
    celex_number: '32024R1679',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-07-17',
    summary: 'Revises the framework for the trans-European transport network, setting deadlines for completing the core network by 2030 and extended core by 2040. Introduces new infrastructure requirements for rail, inland waterways, and multimodal terminals to support sustainable mobility.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1679',
    last_updated: '2024-07-20',
  },
  {
    id: 'co2-hdv-regulation',
    title: 'Regulation (EU) 2019/1242 setting CO2 emission performance standards for new heavy-duty vehicles, as amended by Regulation (EU) 2024/1610',
    short_title: 'CO2 Standards for Heavy-Duty Vehicles',
    celex_number: '32024R1610',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2024-05-14',
    entry_into_force: '2024-06-26',
    summary: 'Sets CO2 emission reduction targets for new heavy-duty vehicles: -45% by 2030, -65% by 2035, and -90% by 2040 versus 2019 reference levels. Requires 90% zero-emission urban buses by 2030 and 100% from 2035.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1610',
    last_updated: '2024-07-11',
  },
  {
    id: 'euro-7-regulation',
    title: 'Regulation (EU) 2024/1257 on type-approval of motor vehicles and engines with respect to their emissions (Euro 7)',
    short_title: 'Euro 7 Regulation',
    celex_number: '32024R1257',
    document_type: 'regulation',
    domain: 'transport',
    status: 'in_force',
    adoption_date: '2024-04-24',
    entry_into_force: '2024-05-20',
    summary: 'Sets updated emission limits for pollutants from cars, vans, buses, trucks, and trailers, including stricter standards for NOx, particulate matter, and brake particle emissions. Introduces battery durability requirements for electric vehicles and tyre abrasion limits.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1257',
    last_updated: '2024-06-01',
  },
  // ─── Research & Innovation ────────────────────────────────────────────────
  {
    id: 'horizon-europe',
    title: 'Regulation (EU) 2021/695 establishing Horizon Europe, the Framework Programme for Research and Innovation',
    short_title: 'Horizon Europe',
    celex_number: '32021R0695',
    document_type: 'regulation',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2021-04-28',
    entry_into_force: '2021-05-12',
    summary: 'Establishes Horizon Europe, the EU research and innovation framework programme for 2021-2027 with a budget of EUR 95.5 billion. Supports basic research through the European Research Council, funds collaborative research missions on climate, health, and digital, and promotes innovation through the European Innovation Council.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0695',
    last_updated: '2024-01-15',
  },
  // ─── Social & Labour ──────────────────────────────────────────────────────
  {
    id: 'social-rights-action-plan',
    title: 'Communication COM(2021) 102 - European Pillar of Social Rights Action Plan',
    short_title: 'European Pillar of Social Rights Action Plan',
    celex_number: '52021DC0102',
    document_type: 'communication',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2021-03-04',
    entry_into_force: null,
    summary: 'Sets concrete targets for 2030 on employment (78%), skills (60% of adults in training), and social protection (15 million fewer people at risk of poverty). Turns the 20 principles of the European Pillar of Social Rights into actions to ensure a fair green and digital transition.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0102',
    last_updated: '2024-01-15',
  },
  {
    id: 'platform-workers-directive',
    title: 'Directive (EU) 2024/2831 on improving working conditions in platform work',
    short_title: 'Platform Workers Directive',
    celex_number: '32024L2831',
    document_type: 'directive',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2024-10-14',
    entry_into_force: '2024-12-01',
    summary: 'Establishes rules to improve working conditions for people working through digital labour platforms. Introduces a legal presumption of employment to combat bogus self-employment, and regulates the use of algorithmic management to ensure transparency, human oversight, and the right to contest automated decisions.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L2831',
    last_updated: '2024-12-15',
  },
  // ─── Semiconductor & Tech ─────────────────────────────────────────────────
  {
    id: 'european-chips-act',
    title: 'Regulation (EU) 2023/1781 establishing a framework of measures for strengthening Europe\'s semiconductor ecosystem (Chips Act)',
    short_title: 'European Chips Act',
    celex_number: '32023R1781',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2023-09-13',
    entry_into_force: '2023-09-21',
    summary: 'Aims to strengthen the EU semiconductor ecosystem by mobilising over EUR 43 billion in public and private investment. Supports research and innovation in advanced chip design, establishes a framework for first-of-a-kind production facilities, and creates a monitoring and crisis response mechanism for supply disruptions.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1781',
    last_updated: '2024-01-15',
  },
  {
    id: 'gdpr',
    title: 'Regulation (EU) 2016/679 on the protection of natural persons with regard to the processing of personal data (GDPR)',
    short_title: 'General Data Protection Regulation (GDPR)',
    celex_number: '32016R0679',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2016-04-27',
    entry_into_force: '2018-05-25',
    summary: 'Establishes comprehensive data protection rules for the EU, giving individuals control over their personal data. Sets requirements for consent, data processing, breach notification, and cross-border data transfers, with fines up to 4% of global annual turnover.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679',
    last_updated: '2024-01-15',
  },
  {
    id: 'eprivacy-directive',
    title: 'Directive 2002/58/EC concerning the processing of personal data and the protection of privacy in the electronic communications sector',
    short_title: 'ePrivacy Directive',
    celex_number: '32002L0058',
    document_type: 'directive',
    domain: 'digital',
    status: 'amended',
    adoption_date: '2002-07-12',
    entry_into_force: '2002-07-31',
    summary: 'Regulates privacy in electronic communications, covering confidentiality of communications, cookies and tracking, unsolicited marketing, and traffic/location data. Complements GDPR with sector-specific rules for telecoms and internet services.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058',
    last_updated: '2024-01-15',
  },
  {
    id: 'mica-regulation',
    title: 'Regulation (EU) 2023/1114 on markets in crypto-assets (MiCA)',
    short_title: 'MiCA (Markets in Crypto-Assets)',
    celex_number: '32023R1114',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2023-05-31',
    entry_into_force: '2024-12-30',
    summary: 'Creates a comprehensive regulatory framework for crypto-assets, stablecoins, and crypto-asset service providers in the EU. Establishes rules for issuance, trading, and custody of crypto-assets, with specific provisions for asset-referenced and e-money tokens.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114',
    last_updated: '2024-12-15',
  },
  {
    id: 'psd2-directive',
    title: 'Directive (EU) 2015/2366 on payment services in the internal market (PSD2)',
    short_title: 'Payment Services Directive (PSD2)',
    celex_number: '32015L2366',
    document_type: 'directive',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2015-11-25',
    entry_into_force: '2018-01-13',
    summary: 'Modernises EU payment services regulation, enabling open banking by requiring banks to grant third-party providers access to customer accounts. Introduces strong customer authentication requirements and reduces fraud in electronic payments.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366',
    last_updated: '2024-01-15',
  },
  {
    id: 'mifid2-directive',
    title: 'Directive 2014/65/EU on markets in financial instruments (MiFID II)',
    short_title: 'MiFID II',
    celex_number: '32014L0065',
    document_type: 'directive',
    domain: 'finance',
    status: 'amended',
    adoption_date: '2014-05-15',
    entry_into_force: '2018-01-03',
    summary: 'Comprehensive regulation of EU financial markets, covering investment services, trading venues, and investor protection. Strengthens transparency requirements, introduces rules for algorithmic trading, and sets conduct of business standards for financial intermediaries.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0065',
    last_updated: '2024-01-15',
  },
  {
    id: 'solvency2-directive',
    title: 'Directive 2009/138/EC on the taking-up and pursuit of the business of Insurance and Reinsurance (Solvency II)',
    short_title: 'Solvency II',
    celex_number: '32009L0138',
    document_type: 'directive',
    domain: 'finance',
    status: 'amended',
    adoption_date: '2009-11-25',
    entry_into_force: '2016-01-01',
    summary: 'Harmonises EU insurance regulation, introducing risk-based capital requirements for insurers and reinsurers. Establishes a three-pillar framework covering quantitative capital requirements, governance and supervision, and disclosure and transparency.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0138',
    last_updated: '2024-01-15',
  },
  {
    id: 'crr-regulation',
    title: 'Regulation (EU) No 575/2013 on prudential requirements for credit institutions (CRR)',
    short_title: 'Capital Requirements Regulation (CRR)',
    celex_number: '32013R0575',
    document_type: 'regulation',
    domain: 'finance',
    status: 'amended',
    adoption_date: '2013-06-26',
    entry_into_force: '2014-01-01',
    summary: 'Sets prudential requirements for banks and investment firms, including minimum capital ratios, liquidity coverage, and leverage limits. Implements Basel III standards in EU law and establishes a single rulebook for banking supervision.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32013R0575',
    last_updated: '2024-01-15',
  },
  {
    id: 'green-bonds-regulation',
    title: 'Regulation (EU) 2023/2631 on European Green Bonds',
    short_title: 'European Green Bonds Regulation',
    celex_number: '32023R2631',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2023-11-22',
    entry_into_force: '2024-12-21',
    summary: 'Creates a voluntary European Green Bond Standard (EuGBS) aligned with the EU Taxonomy. Requires issuers to allocate proceeds to Taxonomy-aligned economic activities, submit to external review, and report on allocation and environmental impact.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2631',
    last_updated: '2024-12-15',
  },
  {
    id: 'aml-regulation',
    title: 'Regulation (EU) 2024/1624 on the prevention of the use of the financial system for money laundering or terrorist financing',
    short_title: 'Anti-Money Laundering Regulation',
    celex_number: '32024R1624',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2024-05-31',
    entry_into_force: '2027-07-10',
    summary: 'Establishes a single EU AML/CFT rulebook replacing the existing directive-based framework. Sets directly applicable rules on customer due diligence, beneficial ownership transparency, cash payment limits, and creates the EU Anti-Money Laundering Authority (AMLA).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1624',
    last_updated: '2024-06-15',
  },
  {
    id: 'instant-payments-regulation',
    title: 'Regulation (EU) 2024/886 on instant credit transfers in euro',
    short_title: 'Instant Payments Regulation',
    celex_number: '32024R0886',
    document_type: 'regulation',
    domain: 'finance',
    status: 'in_force',
    adoption_date: '2024-02-26',
    entry_into_force: '2024-04-08',
    summary: 'Requires all EU payment service providers offering credit transfers in euro to also offer instant credit transfers at the same price. Mandates processing within 10 seconds, verification of payee matching, and sanctions screening capabilities.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0886',
    last_updated: '2024-04-15',
  },
  {
    id: 'habitats-directive',
    title: 'Council Directive 92/43/EEC on the conservation of natural habitats and of wild fauna and flora',
    short_title: 'Habitats Directive',
    celex_number: '31992L0043',
    document_type: 'directive',
    domain: 'environment',
    status: 'amended',
    adoption_date: '1992-05-21',
    entry_into_force: '1992-06-10',
    summary: 'Cornerstone of EU nature conservation policy. Establishes the Natura 2000 network of protected sites, requires conservation of over 200 habitat types and 1,000 species, and mandates appropriate assessments for plans affecting Natura 2000 sites.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31992L0043',
    last_updated: '2024-01-15',
  },
  {
    id: 'birds-directive',
    title: 'Directive 2009/147/EC on the conservation of wild birds',
    short_title: 'Birds Directive',
    celex_number: '32009L0147',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2009-11-30',
    entry_into_force: '2010-02-15',
    summary: 'Protects all wild bird species in the EU, their eggs, nests, and habitats. Requires Member States to designate Special Protection Areas (SPAs) as part of the Natura 2000 network and to maintain populations at ecologically sustainable levels.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0147',
    last_updated: '2024-01-15',
  },
  {
    id: 'eia-directive',
    title: 'Directive 2011/92/EU on the assessment of the effects of certain public and private projects on the environment (EIA)',
    short_title: 'Environmental Impact Assessment Directive',
    celex_number: '32011L0092',
    document_type: 'directive',
    domain: 'environment',
    status: 'amended',
    adoption_date: '2011-12-13',
    entry_into_force: '2012-02-17',
    summary: 'Requires environmental impact assessments for public and private projects likely to have significant effects on the environment. Covers infrastructure, energy, waste, and industrial projects, ensuring public participation in decision-making.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0092',
    last_updated: '2024-01-15',
  },
  {
    id: 'air-quality-directive',
    title: 'Directive (EU) 2024/2881 on ambient air quality and cleaner air for Europe',
    short_title: 'Air Quality Directive (recast)',
    celex_number: '32024L2881',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2024-10-23',
    entry_into_force: '2024-12-11',
    summary: 'Revises EU air quality standards, aligning more closely with WHO guidelines. Sets stricter limits for PM2.5, NO2, and other pollutants, introduces stronger monitoring requirements, and grants citizens the right to compensation for health damage from air pollution violations.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L2881',
    last_updated: '2024-12-15',
  },
  {
    id: 'drinking-water-directive',
    title: 'Directive (EU) 2020/2184 on the quality of water intended for human consumption (recast)',
    short_title: 'Drinking Water Directive',
    celex_number: '32020L2184',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2020-12-16',
    entry_into_force: '2021-01-12',
    summary: 'Updates quality standards for drinking water, adding new parameters for PFAS, microplastics, and endocrine disruptors. Introduces a risk-based approach to monitoring, improves access to drinking water for vulnerable groups, and promotes tap water use to reduce plastic waste.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020L2184',
    last_updated: '2024-01-15',
  },
  {
    id: 'medical-devices-regulation',
    title: 'Regulation (EU) 2017/745 on medical devices',
    short_title: 'Medical Devices Regulation (MDR)',
    celex_number: '32017R0745',
    document_type: 'regulation',
    domain: 'health',
    status: 'in_force',
    adoption_date: '2017-04-05',
    entry_into_force: '2021-05-26',
    summary: 'Overhauls the regulatory framework for medical devices in the EU. Strengthens pre-market scrutiny through stricter conformity assessments, introduces a unique device identification system, and enhances post-market surveillance including a comprehensive EU database (EUDAMED).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0745',
    last_updated: '2024-01-15',
  },
  {
    id: 'clinical-trials-regulation',
    title: 'Regulation (EU) No 536/2014 on clinical trials on medicinal products for human use',
    short_title: 'Clinical Trials Regulation',
    celex_number: '32014R0536',
    document_type: 'regulation',
    domain: 'health',
    status: 'in_force',
    adoption_date: '2014-04-16',
    entry_into_force: '2022-01-31',
    summary: 'Streamlines the process for conducting clinical trials across EU Member States through a single portal and harmonised assessment procedure. Strengthens transparency by requiring results to be published and improves protections for trial participants.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0536',
    last_updated: '2024-01-15',
  },
  {
    id: 'general-food-law',
    title: 'Regulation (EC) No 178/2002 laying down the general principles and requirements of food law',
    short_title: 'General Food Law',
    celex_number: '32002R0178',
    document_type: 'regulation',
    domain: 'agriculture',
    status: 'amended',
    adoption_date: '2002-01-28',
    entry_into_force: '2002-02-21',
    summary: 'Establishes the general principles of EU food law and the European Food Safety Authority (EFSA). Introduces traceability requirements, the precautionary principle for food safety, and the rapid alert system for food and feed (RASFF).',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002R0178',
    last_updated: '2024-01-15',
  },
  {
    id: 'organic-farming-regulation',
    title: 'Regulation (EU) 2018/848 on organic production and labelling of organic products',
    short_title: 'Organic Farming Regulation',
    celex_number: '32018R0848',
    document_type: 'regulation',
    domain: 'agriculture',
    status: 'in_force',
    adoption_date: '2018-05-30',
    entry_into_force: '2022-01-01',
    summary: 'Modernises EU rules on organic farming, extending to new products like salt and cork. Strengthens production rules, introduces group certification for smallholders, harmonises import requirements, and tightens controls against fraud in organic labelling.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0848',
    last_updated: '2024-01-15',
  },
  {
    id: 'product-safety-regulation',
    title: 'Regulation (EU) 2023/988 on general product safety',
    short_title: 'General Product Safety Regulation',
    celex_number: '32023R0988',
    document_type: 'regulation',
    domain: 'consumer',
    status: 'in_force',
    adoption_date: '2023-05-10',
    entry_into_force: '2024-12-13',
    summary: 'Modernises EU product safety rules for the digital age, covering online marketplaces and AI-enabled products. Strengthens market surveillance, introduces product recalls via Safety Gate portal, and requires economic operators to ensure product traceability.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0988',
    last_updated: '2024-12-15',
  },
  {
    id: 'asylum-procedures-regulation',
    title: 'Regulation (EU) 2024/1348 establishing a common procedure for international protection',
    short_title: 'Asylum Procedures Regulation',
    celex_number: '32024R1348',
    document_type: 'regulation',
    domain: 'migration',
    status: 'in_force',
    adoption_date: '2024-05-14',
    entry_into_force: '2026-06-12',
    summary: 'Establishes a unified asylum procedure across all EU Member States, replacing the varied national systems. Introduces mandatory border procedures for applicants from countries with low recognition rates, sets binding processing deadlines, and harmonises rules on safe third countries.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1348',
    last_updated: '2024-06-15',
  },
  {
    id: 'return-directive',
    title: 'Directive 2008/115/EC on common standards and procedures for returning illegally staying third-country nationals',
    short_title: 'Return Directive',
    celex_number: '32008L0115',
    document_type: 'directive',
    domain: 'migration',
    status: 'in_force',
    adoption_date: '2008-12-16',
    entry_into_force: '2010-12-24',
    summary: 'Sets common EU standards for the return of irregular migrants, including voluntary departure periods, entry bans, and conditions for detention. Establishes procedural safeguards and limits on use of coercive measures during removal.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0115',
    last_updated: '2024-01-15',
  },
  {
    id: 'erasmus-plus',
    title: 'Regulation (EU) 2021/817 establishing Erasmus+, the Union programme for education, training, youth and sport',
    short_title: 'Erasmus+ Regulation',
    celex_number: '32021R0817',
    document_type: 'regulation',
    domain: 'education',
    status: 'in_force',
    adoption_date: '2021-05-20',
    entry_into_force: '2021-05-28',
    summary: 'Establishes the Erasmus+ programme for 2021-2027 with EUR 26.2 billion budget. Supports mobility of students, teachers, and trainees across Europe, funds cooperation projects between educational institutions, and promotes EU identity through youth exchanges and sport activities.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0817',
    last_updated: '2024-01-15',
  },
  {
    id: 'eecc-directive',
    title: 'Directive (EU) 2018/1972 establishing the European Electronic Communications Code',
    short_title: 'European Electronic Communications Code',
    celex_number: '32018L1972',
    document_type: 'directive',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2018-12-11',
    entry_into_force: '2020-12-21',
    summary: 'Consolidates and updates EU telecom rules, covering spectrum management, network access, universal service, and consumer rights. Promotes investment in very high capacity networks (fibre, 5G), strengthens BEREC powers, and harmonises end-user protection across Member States.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L1972',
    last_updated: '2024-01-15',
  },
  {
    id: 'electricity-market-regulation',
    title: 'Regulation (EU) 2024/1747 amending Regulations on the internal market for electricity',
    short_title: 'Electricity Market Reform',
    celex_number: '32024R1747',
    document_type: 'regulation',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2024-06-13',
    entry_into_force: '2024-07-16',
    summary: 'Reforms EU electricity market design to better integrate renewables and protect consumers from price volatility. Introduces two-way contracts for difference (CfDs) for public support, enables power purchase agreements (PPAs), and creates mechanisms for demand response and energy sharing.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1747',
    last_updated: '2024-07-15',
  },
  {
    id: 'european-defence-fund',
    title: 'Regulation (EU) 2021/697 establishing the European Defence Fund',
    short_title: 'European Defence Fund',
    celex_number: '32021R0697',
    document_type: 'regulation',
    domain: 'security',
    status: 'in_force',
    adoption_date: '2021-04-29',
    entry_into_force: '2021-05-12',
    summary: 'Establishes the EU first dedicated defence research and development fund with EUR 7.95 billion for 2021-2027. Co-finances collaborative defence R&D projects across Member States, supporting the development of defence technologies and capabilities in areas like cyber, space, and unmanned systems.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0697',
    last_updated: '2024-01-15',
  },
  {
    id: 'just-transition-fund',
    title: 'Regulation (EU) 2021/1056 establishing the Just Transition Fund',
    short_title: 'Just Transition Fund',
    celex_number: '32021R1056',
    document_type: 'regulation',
    domain: 'cross-cutting',
    status: 'in_force',
    adoption_date: '2021-06-24',
    entry_into_force: '2021-07-01',
    summary: 'Provides EUR 17.5 billion to alleviate social and economic impacts of the green transition in regions dependent on fossil fuels and carbon-intensive industries. Supports worker retraining, SME diversification, and investment in clean energy and circular economy infrastructure.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1056',
    last_updated: '2024-01-15',
  },
  {
    id: 'ipi-regulation',
    title: 'Regulation (EU) 2022/1031 on the access of third-country goods and services to the EU procurement market (IPI)',
    short_title: 'International Procurement Instrument',
    celex_number: '32022R1031',
    document_type: 'regulation',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2022-06-23',
    entry_into_force: '2022-08-29',
    summary: 'Gives the EU leverage to open up foreign procurement markets by allowing restrictions on access of third-country bidders to EU public procurement. Aims to create reciprocity in government procurement market access through investigations and potential IPI measures.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R1031',
    last_updated: '2024-01-15',
  },
  {
    id: 'whistleblower-directive',
    title: 'Directive (EU) 2019/1937 on the protection of persons who report breaches of Union law',
    short_title: 'Whistleblower Protection Directive',
    celex_number: '32019L1937',
    document_type: 'directive',
    domain: 'justice',
    status: 'in_force',
    adoption_date: '2019-10-23',
    entry_into_force: '2021-12-17',
    summary: 'Establishes EU-wide minimum standards for protecting whistleblowers who report breaches of EU law. Requires organisations with 50+ employees to set up internal reporting channels, prohibits retaliation, and provides legal remedies for whistleblowers facing reprisals.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019L1937',
    last_updated: '2024-01-15',
  },
  {
    id: 'roaming-regulation',
    title: 'Regulation (EU) 2022/612 on roaming on public mobile communications networks',
    short_title: 'Roaming Regulation',
    celex_number: '32022R0612',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2022-04-06',
    entry_into_force: '2022-07-01',
    summary: 'Extends the "Roam Like At Home" principle until 2032, ensuring EU travellers can use mobile phones abroad at domestic prices. Adds quality of service provisions requiring 4G/5G access while roaming and improved transparency on value-added service charges.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0612',
    last_updated: '2024-01-15',
  },
  {
    id: 'seveso-directive',
    title: 'Directive 2012/18/EU on the control of major-accident hazards involving dangerous substances (Seveso III)',
    short_title: 'Seveso III Directive',
    celex_number: '32012L0018',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2012-07-04',
    entry_into_force: '2015-06-01',
    summary: 'Prevents major industrial accidents involving dangerous substances and limits their consequences for people and the environment. Requires establishments to notify authorities, prepare safety reports and emergency plans, and provide information to the public about nearby industrial hazards.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012L0018',
    last_updated: '2024-01-15',
  },
  {
    id: 'hydrogen-gas-package',
    title: 'Directive (EU) 2024/1788 on common rules for the internal markets in renewable and natural gases and in hydrogen',
    short_title: 'Hydrogen and Gas Market Directive',
    celex_number: '32024L1788',
    document_type: 'directive',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2024-05-13',
    entry_into_force: '2024-07-05',
    summary: 'Creates a regulatory framework for hydrogen markets alongside reformed natural gas rules. Establishes rules for hydrogen network access, unbundling of hydrogen transport operators, and consumer protection. Supports development of a European hydrogen backbone infrastructure.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1788',
    last_updated: '2024-07-15',
  },
  {
    id: 'ten-e-regulation',
    title: 'Regulation (EU) 2022/869 on guidelines for trans-European energy infrastructure (TEN-E)',
    short_title: 'TEN-E Regulation',
    celex_number: '32022R0869',
    document_type: 'regulation',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2022-05-30',
    entry_into_force: '2022-06-23',
    summary: 'Revised framework for cross-border energy infrastructure projects of common interest. Shifts focus from fossil fuel to clean energy infrastructure including offshore grids, hydrogen networks, smart grids, and CO2 transport. Introduces faster permitting and eligibility for EU funding.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R0869',
    last_updated: '2024-01-15',
  },
  {
    id: 'gigabit-infrastructure-act',
    title: 'Regulation (EU) 2024/1309 on measures to reduce the cost of deploying gigabit electronic communications networks',
    short_title: 'Gigabit Infrastructure Act',
    celex_number: '32024R1309',
    document_type: 'regulation',
    domain: 'digital',
    status: 'in_force',
    adoption_date: '2024-04-11',
    entry_into_force: '2024-05-28',
    summary: 'Reduces costs and speeds up deployment of high-speed broadband networks across the EU. Requires coordination of civil works, mandates access to existing physical infrastructure, and streamlines permit-granting procedures to support the EU Gigabit connectivity targets for 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1309',
    last_updated: '2024-06-01',
  },
  {
    id: 'repowereu-plan',
    title: 'Communication COM(2022) 230 - REPowerEU Plan',
    short_title: 'REPowerEU Plan',
    celex_number: '52022DC0230',
    document_type: 'communication',
    domain: 'energy',
    status: 'in_force',
    adoption_date: '2022-05-18',
    entry_into_force: null,
    summary: 'Launched in response to the Russian invasion of Ukraine, the plan aims to end EU dependence on Russian fossil fuels by 2027. Proposes accelerating renewables deployment, diversifying energy supply, saving energy, and mobilising EUR 300 billion in investments for energy independence.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022DC0108',
    last_updated: '2024-01-15',
  },
  {
    id: 'green-claims-directive',
    title: 'Directive (EU) 2024/825 on empowering consumers for the green transition',
    short_title: 'Empowering Consumers (Green Claims)',
    celex_number: '32024L0825',
    document_type: 'directive',
    domain: 'consumer',
    status: 'in_force',
    adoption_date: '2024-02-28',
    entry_into_force: '2024-03-26',
    summary: 'Amends consumer protection rules to crack down on greenwashing and misleading sustainability claims. Bans generic environmental claims without substantiation, prohibits misleading durability claims, and requires verification for environmental labelling schemes.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L0825',
    last_updated: '2024-04-01',
  },
  {
    id: 'soil-monitoring-law',
    title: 'Directive (EU) 2024/3365 on soil monitoring and resilience',
    short_title: 'Soil Monitoring Law',
    celex_number: '32024L3365',
    document_type: 'directive',
    domain: 'environment',
    status: 'in_force',
    adoption_date: '2024-12-19',
    entry_into_force: '2025-01-08',
    summary: 'First dedicated EU soil law. Requires Member States to establish soil monitoring networks, assess soil health using biological, chemical, and physical indicators, and take measures to address contaminated sites. Aims to have all EU soils in healthy condition by 2050.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L3365',
    last_updated: '2025-01-15',
  },
  {
    id: 'eu-merger-regulation',
    title: 'Council Regulation (EC) No 139/2004 on the control of concentrations between undertakings (EU Merger Regulation)',
    short_title: 'EU Merger Regulation',
    celex_number: '32004R0139',
    document_type: 'regulation',
    domain: 'trade',
    status: 'in_force',
    adoption_date: '2004-01-20',
    entry_into_force: '2004-05-01',
    summary: 'Gives the European Commission exclusive competence to review large cross-border mergers and acquisitions above certain turnover thresholds. Establishes the substantive test of significant impediment to effective competition and procedures for notification, review, and remedies.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32004R0139',
    last_updated: '2024-01-15',
  },
  {
    id: 'farm-to-fork-strategy',
    title: 'Communication COM(2020) 381 - A Farm to Fork Strategy for a fair, healthy and environmentally-friendly food system',
    short_title: 'Farm to Fork Strategy',
    celex_number: '52020DC0381',
    document_type: 'communication',
    domain: 'agriculture',
    status: 'in_force',
    adoption_date: '2020-05-20',
    entry_into_force: null,
    summary: 'Sets out the EU strategy for a sustainable food system from production to consumption. Targets include 50% reduction in pesticide use and risk, 20% reduction in fertiliser use, 25% of farmland under organic farming, and 50% reduction of antimicrobial sales for farmed animals by 2030.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52020DC0381',
    last_updated: '2024-01-15',
  },
  {
    id: 'collective-redress-directive',
    title: 'Directive (EU) 2020/1828 on representative actions for the protection of the collective interests of consumers',
    short_title: 'Collective Redress Directive',
    celex_number: '32020L1828',
    document_type: 'directive',
    domain: 'consumer',
    status: 'in_force',
    adoption_date: '2020-11-25',
    entry_into_force: '2023-06-25',
    summary: 'Enables qualified entities to bring representative actions on behalf of groups of consumers across the EU. Provides for both injunctive and redress measures, covering violations of over 60 EU directives and regulations including GDPR, consumer rights, and competition law.',
    eurlex_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020L1828',
    last_updated: '2024-01-15',
  },
];

// ─── Connections ────────────────────────────────────────────────────────────────

export const connections: PolicyConnection[] = [
  { id: 1, source_policy_id: 'eu-green-deal', target_policy_id: 'eu-climate-law', connection_type: 'complements', description: 'The European Climate Law translates the Green Deal\'s headline political commitment into a binding legal obligation of climate neutrality by 2050. It establishes the governance framework for tracking progress, including a 2030 intermediate target of at least 55% net greenhouse gas reduction. The Climate Law thus serves as the legally enforceable backbone of the Green Deal architecture.', articles_source: 'Section 2.1.1', articles_target: 'Art. 1, Art. 2(1), Art. 4(1)' },
  { id: 2, source_policy_id: 'eu-green-deal', target_policy_id: 'fit-for-55', connection_type: 'complements', description: 'Fit for 55 is the comprehensive legislative package that operationalises the European Green Deal\'s climate ambitions through sector-specific instruments. It delivers the policy reforms required to achieve the 55% net GHG reduction target by 2030, spanning energy, transport, buildings, and carbon pricing. The package represents the most significant overhaul of EU climate and energy legislation since the 2020 framework.', articles_source: 'Section 2.1', articles_target: 'Section 1, Section 2' },
  { id: 3, source_policy_id: 'fit-for-55', target_policy_id: 'eu-ets-directive', connection_type: 'amends', description: 'The Fit for 55 revision significantly strengthened the EU ETS by increasing the linear reduction factor to 4.3% annually from 2024 and extending coverage to maritime transport. It also established ETS2 covering buildings and road transport from 2027, fundamentally expanding the scope of carbon pricing across the EU economy. These amendments align the emissions cap trajectory with the 55% reduction target.', articles_source: 'Section 2.1', articles_target: 'Art. 9, Art. 10a, Art. 3g-3ge' },
  { id: 4, source_policy_id: 'fit-for-55', target_policy_id: 'effort-sharing-regulation', connection_type: 'amends', description: 'The Fit for 55 package raised the EU-wide Effort Sharing target from -30% to -40% compared to 2005 levels, with differentiated national targets based on GDP per capita. This covers emissions from non-ETS sectors including buildings, road transport, agriculture, small industry, and waste. Member States must submit annual compliance reports and can use flexibilities including banking, borrowing, and limited transfers between ESR and LULUCF.', articles_source: 'Section 2.3', articles_target: 'Art. 4(2), Art. 5, Annex I' },
  { id: 5, source_policy_id: 'fit-for-55', target_policy_id: 'lulucf-regulation', connection_type: 'amends', description: 'Under the Fit for 55 revision, the LULUCF Regulation was amended to set an EU net removal target of 310 MtCO2eq by 2030, with binding national targets for each Member State. The amendment transitions from a no-debit accounting rule to absolute targets, requiring genuine increases in the EU carbon sink. From 2031, LULUCF will be merged with agricultural non-CO2 emissions under a single land-sector pillar.', articles_source: 'Section 2.4', articles_target: 'Art. 4(2), Art. 4(3), Annex IIa' },
  { id: 6, source_policy_id: 'fit-for-55', target_policy_id: 'renewable-energy-directive', connection_type: 'amends', description: 'Fit for 55 raised the binding EU renewable energy target from 32% to a minimum of 42.5%, with an aspiration of reaching 45% by 2030. The revised RED III introduces sector-specific sub-targets including 49% renewables in buildings and 29% in transport, alongside accelerated permitting procedures for renewable energy projects. These amendments are critical for power sector decarbonisation and reducing fossil fuel dependency.', articles_source: 'Section 2.5', articles_target: 'Art. 3(1), Art. 15a, Art. 15b, Art. 25' },
  { id: 7, source_policy_id: 'fit-for-55', target_policy_id: 'energy-efficiency-directive', connection_type: 'amends', description: 'The Fit for 55 recast established a binding EU target of 11.7% reduction in final energy consumption by 2030 compared to 2020 reference projections. It strengthened the energy-efficiency-first principle, requiring it to be applied across all policy, planning, and major investment decisions. The revised directive also raised the annual energy savings obligation for Member States to 1.3% from 2024, 1.5% from 2026, and 1.9% from 2028.', articles_source: 'Section 2.6', articles_target: 'Art. 4(1), Art. 8, Art. 9(1)' },
  { id: 8, source_policy_id: 'fit-for-55', target_policy_id: 'cbam-regulation', connection_type: 'complements', description: 'The Carbon Border Adjustment Mechanism was introduced as part of Fit for 55 to address carbon leakage risk as the EU raises its climate ambition. CBAM requires importers of carbon-intensive goods (cement, steel, aluminium, fertilisers, electricity, hydrogen) to purchase certificates mirroring the EU ETS carbon price. Its transitional reporting phase began in October 2023, with full financial adjustment applying from 2026 as free ETS allowances are phased out.', articles_source: 'Section 2.2', articles_target: 'Art. 1, Art. 2(1), Art. 7, Art. 30-35' },
  { id: 9, source_policy_id: 'fit-for-55', target_policy_id: 'co2-cars-regulation', connection_type: 'amends', description: 'The Fit for 55 revision tightened CO2 emission performance standards for new cars and vans to achieve 100% reduction by 2035, effectively mandating zero-emission vehicles. Intermediate targets were set at -55% for cars and -50% for vans by 2030 compared to 2021 levels. This regulatory signal provides long-term investment certainty for the automotive industry\'s transition to electric mobility.', articles_source: 'Section 2.7', articles_target: 'Art. 1(5)(a), Art. 1(5)(b), Art. 14a' },
  { id: 10, source_policy_id: 'fit-for-55', target_policy_id: 'social-climate-fund', connection_type: 'complements', description: 'The Social Climate Fund was created alongside ETS2 to mitigate the regressive distributional effects of carbon pricing on vulnerable households and micro-enterprises. Funded by up to EUR 65 billion from ETS2 auction revenues (2026-2032), it supports investments in energy efficiency, building renovation, clean mobility, and direct income support. The SCF ensures the green transition remains socially equitable and politically sustainable.', articles_source: 'Section 2.12', articles_target: 'Art. 1, Art. 3, Art. 9, Art. 10' },
  { id: 11, source_policy_id: 'eu-ets-directive', target_policy_id: 'cbam-regulation', connection_type: 'complements', description: 'CBAM progressively replaces free ETS allowances for covered sectors with a border carbon adjustment, ensuring that imported goods face equivalent carbon costs to those produced within the EU. This prevents carbon leakage whereby EU production shifts to jurisdictions with weaker climate policies. The phase-in of CBAM certificates directly mirrors the phase-out schedule of free ETS allocations under Art. 10a.', articles_source: 'Art. 10a(1), Art. 10a(1a)', articles_target: 'Art. 30-36, Annex II' },
  { id: 12, source_policy_id: 'eu-ets-directive', target_policy_id: 'social-climate-fund', connection_type: 'complements', description: 'The Social Climate Fund is directly financed by revenues from the auctioning of ETS2 allowances for buildings and road transport, establishing a revenue-recycling mechanism. Up to 25% of expected ETS2 revenues are earmarked for the SCF to cushion the price impact on vulnerable households. This design ensures that carbon pricing revenues are partially redistributed to those most affected by the energy transition.', articles_source: 'Art. 30d(3)-(5)', articles_target: 'Art. 9(1), Art. 14' },
  { id: 13, source_policy_id: 'taxonomy-regulation', target_policy_id: 'sfdr', connection_type: 'complements', description: 'The SFDR mandates that financial market participants disclose the proportion of investments aligned with the EU Taxonomy\'s technical screening criteria. The Taxonomy provides the standardised classification system that defines what constitutes an environmentally sustainable economic activity. Together they create a coherent framework linking green investment definitions to mandatory product-level and entity-level disclosures.', articles_source: 'Art. 3, Art. 8, Art. 9', articles_target: 'Art. 2a, Art. 8, Art. 9' },
  { id: 14, source_policy_id: 'taxonomy-regulation', target_policy_id: 'csrd', connection_type: 'complements', description: 'The CSRD requires large companies to report on the proportion of their turnover, capital expenditure, and operating expenditure associated with Taxonomy-aligned activities. This establishes a direct data pipeline from corporate sustainability reporting to the Taxonomy classification framework. The alignment ensures consistency between non-financial reporting obligations and the EU\'s green finance architecture.', articles_source: 'Art. 8(1)-(4)', articles_target: 'Art. 19a, Art. 29a' },
  { id: 15, source_policy_id: 'co2-cars-regulation', target_policy_id: 'afir-regulation', connection_type: 'complements', description: 'AFIR mandates the deployment of publicly accessible electric vehicle charging and hydrogen refuelling infrastructure along the TEN-T network, complementing the zero-emission vehicle mandate set by the CO2 standards regulation. Without adequate charging infrastructure, the 2035 phase-out of internal combustion engines cannot succeed in practice. AFIR requires Member States to ensure minimum charging capacity is proportional to their electric vehicle fleet size.', articles_source: 'Art. 1(5)(a), Recital 11', articles_target: 'Art. 3(1), Art. 6, Art. 7' },
  { id: 16, source_policy_id: 'renewable-energy-directive', target_policy_id: 'epbd-recast', connection_type: 'complements', description: 'The recast Energy Performance of Buildings Directive requires that new buildings be designed as zero-emission buildings from 2030, including on-site renewable energy generation. It implements the RED III sectoral sub-target of 49% renewable energy in the buildings sector through minimum renewable energy obligations. The EPBD also mandates solar energy installations on new public and commercial buildings, directly contributing to national renewable energy contributions.', articles_source: 'Art. 15a, Art. 15b', articles_target: 'Art. 7, Art. 9a, Art. 11' },
  { id: 17, source_policy_id: 'eu-climate-law', target_policy_id: 'governance-regulation', connection_type: 'references', description: 'The European Climate Law explicitly references and builds upon the Energy Union Governance Regulation as the primary monitoring, reporting, and planning framework for climate and energy policy. The Climate Law\'s trajectory assessment mechanism relies on the integrated National Energy and Climate Plans (NECPs) established under the Governance Regulation. This cross-referencing ensures institutional coherence between binding climate targets and the procedural infrastructure for their delivery.', articles_source: 'Art. 6, Art. 7(1)', articles_target: 'Art. 3, Art. 14, Art. 29' },
  { id: 18, source_policy_id: 'governance-regulation', target_policy_id: 'renewable-energy-directive', connection_type: 'implements', description: 'Member States\' National Energy and Climate Plans under the Governance Regulation serve as the primary vehicle for implementing RED III renewable energy targets at national level. Each NECP must include detailed renewable energy trajectories, planned policies and measures, and investment projections. The Governance Regulation also establishes a gap-filling mechanism whereby the Commission can require additional measures if aggregate national contributions fall short of the EU target.', articles_source: 'Art. 3, Art. 4(a)(2), Art. 32', articles_target: 'Art. 3(1), Art. 3(3)' },
  { id: 19, source_policy_id: 'governance-regulation', target_policy_id: 'energy-efficiency-directive', connection_type: 'implements', description: 'NECPs under the Governance Regulation must include national energy efficiency contributions and detailed policies for achieving EED targets, including building renovation strategies and annual savings obligations. The Governance Regulation provides the planning and reporting framework through which Member States demonstrate compliance with binding energy efficiency requirements. Biennial progress reports track the delivery gap and trigger Commission recommendations where necessary.', articles_source: 'Art. 4(b), Art. 15, Art. 29', articles_target: 'Art. 4(1), Art. 8(1), Art. 9(1)' },
  { id: 20, source_policy_id: 'industrial-emissions-directive', target_policy_id: 'eu-ets-directive', connection_type: 'complements', description: 'The Industrial Emissions Directive regulates pollutant emissions and environmental impacts from large industrial installations through integrated permits and best available techniques (BAT). The EU ETS separately covers CO2 emissions from many of the same installations, creating a dual regulatory framework. Together, they ensure comprehensive environmental protection: the IED addresses local air, water, and soil pollution, while the ETS manages greenhouse gas emissions through market-based mechanisms.', articles_source: 'Art. 9(1), Art. 14, Annex I', articles_target: 'Art. 2, Art. 9, Annex I' },
  { id: 21, source_policy_id: 'net-zero-industry-act', target_policy_id: 'critical-raw-materials-act', connection_type: 'complements', description: 'The Critical Raw Materials Act secures the supply of strategic materials (lithium, cobalt, rare earths) essential for manufacturing net-zero technologies listed under the NZIA. Without reliable access to these inputs, the EU cannot achieve its domestic manufacturing benchmarks of 40% of deployment needs by 2030. Together, these instruments form an industrial strategy chain from raw material extraction through to clean technology production.', articles_source: 'Art. 1, Art. 3, Annex I', articles_target: 'Art. 1, Art. 3, Annex I-II' },
  { id: 22, source_policy_id: 'eu-green-deal', target_policy_id: 'nature-restoration-law', connection_type: 'complements', description: 'The Nature Restoration Law implements the EU Biodiversity Strategy 2030, a cornerstone initiative of the European Green Deal, by setting legally binding restoration targets for degraded ecosystems. It requires Member States to put restoration measures in place on at least 30% of each habitat type not in good condition by 2030. The law represents the first EU-wide legislation dedicated to ecosystem restoration rather than mere conservation.', articles_source: 'Section 2.1.2', articles_target: 'Art. 1, Art. 4, Art. 5' },
  { id: 23, source_policy_id: 'lulucf-regulation', target_policy_id: 'nature-restoration-law', connection_type: 'complements', description: 'Ecosystem restoration under the Nature Restoration Law directly supports the achievement of LULUCF carbon sink targets by improving the carbon sequestration capacity of forests, wetlands, and peatlands. Restored ecosystems contribute to the 310 MtCO2eq net removal target for 2030 by increasing biomass accumulation and reducing soil carbon losses. This synergy between nature protection and climate mitigation is central to the EU\'s integrated land-use policy.', articles_source: 'Art. 4(2), Art. 4(3)', articles_target: 'Art. 9, Art. 10, Art. 11' },
  { id: 24, source_policy_id: 'eu-green-deal', target_policy_id: 'deforestation-regulation', connection_type: 'complements', description: 'The Deforestation Regulation implements the Green Deal\'s commitment to minimise the EU\'s contribution to global deforestation and forest degradation. It requires operators to ensure that commodities placed on the EU market (soy, palm oil, beef, wood, cocoa, coffee, rubber) are deforestation-free and legally produced. This represents a pioneering demand-side measure addressing the external environmental footprint of EU consumption patterns.', articles_source: 'Section 2.1.8', articles_target: 'Art. 1, Art. 3, Art. 4, Annex I' },
  { id: 25, source_policy_id: 'fit-for-55', target_policy_id: 'fueleu-maritime', connection_type: 'complements', description: 'FuelEU Maritime sets progressively stringent limits on the greenhouse gas intensity of energy used by ships calling at EU ports, starting at -2% in 2025 and reaching -80% by 2050. As a Fit for 55 instrument, it complements the extension of ETS to maritime transport by addressing fuel-side decarbonisation through a separate regulatory pathway. The regulation also mandates the use of on-shore power supply in major ports from 2030.', articles_source: 'Section 2.10', articles_target: 'Art. 4(2), Art. 5, Art. 6, Annex I' },
  { id: 26, source_policy_id: 'fit-for-55', target_policy_id: 'refueleu-aviation', connection_type: 'complements', description: 'ReFuelEU Aviation mandates minimum shares of sustainable aviation fuels (SAF) in jet fuel supplied at EU airports, rising from 2% in 2025 to 70% by 2050 including a synthetic fuel sub-mandate. As part of Fit for 55, it addresses aviation\'s hard-to-abate emissions through fuel-switching obligations complementing the ETS coverage of intra-EU flights. The regulation creates demand certainty for SAF producers and supports the scaling of production capacity.', articles_source: 'Section 2.9', articles_target: 'Art. 3, Art. 4, Art. 5, Annex I' },
  { id: 27, source_policy_id: 'fit-for-55', target_policy_id: 'afir-regulation', connection_type: 'complements', description: 'The Alternative Fuels Infrastructure Regulation mandates minimum deployment of EV charging and hydrogen refuelling stations along the TEN-T core and comprehensive networks. As a Fit for 55 enabler, AFIR addresses the critical infrastructure gap that could otherwise delay transport decarbonisation despite zero-emission vehicle mandates. National policy frameworks must ensure a minimum of 1.3 kW of publicly accessible charging power per battery electric vehicle registered.', articles_source: 'Section 2.8', articles_target: 'Art. 3, Art. 6, Art. 7, Art. 13' },
  { id: 28, source_policy_id: 'energy-efficiency-directive', target_policy_id: 'epbd-recast', connection_type: 'complements', description: 'The EPBD recast is the buildings-specific implementation of the EED\'s overarching energy efficiency goals, requiring all new buildings to be zero-emission from 2030 and establishing minimum energy performance standards for existing buildings. The EED\'s annual renovation rate obligation directly depends on the EPBD\'s building renovation pathways and energy performance certificates framework. Together, they create a comprehensive regulatory regime for building sector decarbonisation.', articles_source: 'Art. 4(1), Art. 6, Art. 7', articles_target: 'Art. 7, Art. 9, Art. 16, Art. 19' },
  { id: 29, source_policy_id: 'sfdr', target_policy_id: 'csrd', connection_type: 'complements', description: 'The CSRD provides the company-level sustainability data that financial market participants require to fulfil SFDR product-level disclosure obligations. Without standardised corporate ESG reporting under CSRD, financial product disclosures under SFDR would lack a reliable data foundation. This data pipeline connects the real economy reporting to the financial sector, enabling investors to assess the sustainability characteristics of their portfolios.', articles_source: 'Art. 4, Art. 7, Art. 8, Art. 9', articles_target: 'Art. 19a(2), Art. 29a, ESRS standards' },
  { id: 30, source_policy_id: 'methane-regulation', target_policy_id: 'eu-climate-law', connection_type: 'implements', description: 'The EU Methane Regulation implements the Climate Law\'s objective of achieving climate neutrality by targeting methane, the second most important greenhouse gas after CO2. It establishes binding obligations for measuring, reporting, and reducing methane emissions across the energy sector, including leak detection and repair requirements and a ban on routine venting and flaring. The regulation is essential for meeting the 2030 and 2050 targets given methane\'s high short-term warming potential.', articles_source: 'Art. 1, Art. 4, Art. 12-14', articles_target: 'Art. 2(1), Art. 4(1)' },
  { id: 31, source_policy_id: 'cbam-regulation', target_policy_id: 'industrial-emissions-directive', connection_type: 'complements', description: 'The CBAM Regulation references the IED for methodology on calculating embedded emissions in imported goods, particularly for installations that would fall under IED permit requirements if located within the EU. IED best available techniques (BAT) reference documents provide benchmarks against which third-country production processes can be assessed. This cross-reference ensures methodological consistency between domestic industrial regulation and border carbon adjustments.', articles_source: 'Art. 7(2), Art. 7(7), Annex IV', articles_target: 'Art. 14, Art. 15, Annex I' },
  { id: 32, source_policy_id: 'net-zero-industry-act', target_policy_id: 'renewable-energy-directive', connection_type: 'complements', description: 'The NZIA supports the manufacturing scale-up of renewable energy technologies listed as strategic net-zero technologies, including solar PV, wind, heat pumps, and electrolysers. Achieving the RED III\'s 42.5% renewable energy target by 2030 requires a massive deployment of these technologies, which the NZIA seeks to domestically produce. The manufacturing benchmark of 40% of EU deployment needs directly serves renewable energy capacity expansion goals.', articles_source: 'Art. 1, Art. 3, Annex I', articles_target: 'Art. 3(1), Art. 15a' },
  { id: 33, source_policy_id: 'ai-act', target_policy_id: 'digital-services-act', connection_type: 'complements', description: 'The AI Act establishes a risk-based regulatory framework for artificial intelligence systems that complements the DSA\'s horizontal platform governance rules. While the DSA addresses content moderation and algorithmic transparency for online platforms, the AI Act imposes additional obligations on high-risk AI systems used in critical sectors. Together they form a layered digital governance framework where general platform rules (DSA) are supplemented by technology-specific regulation (AI Act).', articles_source: 'Art. 1, Art. 5, Art. 6, Annex III', articles_target: 'Art. 34, Art. 40' },
  { id: 34, source_policy_id: 'digital-markets-act', target_policy_id: 'digital-services-act', connection_type: 'complements', description: 'The DMA addresses ex-ante competition regulation of large gatekeeper platforms, while the DSA establishes content-related obligations and due diligence duties for all online intermediaries. Together, they form the twin pillars of EU digital platform regulation: the DMA ensures contestable and fair digital markets, while the DSA protects users and fundamental rights online. The two regulations share enforcement mechanisms through the Commission and national Digital Services Coordinators.', articles_source: 'Art. 1, Art. 3, Art. 5-7', articles_target: 'Art. 1, Art. 14-42' },
  { id: 35, source_policy_id: 'batteries-regulation', target_policy_id: 'critical-raw-materials-act', connection_type: 'complements', description: 'The CRM Act addresses the strategic supply chain vulnerabilities for raw materials (lithium, cobalt, nickel, graphite) that are essential inputs for battery manufacturing governed by the Batteries Regulation. Battery production accounts for a significant share of EU demand for several critical raw materials, making supply security a prerequisite for the green transition. The CRM Act\'s diversification and recycling benchmarks directly support the Batteries Regulation\'s recycled content and due diligence requirements.', articles_source: 'Art. 8, Art. 39, Art. 48', articles_target: 'Art. 1, Art. 3, Annex I-II' },
  { id: 36, source_policy_id: 'batteries-regulation', target_policy_id: 'taxonomy-regulation', connection_type: 'complements', description: 'The Batteries Regulation references the EU Taxonomy\'s environmental sustainability criteria when defining what constitutes sustainable battery production and lifecycle management. The Taxonomy\'s technical screening criteria for manufacturing activities inform the carbon footprint thresholds and circularity requirements applicable to batteries. This ensures regulatory coherence between product-specific sustainability standards and the EU\'s overarching green finance classification system.', articles_source: 'Art. 7, Art. 8, Recital 17', articles_target: 'Art. 3, Art. 10, Delegated Acts' },
  { id: 37, source_policy_id: 'ecodesign-sustainable-products', target_policy_id: 'energy-efficiency-directive', connection_type: 'complements', description: 'The Ecodesign for Sustainable Products Regulation sets minimum performance requirements for energy-related products that directly contribute to achieving EED energy efficiency targets. By mandating higher efficiency standards, durability requirements, and repairability across product categories, ecodesign rules reduce energy demand at the point of consumption. The Commission estimates that ecodesign measures deliver approximately 10% of the EU\'s energy savings target.', articles_source: 'Art. 1, Art. 5, Art. 7', articles_target: 'Art. 4(1), Art. 7, Art. 8' },
  { id: 38, source_policy_id: 'ecodesign-sustainable-products', target_policy_id: 'deforestation-regulation', connection_type: 'complements', description: 'Both regulations address the environmental footprint of products placed on the EU market through complementary approaches: the Ecodesign Regulation targets product design, durability, and circularity, while the Deforestation Regulation ensures commodity supply chains are free from deforestation. The Ecodesign Regulation\'s Digital Product Passport can include supply chain traceability data relevant to deforestation-free verification. Together they advance the EU\'s ambition to make sustainable products the norm.', articles_source: 'Art. 1, Art. 8, Art. 9', articles_target: 'Art. 3, Art. 4, Art. 10' },
  { id: 39, source_policy_id: 'cap-strategic-plans', target_policy_id: 'deforestation-regulation', connection_type: 'complements', description: 'CAP Strategic Plans reference deforestation-free supply chain requirements insofar as they condition agricultural support payments on compliance with environmental standards, including through cross-compliance and eco-scheme mechanisms. Agricultural commodities (cattle, soy for feed) are among the key products covered by the Deforestation Regulation. The alignment ensures that EU agricultural subsidies do not incentivise production linked to global forest loss.', articles_source: 'Art. 12, Art. 31, Annex III', articles_target: 'Art. 3, Art. 4, Annex I' },
  { id: 40, source_policy_id: 'data-act', target_policy_id: 'ai-act', connection_type: 'complements', description: 'The Data Act establishes horizontal rules on fair data access and sharing that underpin the data governance requirements of the AI Act, particularly regarding training data quality and access rights. AI systems classified as high-risk under the AI Act depend on the availability and quality of data, which the Data Act facilitates through mandatory data-sharing between businesses. The two regulations jointly create the legal conditions for a trustworthy data economy.', articles_source: 'Art. 1, Art. 3-5, Art. 14', articles_target: 'Art. 10, Art. 12, Art. 17' },
  { id: 41, source_policy_id: 'cyber-resilience-act', target_policy_id: 'digital-services-act', connection_type: 'complements', description: 'The CRA adds mandatory cybersecurity requirements for products with digital elements (hardware and software) placed on the EU market, complementing the DSA\'s platform-level security and content moderation obligations. While the DSA addresses the safety of online services, the CRA ensures that the underlying digital products are secure by design throughout their lifecycle. Together, they protect consumers from both insecure digital products and unsafe online environments.', articles_source: 'Art. 1, Art. 6, Art. 10-13', articles_target: 'Art. 14, Art. 26, Art. 34' },
  { id: 42, source_policy_id: 'water-framework-directive', target_policy_id: 'zero-pollution-action-plan', connection_type: 'complements', description: 'The Water Framework Directive provides the core legal infrastructure — river basin management plans, good ecological status objectives, and chemical quality standards — that underpins the Zero Pollution Action Plan\'s targets for freshwater environments. The Zero Pollution target of reducing harmful chemical pollution of waters by 50% by 2030 relies on WFD implementation. The WFD\'s established monitoring network and compliance assessment methodology provides the measurement basis for tracking zero pollution progress.', articles_source: 'Art. 1, Art. 4, Art. 16, Annex V', articles_target: 'Target 2, Action 5' },
  { id: 43, source_policy_id: 'reach-regulation', target_policy_id: 'zero-pollution-action-plan', connection_type: 'complements', description: 'REACH implements the Zero Pollution Action Plan\'s objectives by requiring the registration, evaluation, authorisation, and restriction of chemical substances to protect human health and the environment. The planned REACH revision under the Zero Pollution agenda aims to extend registration to additional polymers and strengthen the restriction process for harmful substance groups. REACH is the primary legislative instrument through which the EU controls chemical pollution at source.', articles_source: 'Art. 1, Art. 55, Art. 68, Annex XIV', articles_target: 'Target 3, Action 8' },
  { id: 44, source_policy_id: 'f-gas-regulation', target_policy_id: 'eu-ets-directive', connection_type: 'complements', description: 'The revised F-Gas Regulation phases down hydrofluorocarbons (HFCs) through a quota system and substance bans, targeting potent greenhouse gases that fall outside the scope of the EU ETS. While the ETS covers CO2 (and N2O/PFCs from certain processes), F-gases used in refrigeration, air conditioning, and heat pumps require separate regulation due to their extremely high global warming potentials. The F-Gas Regulation\'s phase-down schedule aligns with EU Climate Law targets and the Kigali Amendment to the Montreal Protocol.', articles_source: 'Art. 3, Art. 4, Art. 11, Annex V', articles_target: 'Art. 2, Annex I' },
  { id: 45, source_policy_id: 'waste-framework-directive', target_policy_id: 'ecodesign-sustainable-products', connection_type: 'complements', description: 'The Waste Framework Directive establishes the waste hierarchy (prevention, reuse, recycling, recovery, disposal) that the Ecodesign Regulation operationalises at the product design stage through requirements for durability, repairability, and recyclability. The WFD\'s extended producer responsibility schemes create financial incentives for manufacturers to design products that minimise end-of-life waste. Together, these instruments close the circular economy loop from product conception to waste management.', articles_source: 'Art. 4, Art. 8, Art. 9, Art. 11', articles_target: 'Art. 5, Art. 7, Art. 8' },
  { id: 46, source_policy_id: 'single-use-plastics-directive', target_policy_id: 'deforestation-regulation', connection_type: 'complements', description: 'Both instruments address the environmental footprint of consumer products through complementary approaches: the SUP Directive restricts specific plastic items and mandates collection targets, while the Deforestation Regulation ensures sustainable sourcing of natural material alternatives. As single-use plastic bans drive substitution toward bio-based materials, the Deforestation Regulation ensures these alternatives are not sourced from deforested land. The interaction highlights the need for coherent material policy across the circular economy and biodiversity agendas.', articles_source: 'Art. 4, Art. 5, Art. 9, Annex', articles_target: 'Art. 3, Art. 4, Annex I' },
  { id: 47, source_policy_id: 'nis2-directive', target_policy_id: 'cyber-resilience-act', connection_type: 'complements', description: 'NIS2 establishes cybersecurity risk management and incident reporting obligations for essential and important entities across critical sectors, while the CRA addresses the security of digital products throughout their lifecycle. Together, they form a comprehensive framework covering both the supply side (secure products via CRA) and the demand side (secure operations via NIS2). The CRA ensures that products entering the market are secure by design, reducing the attack surface that NIS2-regulated entities must manage.', articles_source: 'Art. 6, Art. 20, Art. 21, Art. 23', articles_target: 'Art. 6, Art. 10, Art. 13' },
  { id: 48, source_policy_id: 'dora-regulation', target_policy_id: 'nis2-directive', connection_type: 'complements', description: 'DORA functions as lex specialis for the financial sector, providing tailored digital operational resilience requirements that go beyond the general NIS2 framework. While NIS2 applies horizontally to essential and important entities, DORA imposes additional obligations on financial institutions including ICT risk management, third-party provider oversight, and advanced threat-led penetration testing. Financial entities compliant with DORA are deemed to fulfil equivalent NIS2 obligations, avoiding regulatory duplication.', articles_source: 'Art. 1(2), Art. 5-16, Art. 28-44', articles_target: 'Art. 4, Art. 20, Art. 21' },
  { id: 49, source_policy_id: 'foreign-subsidies-regulation', target_policy_id: 'cbam-regulation', connection_type: 'complements', description: 'The Foreign Subsidies Regulation and CBAM jointly protect the EU internal market from distortions caused by third-country economic practices. While CBAM addresses the carbon price differential by equalising costs at the border for carbon-intensive imports, the FSR tackles broader competitive distortions from foreign government subsidies in the EU market and public procurement. Together, they ensure that EU industries are not undercut either by lower environmental standards or by state-backed financial advantages.', articles_source: 'Art. 1, Art. 4, Art. 28-41', articles_target: 'Art. 1, Art. 2, Art. 7' },
  { id: 50, source_policy_id: 'csddd', target_policy_id: 'csrd', connection_type: 'complements', description: 'The CSDDD mandates actual due diligence conduct (identifying, preventing, and mitigating adverse human rights and environmental impacts in value chains), while the CSRD requires transparent reporting on sustainability matters. Together they create a complementary "act-and-disclose" framework: companies must take concrete steps under CSDDD and then report on both their processes and outcomes under CSRD. CSRD reporting on due diligence processes can also serve to demonstrate CSDDD compliance.', articles_source: 'Art. 4-11, Art. 15', articles_target: 'Art. 19a, Art. 29a, ESRS S1-S4' },
  { id: 51, source_policy_id: 'csddd', target_policy_id: 'deforestation-regulation', connection_type: 'complements', description: 'The CSDDD\'s general value chain due diligence obligations complement the Deforestation Regulation\'s commodity-specific supply chain requirements. While the Deforestation Regulation mandates traceability and deforestation-free verification for seven specific commodities, the CSDDD extends environmental due diligence obligations more broadly across all sectors. For companies handling deforestation-risk commodities, the two regulations create overlapping but reinforcing compliance incentives for responsible sourcing.', articles_source: 'Art. 6, Art. 7, Art. 8, Annex', articles_target: 'Art. 3, Art. 4, Art. 10' },
  { id: 52, source_policy_id: 'ten-t-regulation', target_policy_id: 'afir-regulation', connection_type: 'complements', description: 'The TEN-T Regulation defines the trans-European transport network — core, comprehensive, and extended core corridors — along which AFIR mandates the deployment of alternative fuels infrastructure at specified intervals. AFIR explicitly requires EV charging stations every 60 km and hydrogen refuelling every 200 km on the TEN-T core network. This spatial integration ensures that clean transport infrastructure deployment follows strategic transport corridors, maximising cross-border connectivity.', articles_source: 'Art. 3, Art. 17, Annex I', articles_target: 'Art. 3(1), Art. 6(1), Art. 7(1)' },
  { id: 53, source_policy_id: 'euro-7-regulation', target_policy_id: 'co2-cars-regulation', connection_type: 'complements', description: 'Euro 7 regulates pollutant emissions (NOx, PM, CO) from vehicles including tailpipe, brake, and tyre particles, while the CO2 regulation targets greenhouse gas emissions through fleet-average standards. Together, they cover the full spectrum of vehicle emissions: local air quality pollutants (Euro 7) and climate-warming gases (CO2 standards). As the vehicle fleet transitions to zero-emission powertrains by 2035, Euro 7\'s relevance shifts toward non-exhaust emissions and the remaining ICE fleet.', articles_source: 'Art. 3, Art. 4, Annex I', articles_target: 'Art. 1, Art. 3, Annex I' },
  { id: 54, source_policy_id: 'horizon-europe', target_policy_id: 'net-zero-industry-act', connection_type: 'complements', description: 'Horizon Europe provides approximately EUR 95.5 billion in research and innovation funding (2021-2027), including dedicated programmes for clean energy, sustainable transport, and climate solutions that generate the technologies the NZIA seeks to scale up domestically. The NZIA\'s strategic net-zero technology list largely overlaps with Horizon Europe\'s Cluster 5 (Climate, Energy and Mobility) research priorities. This creates a seamless innovation pipeline from laboratory research (Horizon Europe) to commercial manufacturing (NZIA).', articles_source: 'Art. 4, Art. 7, Annex I Pillar II', articles_target: 'Art. 1, Art. 3, Annex I' },
  { id: 55, source_policy_id: 'european-chips-act', target_policy_id: 'critical-raw-materials-act', connection_type: 'complements', description: 'The European Chips Act and the CRM Act jointly address strategic supply chain dependencies that are critical for Europe\'s technological sovereignty. Semiconductor manufacturing requires access to materials such as gallium, germanium, and silicon, all designated as critical or strategic raw materials under the CRM Act. The Chips Act\'s investment in fabrication capacity (targeting 20% of global production by 2030) depends on reliable material supply chains secured through CRM Act provisions.', articles_source: 'Art. 1, Art. 2, Art. 4-14', articles_target: 'Art. 1, Art. 3, Annex I-II' },
  { id: 56, source_policy_id: 'european-chips-act', target_policy_id: 'net-zero-industry-act', connection_type: 'complements', description: 'The Chips Act strengthens European semiconductor supply chains that are essential for the digital components embedded in net-zero technologies, from power electronics in wind turbines and solar inverters to smart grid management systems. Advanced semiconductors are critical enablers for energy efficiency, electrification, and grid modernisation. The NZIA\'s manufacturing ambitions for clean technologies therefore depend on the domestic chip production capacity supported by the Chips Act.', articles_source: 'Art. 2, Art. 4, Recital 1-3', articles_target: 'Art. 1, Art. 3, Annex I' },
  { id: 57, source_policy_id: 'packaging-waste-regulation', target_policy_id: 'ecodesign-sustainable-products', connection_type: 'complements', description: 'The Packaging and Packaging Waste Regulation sets specific sustainability criteria for packaging (recyclability, recycled content, minimisation) that complement the Ecodesign Regulation\'s broader product sustainability requirements. While the Ecodesign Regulation covers product design holistically, the PPWR addresses the packaging dimension that accounts for roughly 40% of plastics use in the EU. Together, they ensure sustainability requirements apply across the entire product system, from the core product to its packaging.', articles_source: 'Art. 3-11, Art. 26', articles_target: 'Art. 5, Art. 7, Art. 8' },
  { id: 58, source_policy_id: 'platform-workers-directive', target_policy_id: 'ai-act', connection_type: 'complements', description: 'The Platform Workers Directive specifically regulates algorithmic management in platform work — including automated monitoring, performance evaluation, and task allocation — complementing the AI Act\'s broader rules on high-risk AI systems used in employment contexts. The AI Act classifies AI systems used for worker management as high-risk (Annex III, point 4), while the Platform Workers Directive provides sectoral rules on transparency and human oversight of algorithmic decisions. Both instruments protect workers from opaque automated decision-making.', articles_source: 'Art. 6, Art. 7, Art. 8', articles_target: 'Art. 6, Art. 26, Annex III(4)' },
  { id: 59, source_policy_id: 'eu-space-programme', target_policy_id: 'cyber-resilience-act', connection_type: 'complements', description: 'The EU Space Programme regulation references cybersecurity requirements for space infrastructure components, particularly satellite communication and navigation systems (Galileo, EGNOS, Copernicus). The CRA\'s product-level cybersecurity requirements apply to digital elements in space and ground segment hardware and software. As space infrastructure becomes increasingly critical for climate monitoring, precision agriculture, and disaster response, ensuring its cybersecurity is paramount.', articles_source: 'Art. 34, Art. 42, Recital 58', articles_target: 'Art. 6, Art. 10, Annex I' },
  { id: 60, source_policy_id: 'batteries-regulation', target_policy_id: 'waste-framework-directive', connection_type: 'complements', description: 'The Batteries Regulation builds on the Waste Framework Directive\'s principles of waste hierarchy and extended producer responsibility to establish specific collection, recycling, and second-life requirements for batteries. It sets ambitious collection targets (73% for portable batteries by 2030) and minimum recycled content requirements for cobalt, lithium, nickel, and lead. The WFD provides the overarching legal basis for waste management upon which the product-specific battery waste obligations are constructed.', articles_source: 'Art. 48-59, Art. 69-72', articles_target: 'Art. 4, Art. 8, Art. 11' },
  { id: 61, source_policy_id: 'anti-coercion-instrument', target_policy_id: 'foreign-subsidies-regulation', connection_type: 'complements', description: 'The Anti-Coercion Instrument and the Foreign Subsidies Regulation together form the EU\'s defensive trade policy toolkit against unfair external economic practices. While the FSR targets distortions from foreign subsidies in the internal market and public procurement, the ACI addresses situations where third countries use economic coercion to influence EU or Member State policy. Together, they equip the EU to respond to the full spectrum of foreign economic interference in the single market.', articles_source: 'Art. 1, Art. 2, Art. 7-9', articles_target: 'Art. 1, Art. 4, Art. 28' },
  { id: 62, source_policy_id: 'gdpr', target_policy_id: 'ai-act', connection_type: 'complements', description: 'The GDPR\'s data protection principles (purpose limitation, data minimisation, accuracy) directly apply to AI systems that process personal data, complementing the AI Act\'s specific requirements on training data governance and bias prevention. The AI Act explicitly preserves GDPR obligations and adds AI-specific transparency rules, including informing individuals when they interact with AI systems. High-risk AI systems must be designed to enable compliance with GDPR data subject rights, including the right to explanation of automated decisions.', articles_source: 'Art. 5, Art. 6, Art. 22, Art. 35', articles_target: 'Art. 10, Art. 13, Art. 50, Recital 69-71' },
  { id: 63, source_policy_id: 'gdpr', target_policy_id: 'digital-services-act', connection_type: 'complements', description: 'The DSA\'s platform governance obligations operate alongside GDPR data protection requirements, with the DSA explicitly stating that it does not affect the application of data protection law. DSA provisions on targeted advertising transparency, recommender system transparency, and algorithmic auditing complement GDPR protections against profiling and automated decision-making. The two regulations share enforcement coordination requirements between data protection authorities and Digital Services Coordinators.', articles_source: 'Art. 5, Art. 6, Art. 22, Recital 71', articles_target: 'Art. 2(4)(g), Art. 26, Art. 27, Art. 40' },
  { id: 64, source_policy_id: 'gdpr', target_policy_id: 'eprivacy-directive', connection_type: 'complements', description: 'The ePrivacy Directive provides sector-specific data protection rules for electronic communications, functioning as lex specialis to the GDPR. It covers the confidentiality of communications, processing of traffic and location data, and conditions for direct marketing, including the consent regime for cookies and tracking technologies. The GDPR provides the general data protection framework and enforcement mechanisms upon which ePrivacy builds its communications-specific protections.', articles_source: 'Art. 2, Art. 4(11), Art. 95', articles_target: 'Art. 5, Art. 6, Art. 9, Art. 13' },
  { id: 65, source_policy_id: 'mica-regulation', target_policy_id: 'aml-regulation', connection_type: 'complements', description: 'MiCA\'s comprehensive regulatory framework for crypto-asset service providers (CASPs) operates in conjunction with AML obligations to prevent the use of crypto-assets for money laundering, terrorist financing, and sanctions evasion. CASPs authorised under MiCA are classified as obliged entities under EU AML rules, subject to customer due diligence, suspicious transaction reporting, and transfer-of-funds requirements (the "travel rule"). This dual framework closes the regulatory gap that previously made crypto-assets attractive for illicit financial flows.', articles_source: 'Art. 59, Art. 60, Art. 68, Recital 9', articles_target: 'Art. 2(1), Art. 3, Art. 11-14' },
  { id: 66, source_policy_id: 'mica-regulation', target_policy_id: 'dora-regulation', connection_type: 'complements', description: 'DORA\'s digital operational resilience requirements apply to crypto-asset service providers (CASPs) that are authorised under MiCA, ensuring that these entities maintain adequate ICT risk management, incident reporting, and business continuity capabilities. As crypto-asset markets are inherently digital and technologically dependent, DORA\'s cybersecurity and resilience standards are particularly relevant. MiCA explicitly includes CASPs within DORA\'s scope, creating a coherent regulatory stack for digital finance.', articles_source: 'Art. 59, Art. 68, Recital 52', articles_target: 'Art. 2(1), Art. 5-16' },
  { id: 67, source_policy_id: 'psd2-directive', target_policy_id: 'instant-payments-regulation', connection_type: 'complements', description: 'The Instant Payments Regulation mandates that all EU payment service providers offering SEPA credit transfers must also offer instant payment functionality at no additional charge, building on the PSD2 payment services framework. PSD2 established the licensing and operational requirements for payment institutions, while the Instant Payments Regulation ensures that real-time settlement becomes universally available. This ensures that the single euro payments area delivers on its promise of seamless, instant cross-border transfers.', articles_source: 'Art. 2, Art. 4, Art. 5', articles_target: 'Art. 1, Art. 5a, Art. 5b' },
  { id: 68, source_policy_id: 'taxonomy-regulation', target_policy_id: 'green-bonds-regulation', connection_type: 'complements', description: 'The European Green Bonds Standard requires that at least 85% of bond proceeds be allocated to economic activities aligned with the EU Taxonomy, establishing a direct link between green capital markets and the EU\'s environmental classification system. This creates a gold standard for green bonds that provides investors with assurance that proceeds finance genuinely sustainable activities. The Taxonomy\'s technical screening criteria thus serve as the substantive benchmark for green bond eligibility.', articles_source: 'Art. 3, Art. 8, Art. 10, Delegated Acts', articles_target: 'Art. 3, Art. 4, Art. 6, Art. 8' },
  { id: 69, source_policy_id: 'habitats-directive', target_policy_id: 'nature-restoration-law', connection_type: 'complements', description: 'The Nature Restoration Law extends the conservation mandate of the Habitats Directive from protection of existing habitats to active restoration of degraded ecosystems, including areas outside the Natura 2000 network. While the Habitats Directive requires maintaining favourable conservation status for listed species and habitats, the NRL sets time-bound restoration targets for 2030 and 2050 with measurable indicators. The NRL\'s Art. 4 restoration targets directly reference habitat types listed in the Habitats Directive\'s Annex I.', articles_source: 'Art. 2, Art. 6, Annex I-II', articles_target: 'Art. 4, Art. 5, Art. 11, Annex I' },
  { id: 70, source_policy_id: 'birds-directive', target_policy_id: 'habitats-directive', connection_type: 'complements', description: 'The Birds Directive and Habitats Directive jointly form the cornerstone of EU nature conservation law, together establishing and managing the Natura 2000 network of protected areas. The Birds Directive (1979/2009) protects wild bird species and their habitats through Special Protection Areas (SPAs), while the Habitats Directive (1992) protects other species and habitats through Sites of Community Importance (SCIs). Together, the network covers approximately 18% of EU land area and 8% of marine territory.', articles_source: 'Art. 3, Art. 4, Annex I', articles_target: 'Art. 3, Art. 6, Annex I-IV' },
  { id: 71, source_policy_id: 'air-quality-directive', target_policy_id: 'zero-pollution-action-plan', connection_type: 'implements', description: 'The revised Ambient Air Quality Directive implements the Zero Pollution Action Plan\'s target of reducing premature deaths from air pollution by at least 55% by 2030 compared to 2005. The directive sets updated limit values for key pollutants (PM2.5, NO2, O3) that are closer to WHO guideline levels, with full alignment targeted by 2035. It strengthens citizens\' access to justice and entitlement to compensation for health damage caused by air quality standard breaches.', articles_source: 'Art. 1, Art. 7, Annex I-II', articles_target: 'Target 1, Action 1-2' },
  { id: 72, source_policy_id: 'drinking-water-directive', target_policy_id: 'water-framework-directive', connection_type: 'complements', description: 'The recast Drinking Water Directive sets quality parameters and monitoring requirements for water intended for human consumption, operating within the broader water management framework established by the WFD. While the WFD addresses water quality comprehensively (ecological and chemical status of all water bodies), the DWD provides specific standards at the point of abstraction and distribution. The DWD\'s risk-based approach to catchment-to-tap water safety planning integrates with WFD river basin management.', articles_source: 'Art. 1, Art. 5, Art. 7, Annex I', articles_target: 'Art. 4, Art. 7, Art. 13' },
  { id: 73, source_policy_id: 'farm-to-fork-strategy', target_policy_id: 'cap-strategic-plans', connection_type: 'complements', description: 'CAP Strategic Plans serve as the primary implementation vehicle for Farm to Fork sustainability targets in the agricultural sector, translating headline ambitions (50% pesticide reduction, 50% nutrient loss reduction, 25% organic farming) into operational policy instruments. The CAP\'s eco-schemes and enhanced conditionality requirements incentivise farming practices aligned with Farm to Fork objectives. Each Member State\'s Strategic Plan must demonstrate contribution to Farm to Fork targets through measurable result indicators.', articles_source: 'Section 2.1.5, Section 2.4', articles_target: 'Art. 6, Art. 28, Art. 31, Annex III' },
  { id: 74, source_policy_id: 'farm-to-fork-strategy', target_policy_id: 'organic-farming-regulation', connection_type: 'complements', description: 'The Organic Farming Regulation provides the production standards and certification framework for organic agriculture, which the Farm to Fork Strategy targets to cover 25% of EU agricultural land by 2030 (up from approximately 10% in 2021). The Farm to Fork Strategy\'s Organic Action Plan relies on the regulation\'s definition of organic production methods, labelling rules, and import equivalence standards. Achieving the 25% target requires both demand-side promotion and supply-side CAP support integrated through national organic action plans.', articles_source: 'Section 2.2.4', articles_target: 'Art. 1, Art. 3, Art. 5, Art. 30' },
  { id: 75, source_policy_id: 'just-transition-fund', target_policy_id: 'social-climate-fund', connection_type: 'complements', description: 'The Just Transition Fund and Social Climate Fund address different dimensions of the social equity challenge posed by the green transition. The JTF (EUR 17.5 billion) supports economic diversification and worker reskilling in regions most dependent on fossil fuels and carbon-intensive industries, while the SCF targets direct support for vulnerable households and micro-enterprises affected by carbon pricing in buildings and transport. Together they form a comprehensive social safety net for the climate transition, ensuring both regional and household-level fairness.', articles_source: 'Art. 1, Art. 4, Art. 8, Annex I', articles_target: 'Art. 1, Art. 3, Art. 6' },
  { id: 76, source_policy_id: 'just-transition-fund', target_policy_id: 'eu-green-deal', connection_type: 'implements', description: 'The Just Transition Fund is a key financial implementing instrument of the European Green Deal, ensuring that the climate transition does not leave behind regions heavily dependent on fossil fuels and carbon-intensive industries. With EUR 17.5 billion (2021-2027), it finances economic diversification, worker reskilling, site remediation, and social infrastructure in territories most affected by the transition. The JTF was explicitly announced as part of the Green Deal\'s Just Transition Mechanism in January 2020.', articles_source: 'Art. 1, Art. 4, Art. 8', articles_target: 'Section 2.1.1, Annex (Roadmap)' },
  { id: 77, source_policy_id: 'electricity-market-regulation', target_policy_id: 'renewable-energy-directive', connection_type: 'complements', description: 'The 2024 electricity market design reform enables better integration of variable renewable energy by establishing a framework for two-way Contracts for Difference (CfDs) for public support to new generation, and by strengthening demand response and energy storage provisions. Achieving RED III\'s 42.5% renewable target requires a market design that can absorb high shares of intermittent wind and solar generation while maintaining system adequacy. The reform also introduces the right for consumers to share and store renewable energy, enhancing distributed generation.', articles_source: 'Art. 19a-19d, Art. 7a, Art. 8a', articles_target: 'Art. 3(1), Art. 15a, Art. 21' },
  { id: 78, source_policy_id: 'hydrogen-gas-package', target_policy_id: 'ten-e-regulation', connection_type: 'complements', description: 'The revised TEN-E Regulation provides the planning and investment framework for cross-border hydrogen infrastructure, including dedicated hydrogen pipelines and repurposed natural gas networks. The hydrogen and gas market decarbonisation package establishes the regulatory rules for network access, tariffs, and unbundling that will govern the hydrogen infrastructure developed under TEN-E. Together, they create a coherent framework for building an EU-wide hydrogen backbone connecting production hubs with industrial demand centres.', articles_source: 'Art. 1, Art. 14-22, Recital 5', articles_target: 'Art. 4, Annex I(3), Annex II' },
  { id: 79, source_policy_id: 'repowereu-plan', target_policy_id: 'renewable-energy-directive', connection_type: 'complements', description: 'REPowerEU accelerated the EU\'s renewable energy ambition beyond original Fit for 55 proposals in response to Russia\'s invasion of Ukraine, contributing to the increase of the RED III target to 42.5%. The plan introduced emergency permitting measures for renewable energy projects, designating them as overriding public interest, and proposed additional solar, wind, and heat pump deployment targets. REPowerEU\'s permitting acceleration provisions were subsequently integrated into the RED III recast.', articles_source: 'Section 2.2, Section 3.1', articles_target: 'Art. 3(1), Art. 15b, Art. 16' },
  { id: 80, source_policy_id: 'repowereu-plan', target_policy_id: 'hydrogen-gas-package', connection_type: 'complements', description: 'REPowerEU set a target of 10 million tonnes of domestic renewable hydrogen production and 10 million tonnes of imports by 2030, which the hydrogen and gas market decarbonisation package provides the regulatory infrastructure to deliver. The plan also launched the European Hydrogen Bank and hydrogen auctions under the Innovation Fund to bridge the cost gap. The gas package\'s provisions on network planning, third-party access, and market rules are essential for the physical delivery of REPowerEU\'s hydrogen ambitions.', articles_source: 'Section 3.2, Section 5.2', articles_target: 'Art. 1, Art. 5, Art. 14-22' },
  { id: 81, source_policy_id: 'european-defence-fund', target_policy_id: 'european-defence-industrial-strategy', connection_type: 'complements', description: 'The European Defence Fund provides EUR 7.9 billion (2021-2027) for collaborative research and capability development projects that implement the European Defence Industrial Strategy\'s vision of strengthening the EU\'s defence technological and industrial base. The EDF finances both research (Pillar I) and development (Pillar II) of defence capabilities identified as priorities under the Capability Development Plan. The strategy sets the political direction and capability priorities that the EDF translates into funded collaborative projects.', articles_source: 'Art. 1, Art. 3, Art. 4, Art. 12', articles_target: 'Section 3, Section 5' },
  { id: 82, source_policy_id: 'eecc-directive', target_policy_id: 'gigabit-infrastructure-act', connection_type: 'complements', description: 'The European Electronic Communications Code establishes the regulatory framework for telecom networks and services, while the Gigabit Infrastructure Act removes bottlenecks in physical infrastructure deployment, including streamlined permitting, access to existing infrastructure, and in-building wiring requirements. The EECC covers market access, spectrum management, and universal service obligations, while the GIA focuses on reducing the civil engineering costs that account for up to 80% of broadband deployment expenses. Together they enable the EU\'s connectivity targets of gigabit for all by 2030.', articles_source: 'Art. 1, Art. 3, Art. 72-80', articles_target: 'Art. 1, Art. 3-8, Art. 11' },
  { id: 83, source_policy_id: 'roaming-regulation', target_policy_id: 'eecc-directive', connection_type: 'complements', description: 'The Roaming Regulation builds on the EECC\'s framework for electronic communications to ensure that consumers can use their mobile services across EU borders at domestic prices (roam like at home). The EECC establishes the general regulatory environment for mobile operators, while the Roaming Regulation adds specific wholesale price caps and quality-of-service requirements for intra-EU roaming. The 2022 recast extended the roam-like-at-home regime to 2032 and added provisions on emergency communications and value-added services while roaming.', articles_source: 'Art. 1, Art. 3, Art. 7, Art. 8', articles_target: 'Art. 1, Art. 3, Art. 92, Art. 98' },
  { id: 84, source_policy_id: 'green-claims-directive', target_policy_id: 'ecodesign-sustainable-products', connection_type: 'complements', description: 'The Green Claims Directive establishes rules on the substantiation and communication of environmental claims, preventing greenwashing that could undermine consumer trust in the Ecodesign Regulation\'s sustainability standards. While the Ecodesign Regulation sets the objective performance requirements products must meet, the Green Claims Directive ensures that marketing communications about environmental attributes are accurate, comparable, and verifiable. Both instruments contribute to empowering consumers to make informed, sustainable purchasing decisions.', articles_source: 'Art. 1, Art. 3, Art. 5, Art. 10', articles_target: 'Art. 7, Art. 8, Art. 14' },
  { id: 85, source_policy_id: 'soil-monitoring-law', target_policy_id: 'nature-restoration-law', connection_type: 'complements', description: 'The Soil Monitoring Law establishes a harmonised EU framework for assessing, monitoring, and improving soil health, generating the data needed to track progress on Nature Restoration Law ecosystem restoration targets. Healthy soils are fundamental to the restoration of terrestrial ecosystems, as soil biodiversity underpins ecosystem functions including carbon sequestration, water filtration, and nutrient cycling. The NRL\'s targets for agricultural ecosystem restoration particularly depend on soil condition improvements that the monitoring framework will measure.', articles_source: 'Art. 1, Art. 4, Art. 7-9', articles_target: 'Art. 9, Art. 11, Art. 12' },
  { id: 86, source_policy_id: 'collective-redress-directive', target_policy_id: 'gdpr', connection_type: 'complements', description: 'The Collective Redress Directive enables qualified entities to bring representative actions on behalf of groups of consumers for violations of GDPR and over 60 other EU legal instruments, complementing the individual data subject rights provided under GDPR. This provides a collective enforcement mechanism for data protection violations that affect large numbers of individuals, such as data breaches or systematic non-compliance by platform operators. The directive closes an enforcement gap where individual claims are too small to justify litigation.', articles_source: 'Art. 1, Art. 2, Annex I', articles_target: 'Art. 77-84, Art. 80' },
  { id: 87, source_policy_id: 'seveso-directive', target_policy_id: 'industrial-emissions-directive', connection_type: 'complements', description: 'The Seveso III Directive and the IED jointly regulate industrial installations through complementary approaches: Seveso focuses on the prevention and control of major accidents involving dangerous substances, while the IED addresses day-to-day pollution from industrial operations through integrated permitting and BAT requirements. Many large industrial facilities fall under both directives, requiring coordinated compliance with accident prevention (Seveso) and emissions control (IED). National competent authorities typically conduct joint inspections to ensure coherent enforcement.', articles_source: 'Art. 3, Art. 5-12, Annex I-II', articles_target: 'Art. 5, Art. 14, Art. 23, Annex I' },
  { id: 88, source_policy_id: 'ipi-regulation', target_policy_id: 'foreign-subsidies-regulation', connection_type: 'complements', description: 'The International Procurement Instrument and the Foreign Subsidies Regulation together protect EU public procurement markets from distortions caused by third-country practices. The IPI addresses countries that restrict EU companies\' access to their procurement markets by enabling reciprocal access restrictions, while the FSR reviews foreign subsidies that distort competition in EU procurement procedures. Together they ensure that public contracts are awarded on a level playing field, free from both market access barriers and subsidy-driven underbidding.', articles_source: 'Art. 1, Art. 3-6, Art. 8', articles_target: 'Art. 28, Art. 29-35, Art. 37' },
  { id: 89, source_policy_id: 'crr-regulation', target_policy_id: 'solvency2-directive', connection_type: 'complements', description: 'The Capital Requirements Regulation (for banks and investment firms) and the Solvency II Directive (for insurance and reinsurance undertakings) together form the EU\'s prudential supervisory framework for the financial sector. The CRR sets risk-based capital requirements, leverage ratios, and liquidity standards for banking, while Solvency II establishes risk-based capital requirements and governance standards for insurers. Both frameworks are being amended to integrate climate-related financial risk, including transition risk and physical risk assessments.', articles_source: 'Art. 1, Art. 92, Art. 430-455', articles_target: 'Art. 1, Art. 100-131, Art. 44-46' },
  { id: 90, source_policy_id: 'mifid2-directive', target_policy_id: 'sfdr', connection_type: 'complements', description: 'MiFID II\'s suitability assessment requirements for investment advice and portfolio management have been amended to integrate sustainability preferences, directly linking to the SFDR\'s product classification system (Art. 8 and Art. 9 products). Investment firms must ask clients about their sustainability preferences and match these to products classified under SFDR. This creates a regulatory chain from product-level sustainability disclosure (SFDR) through to point-of-sale integration (MiFID II), ensuring sustainability information reaches end investors.', articles_source: 'Art. 25(2), Delegated Regulation Art. 54(5)-(12)', articles_target: 'Art. 2(17), Art. 8, Art. 9' },
];

export const citations: Citation[] = [];

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getPolicy(id: string): Policy | undefined {
  return policies.find(p => p.id === id);
}

export function getPolicyConnections(id: string): (PolicyConnection & { source_title?: string; source_domain?: string; target_title?: string; target_domain?: string })[] {
  return connections
    .filter(c => c.source_policy_id === id || c.target_policy_id === id)
    .map(c => ({
      ...c,
      source_title: policies.find(p => p.id === c.source_policy_id)?.short_title,
      source_domain: policies.find(p => p.id === c.source_policy_id)?.domain,
      target_title: policies.find(p => p.id === c.target_policy_id)?.short_title,
      target_domain: policies.find(p => p.id === c.target_policy_id)?.domain,
    }));
}

export function getPolicyCitations(id: string): Citation[] {
  return citations.filter(c => c.policy_id === id);
}

export function getGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = policies.map(p => ({
    id: p.id,
    title: p.title,
    short_title: p.short_title,
    domain: p.domain,
    status: p.status,
    document_type: p.document_type,
    connections: connections.filter(c => c.source_policy_id === p.id || c.target_policy_id === p.id).length,
  }));
  const links: GraphLink[] = connections.map(c => ({
    source: c.source_policy_id,
    target: c.target_policy_id,
    connection_type: c.connection_type,
    description: c.description,
  }));
  return { nodes, links };
}

// Search only metadata fields — not full_text
export function searchPolicies(query: string): Policy[] {
  const q = query.toLowerCase();
  return policies.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.short_title.toLowerCase().includes(q) ||
    p.summary.toLowerCase().includes(q)
  );
}

// Lazy-load full text from API (stored as separate files, not in the JS bundle)
export async function fetchPolicyFullText(id: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/policy-text?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.full_text || null;
  } catch {
    return null;
  }
}
