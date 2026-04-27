'use client';

import { useState, useMemo } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface FaqSource {
  label: string;
  href: string;
}

interface FaqItem {
  id: string;
  /** The misleading claim / misconception to prebunk. */
  claim?: string;
  /** The actual question asked. */
  question: string;
  /** Short, bolded take-away shown above the explanation. */
  takeaway: string;
  /** Paragraphs of explanation grounded in ESABCC advice. */
  paragraphs: string[];
  /** Related ESABCC reports. */
  sources: FaqSource[];
}

interface FaqTopic {
  id: string;
  label: string;
  tagline: string;
  intro: string;
  items: FaqItem[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Content — grounded in ESABCC published reports (see /esabcc-reports)
// ──────────────────────────────────────────────────────────────────────────────

const REPORT_2040 = {
  label: '2040 target & GHG budget (ESABCC, 2023)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
};
const REPORT_CL_AMEND = {
  label: 'Amending the European Climate Law (ESABCC, 2025)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications',
};
const REPORT_POLICY_GAP = {
  label: 'Towards EU climate neutrality: progress, policy gaps and opportunities (ESABCC, 2024)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
};
const REPORT_CDR = {
  label: 'Scaling up carbon dioxide removals (ESABCC, 2025)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu',
};
const REPORT_AGRI = {
  label: 'Climate adaptation and mitigation in the agri-food system (ESABCC, 2026)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/climate-adaptation-and-mitigation-in-the-agri-food-system-recommendations-for-coherent-eu-policies',
};
const REPORT_ENERGY_CRISIS = {
  label: 'Policy responses to the energy crisis (ESABCC, 2023)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/addressing-the-energy-crisis-while-delivering-on-eus-climate-objectives-recommendations-to-policy-makers',
};
const REPORT_TEN_E_SCEN = {
  label: 'Advice on TEN-E draft scenarios (ESABCC, 2024)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-climate-neutral-and-resilient-energy-networks-across-europe-advice-on-draft-scenarios-under-the-eu-regulation-on-trans-european-energy-networks',
};
const REPORT_INFRA_CBA = {
  label: 'Energy infrastructure cost\u2013benefit analysis (ESABCC, 2023)',
  href: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure-recommendations-on-an-energy-system-wide-cost-benefit-analysis',
};

const TOPICS: FaqTopic[] = [
  {
    id: 'general',
    label: 'General',
    tagline: '2040 target · international credits · competitiveness',
    intro:
      'Common questions about the EU-wide 2040 climate target, the role of international credits, and the relationship between climate action and EU competitiveness. Answers draw on the Advisory Board\u2019s 2023 scientific advice on the 2040 target and its 2025 advice on amending the European Climate Law.',
    items: [
      {
        id: 'why-90-95',
        claim: '"A 90\u201395% cut by 2040 is too ambitious and unrealistic."',
        question: 'Why did the ESABCC recommend a 90\u201395% domestic net emission reduction by 2040?',
        takeaway:
          'A 90\u201395% net cut by 2040 is the range the Advisory Board finds both feasible and fair, based on modelled pathways consistent with 1.5\u00b0C and the EU\u2019s legal climate-neutrality commitment.',
        paragraphs: [
          'The Advisory Board screened hundreds of integrated assessment model pathways for feasibility (technology deployment rates, behavioural change, land-use and bioenergy constraints) and for consistency with the EU\u2019s fair share of the remaining 1.5\u00b0C carbon budget.',
          'After filtering out pathways with high feasibility concerns \u2014 for instance, implausibly fast CCS or hydrogen scale-up \u2014 the remaining set converges on an 88\u201395% net reduction by 2040 relative to 1990, with a recommended range of 90\u201395% as a domestic target.',
          'The Advisory Board re-affirmed the 90\u201395% range in its 2025 advice on amending the European Climate Law, noting that recent progress (a 9% fall in EU emissions in 2023, accelerating renewables and electrification) has strengthened, not weakened, the feasibility case.',
        ],
        sources: [REPORT_2040, REPORT_CL_AMEND],
      },
      {
        id: 'international-credits',
        claim: '"The EU can hit its 2040 target cheaply by buying international offsets."',
        question:
          'Can international credits substitute for domestic emission reductions in the 2040 target?',
        takeaway:
          'No. The Advisory Board is clear that the 2040 target should be met through domestic action. International credits carry integrity risks and would undermine the investments needed for EU climate neutrality.',
        paragraphs: [
          'The European Climate Law requires EU climate targets to be met through domestic action. Feasible and fair scenarios show that meeting the 2050 climate-neutrality objective requires substantial domestic effort by 2040 \u2014 credits from outside the EU cannot close that gap without jeopardising the pathway.',
          'The Advisory Board flags significant risks of international credits: weak additionality, uncertain permanence, double counting, and the danger of diverting investment away from the structural EU transformation (grids, renewables, industry) that climate neutrality depends on.',
          'International cooperation under Article 6 of the Paris Agreement remains important, but as a complement \u2014 not a substitute. The Board suggests the role of high-quality international removal credits should be explored only after climate neutrality is reached domestically, to help deliver net-negative emissions.',
        ],
        sources: [REPORT_CL_AMEND, REPORT_2040],
      },
      {
        id: 'competitiveness',
        claim: '"Ambitious climate policy is bad for EU competitiveness."',
        question: 'Is the 2040 target in tension with EU competitiveness and strategic autonomy?',
        takeaway:
          'The Advisory Board finds the opposite: a credible, ambitious climate target is a pillar of EU competitiveness, energy security and strategic autonomy in today\u2019s geopolitical context.',
        paragraphs: [
          'The 2025 advice argues that climate, security and competitiveness challenges are interlinked. Faster deployment of renewables, grid modernisation and electrification have already reduced EU dependence on imported fossil fuels, stabilising prices and strengthening strategic autonomy.',
          'A stable, science-based 2040 target provides the investment certainty that European industry needs to compete in fast-growing global clean-technology markets. Backtracking would raise capital costs, delay industrial transformation and leave the EU exposed to renewed fossil-price shocks.',
          'The Advisory Board frames climate policy as part of \u2014 not separate from \u2014 the EU\u2019s Competitiveness Compass and Clean Industrial Deal: the transition is the industrial strategy.',
        ],
        sources: [REPORT_CL_AMEND],
      },
      {
        id: 'why-2040-waypoint',
        question: 'Why set a 2040 target at all \u2014 isn\u2019t 2030 and 2050 enough?',
        takeaway:
          'The 2040 waypoint turns the 2050 neutrality goal into an accountable trajectory and shapes the investments made this decade.',
        paragraphs: [
          'The European Climate Law mandates an intermediary 2040 target to ensure progress between the 2030 target (\u201355% net) and 2050 climate neutrality. Without it, the pace of emission reductions in the 2030s would be left unanchored.',
          'The Advisory Board also highlights 2035 as an important waypoint towards 2040, helping align the EU\u2019s next Nationally Determined Contribution under the Paris Agreement with a credible long-term trajectory.',
        ],
        sources: [REPORT_CL_AMEND, REPORT_2040],
      },
      {
        id: 'energy-security',
        claim: '"The climate transition has made the EU more energy-insecure."',
        question: 'Does ambitious climate policy weaken or strengthen EU energy security?',
        takeaway:
          'It strengthens it. The 2022\u201323 energy crisis was rooted in fossil-fuel import dependency; renewables, electrification and efficiency are what reduced EU exposure and stabilised prices.',
        paragraphs: [
          'The Advisory Board\u2019s 2023 advice on the energy crisis is explicit that the root cause was the EU\u2019s high dependency on imported fossil fuels \u2014 especially Russian gas \u2014 not the climate transition. Renewables expansion and efficiency measures helped the EU cope better than expected with supply cuts.',
          'The 2025 advice on amending the European Climate Law reinforces this: recent progress on renewables, grid modernisation and electrification has already reduced EU dependence on imported fossil fuels, stabilising prices and strengthening strategic autonomy.',
          'Slowing the transition would leave the EU exposed to renewed fossil-price shocks and deepen import dependency \u2014 the opposite of energy security.',
        ],
        sources: [REPORT_ENERGY_CRISIS, REPORT_CL_AMEND],
      },
      {
        id: 'crisis-lessons',
        question: 'What does the 2022\u201323 energy crisis mean for EU climate policy?',
        takeaway:
          'It reinforces the case for tackling fossil-fuel dependency itself \u2014 reducing demand, doubling renewables deployment and electrifying end-uses \u2014 rather than replacing one fossil supplier with another.',
        paragraphs: [
          'The 2023 advice sets out eight recommendations: tackle root causes; save energy; at least double the rate of renewables expansion; boost electrification; provide direct income support for vulnerable consumers; ensure gas diversification is compatible with the transition; ensure sustainable biomass; do not invest in new coal and oil infrastructure.',
          'The Advisory Board urges the EU and its Member States to avoid any infrastructure investments and emergency measures that would result in long-term carbon lock-ins \u2014 including oversized new gas infrastructure, new coal or oil capacity.',
          'The 2025 climate-law advice frames the lesson plainly: the drivers that actually reduced EU fossil dependency were renewables, grids and electrification \u2014 so the response is to scale those up, not to pause the transition.',
        ],
        sources: [REPORT_ENERGY_CRISIS, REPORT_CL_AMEND],
      },
    ],
  },
  {
    id: 'policy-gap',
    label: 'Policy Gap Report',
    tagline: 'sectoral gaps \u00b7 Fit for 55 \u00b7 fossil fuel subsidies',
    intro:
      'The Advisory Board\u2019s 2024 assessment \u201cTowards EU climate neutrality: progress, policy gaps and opportunities\u201d identified where current EU policies are on track, where they are not, and where they actively pull in the wrong direction. Gaps are classified as policy gaps, ambition gaps, implementation gaps and policy inconsistencies across six sectors (energy supply, industry, transport, buildings, agriculture, LULUCF) and cross-cutting issues.',
    items: [
      {
        id: 'on-track',
        claim: '"The EU is on track to meet its climate targets."',
        question: 'Is the EU on track to reach its 2030 and 2050 climate targets?',
        takeaway:
          'Not yet. Recent emission reductions are encouraging, but Member States\u2019 projections fall short of \u221255% by 2030, and the full trajectory to climate neutrality requires much faster implementation across every sector.',
        paragraphs: [
          'In 2023 EU net GHG emissions were ~37% below 1990 levels (EEA 2024). To hit the \u221255% 2030 target, the annual pace of reductions must more than double the 2005\u20132022 average.',
          'At the time of the 2024 assessment, Member States\u2019 projections \u201cwith additional measures\u201d pointed to only around \u221249% by 2030; the Commission\u2019s assessment of draft updated NECPs pointed to \u221251%. The biggest gap sits in the Effort Sharing sectors (buildings, transport, agriculture) and in LULUCF, where the carbon sink has been declining sharply since 2015.',
          'The Advisory Board concludes that current EU climate policy \u2014 chiefly the Fit for 55 package \u2014 can close much of the gap, but only if implementation is rapid, robust and effective, especially at Member State level.',
        ],
        sources: [REPORT_POLICY_GAP],
      },
      {
        id: 'biggest-sectoral-gaps',
        question: 'Which sectors have the largest policy gaps?',
        takeaway:
          'The land sink (LULUCF), buildings, transport and agriculture \u2014 the sectors where pricing is weak or absent and where non-CO\u2082 emissions dominate.',
        paragraphs: [
          'LULUCF: the EU land sink has been shrinking since 2015, driven by ageing forests, disturbance and intensifying climate stress. Existing policies are insufficient to reverse the decline, making LULUCF the single largest area needing a \u201cstep change\u201d in policy effort.',
          'Buildings and road transport: emission reductions depend on national Effort Sharing targets and on the phased roll-out of ETS2: trading begins in 2027 with first compliance in 2028 (the EU co-legislators postponed full operation by one year in November 2025). The Board flags an ambition and implementation gap, with renovation rates and zero-emission vehicle uptake still below benchmark trajectories.',
          'Agriculture: emissions have plateaued. There is no dedicated price signal on agricultural GHG emissions and CAP payments still reward GHG-intensive practices, which the Board classifies as a policy inconsistency.',
          'Industry and energy supply are closer to track thanks to the ETS, Fit for 55 revisions and REPowerEU, but still face implementation gaps on permitting, grids and industrial hydrogen/CCS deployment.',
        ],
        sources: [REPORT_POLICY_GAP],
      },
      {
        id: 'fossil-subsidies',
        claim: '"Fossil fuel subsidies have already been phased out in the EU."',
        question: 'Why are fossil fuel subsidies still one of the biggest inconsistencies in EU climate policy?',
        takeaway:
          'Fossil fuel subsidies directly undermine the climate transition and, despite repeated EU commitments, have not fallen \u2014 fossil-fuel support reached \u20ac123 billion in 2022 (COM(2023)651) during the energy crisis.',
        paragraphs: [
          'The Advisory Board describes fossil fuel subsidies as locking in emissions, crowding out climate investment and reducing the fiscal space available to support the transition. Commitments to phase them out exist, but very few Member States have set clear deadlines and pathways in their NECPs \u2014 an implementation gap.',
          'Emergency state-aid frameworks adopted in response to the 2022 crisis extended large-scale fossil-fuel support. The Board warns that continued extensions risk a policy inconsistency with the EU climate-neutrality objective.',
          'Recommendation: a full, urgent phase-out of fossil fuel subsidies; redirect support for vulnerable households into targeted, well-designed interventions that preserve incentives for energy savings and renewables.',
        ],
        sources: [REPORT_POLICY_GAP],
      },
      {
        id: 'carbon-pricing-gaps',
        question: 'What are the remaining gaps in EU carbon pricing?',
        takeaway:
          'Coverage is expanding with ETS2 and CBAM, but agriculture remains largely unpriced, the Energy Taxation Directive is outdated, and several harmful tax exemptions persist.',
        paragraphs: [
          'The ETS and upcoming ETS2 (buildings and road transport) cover most energy and industrial emissions, but agriculture \u2014 roughly a third of EU net GHG emissions when the full agri-food system is considered \u2014 has no dedicated GHG pricing instrument.',
          'The current Energy Taxation Directive (ETD) gives preferential treatment to emission-intensive fuels and exempts aviation, maritime and professional road transport, agriculture, energy-intensive industry and heating. The Advisory Board identifies the ETD revision as a pending Fit for 55 file whose adoption is central to aligning energy taxation with climate neutrality.',
          'CBAM addresses some carbon-leakage risks, but the Board stresses the need for continued monitoring of its effectiveness, complementary measures for exporters, and extension of coverage as the ETS evolves.',
        ],
        sources: [REPORT_POLICY_GAP],
      },
      {
        id: 'innovation-finance-skills',
        question: 'Beyond sectoral gaps, which cross-cutting gaps matter most?',
        takeaway:
          'Finance and investment, innovation, skills, public engagement and governance are all flagged as cross-cutting gaps that can slow or accelerate the transition across every sector.',
        paragraphs: [
          'Finance: the scale of public and private investment required is not fully reflected in current EU programmes; the Board calls for better coordination between NECPs, the MFF, the Social Climate Fund and Member-State fiscal frameworks.',
          'Innovation and skills: clean-tech RD&D spending has not kept pace with competitors, and shortages of skilled workers (grids, renewables, heat pumps, buildings retrofitting) are already a binding constraint on deployment.',
          'Governance and public engagement: NECP processes show implementation gaps on public consultation and multi-level dialogue, and the EU has been in breach of the Aarhus Convention on access to justice for some state-aid decisions. The Commission adopted a State-aid internal-review mechanism in May 2025 to remedy the non-compliance.',
        ],
        sources: [REPORT_POLICY_GAP],
      },
      {
        id: 'price-caps-subsidies',
        claim: '"Broad price caps and energy subsidies are the right way to protect consumers."',
        question: 'Why does the Advisory Board caution against broad price caps and consumption subsidies?',
        takeaway:
          'Universal price interventions dampen the signal to save energy, tend to be regressive and are fiscally expensive. Direct income support targeted at vulnerable households works better.',
        paragraphs: [
          'Universal price caps and across-the-board consumption subsidies benefit higher consumers most, weaken efficiency incentives and carry large fiscal costs \u2014 fossil-fuel support reached \u20ac123 billion EU-wide in 2022 (COM(2023)651) during the energy crisis.',
          'The Advisory Board recommends direct income support for vulnerable consumers, complemented by help for energy-inefficient low-income households (renovation support, heat-pump subsidies) to overcome upfront-cost and split-incentive barriers.',
          'The 2024 policy-gap assessment classifies the repeated extension of emergency fossil-fuel support as a policy inconsistency with the climate-neutrality objective.',
        ],
        sources: [REPORT_ENERGY_CRISIS, REPORT_POLICY_GAP],
      },
      {
        id: 'infrastructure-planning-gap',
        question: 'What are the main gaps in EU energy-infrastructure and grids planning?',
        takeaway:
          'TEN-E joint scenarios are not yet fully consistent with EU climate neutrality, climate resilience is under-addressed, and the cost\u2013benefit analysis does not systematically reflect adaptation, renewables integration and system-wide benefits.',
        paragraphs: [
          'The Advisory Board\u2019s 2024 opinion on draft TEN-E joint scenarios found that the distributed-energy scenario\u2019s 2030\u20132050 GHG budget exceeds the Board\u2019s recommended range, CCS/CCU and hydrogen imports are set above feasibility benchmarks, and scenarios rely on largely outdated 2023 data that do not reflect the latest NECPs.',
          'Climate risks to infrastructure \u2014 droughts, floods, heat, storms \u2014 are not sufficiently considered in scenario building or project design. The 2023 cost\u2013benefit analysis recommendations ask for climate adaptation costs and measures to be explicitly assessed and for scenarios and sensitivities aligned with a warmer world.',
          'Beyond fixing the scenarios, the policy gap is systemic: electricity transmission and distribution grids, offshore interconnections, storage and a dedicated CO\u2082 transport and storage network need to be treated as the backbone of a climate-neutral EU \u2014 not as optional add-ons.',
        ],
        sources: [REPORT_TEN_E_SCEN, REPORT_INFRA_CBA, REPORT_POLICY_GAP],
      },
    ],
  },
  {
    id: 'cdr',
    label: 'Carbon Dioxide Removals',
    tagline: 'technology readiness \u00b7 scale-up \u00b7 mitigation deterrence',
    intro:
      'Carbon dioxide removals (CDR) capture CO\u2082 from the atmosphere and store it \u2014 either temporarily in forests, soils and wood products, or permanently in geological reservoirs (e.g. via BECCS or DACCS). The Advisory Board\u2019s 2025 report \u201cScaling up carbon dioxide removals\u201d sets out nine recommendations for a fast but safe scale-up that avoids crowding out emission reductions.',
    items: [
      {
        id: 'why-need-cdr',
        question: 'Why does the EU need carbon dioxide removals in addition to cutting emissions?',
        takeaway:
          'Removals are needed to balance residual emissions from activities with no or limited mitigation alternatives (heavy industry, aviation, maritime, agriculture) and to pursue net-negative emissions after 2050.',
        paragraphs: [
          'Even with maximum feasible decarbonisation, some emissions will remain by 2050 in sectors such as aviation, shipping, heavy industry and agriculture. Removals compensate for those residual emissions to reach net-zero and then go net-negative, as required by the European Climate Law.',
          'The Advisory Board stresses that \u201cemission reductions and carbon dioxide removals should be pursued in parallel, and one cannot substitute for the other\u201d. Removals are a complement to mitigation, not a licence to delay it.',
        ],
        sources: [REPORT_CDR],
      },
      {
        id: 'tech-readiness',
        claim: '"BECCS and DACCS are mature technologies ready to deploy at scale."',
        question: 'What is the technology-readiness status of the main removal methods?',
        takeaway:
          'Temporary removals (forests, soils, wood products) are already deployed but under climate stress; permanent removals (BECCS, DACCS, mineralisation) are still at low commercial readiness and need innovation support.',
        paragraphs: [
          'The EU land sink currently provides nearly all EU removals, but it has declined by roughly one third over the past decade and is increasingly vulnerable to droughts, pests, fires and storms. Recovery takes years even once policies are in place.',
          'Permanent removal methods such as BECCS and DACCS are technologically demonstrated but remain commercially immature, capital-intensive and reliant on shared CO\u2082 transport and storage infrastructure that is still being built. Costs are high and deployment is limited.',
          'The Advisory Board recommends prioritising Innovation Fund support for CCS towards permanent removals, expanding Horizon Europe / LIFE funding across removal methods, and using demand-pull instruments (public procurement) to foster learning-by-doing.',
        ],
        sources: [REPORT_CDR],
      },
      {
        id: 'scale-up',
        question: 'How should the EU scale up removals responsibly?',
        takeaway:
          'Through separate, legally-binding targets for emission reductions, permanent removals and temporary removals; robust MRV; dedicated funding; and CO\u2082 transport and storage infrastructure.',
        paragraphs: [
          'Recommendation 1 of the 2025 report is to set \u2018separate legally-binding targets\u2019 for gross emission reductions, permanent removals and temporary removals, with near-, medium- and long-term milestones. This prevents one from silently compensating for shortfalls in another.',
          'Recommendation 2 requires robust monitoring, reporting and verification at both activity and national level, building on the Carbon Removals and Carbon Farming (CRCF) Regulation and differentiating certificates by type (permanent, temporary, emission reduction).',
          'Recommendations 4\u20135 focus on innovation funding and on securing CO\u2082 transport and storage infrastructure through the Net-Zero Industry Act, Connecting Europe Facility, Innovation Fund and TEN-E \u2014 with restrictions preventing fossil-CCS from locking in emissions in sectors that can decarbonise.',
        ],
        sources: [REPORT_CDR],
      },
      {
        id: 'mitigation-deterrence',
        claim: '"We can rely on future removals so we don\u2019t have to cut emissions as fast."',
        question: 'What is mitigation deterrence and how is the EU guarding against it?',
        takeaway:
          'Mitigation deterrence is the risk that the prospect of future CDR weakens today\u2019s incentives to cut emissions. The Advisory Board builds explicit safeguards against it into every recommendation on removals.',
        paragraphs: [
          'Because CDR promises to remove CO\u2082 later, it can \u2014 if misused \u2014 justify delaying emission cuts today. This is mitigation deterrence. The danger is that delayed action increases cumulative emissions and the risk of overshoot.',
          'Safeguards recommended by the Advisory Board include: separate legally-binding targets (Rec. 1) so removals cannot substitute for abatement; quantitative and qualitative limits on integrating permanent removals into the EU ETS (Rec. 6); a distinct pricing system for LULUCF removals (Rec. 7); and extended emitter responsibility requiring today\u2019s emitters to pay for the future removal of what they emit (Rec. 8).',
          'The Board is explicit: \u201cefforts to scale up removals should not deter the EU from accelerating investments to support drastic emission reductions.\u201d',
        ],
        sources: [REPORT_CDR],
      },
      {
        id: 'ets-integration',
        question: 'Should permanent removals be integrated into the EU ETS?',
        takeaway:
          'Yes, but only gradually and under strict conditions \u2014 robust certification first, quantitative and qualitative limits, and a governance framework that preserves incentives for deep emission reductions.',
        paragraphs: [
          'Recommendation 6 proposes that the EU \u201cprogressively integrate permanent removals into the EU ETS\u201d as part of the ETS revision for after 2040, to provide a durable price signal and prepare for net-zero and net-negative emissions.',
          'Conditions are explicit: robust MRV and certification must come first; limits must be set so that removals cannot swap one-for-one with unabated emissions; and an institutional framework must manage the transition and support early-stage deployment. Otherwise the risk of mitigation deterrence and price-cap effects is too high.',
          'For temporary (land-sector) removals, a separate pricing and reward system is proposed (Rec. 7), reflecting reversal risk and the different sustainability trade-offs involved.',
        ],
        sources: [REPORT_CDR],
      },
      {
        id: 'co2-infrastructure',
        question: 'What role does CO\u2082 transport and storage infrastructure play in delivering removals?',
        takeaway:
          'A dedicated CO\u2082 transport and storage network is a prerequisite for scaling permanent removals (BECCS, DACCS, mineralisation) and for a limited, targeted use of CCS in hard-to-abate sectors.',
        paragraphs: [
          'Permanent removals depend on shared CO\u2082 transport and storage infrastructure that is still being built. Without it, projects cannot be commissioned at the scale required to complement emission reductions.',
          'The Advisory Board\u2019s 2025 CDR report recommends securing this infrastructure through the Net-Zero Industry Act, Connecting Europe Facility, Innovation Fund and TEN-E \u2014 treating CO\u2082 networks as strategic infrastructure on a par with electricity grids.',
          'The 2024 advice on TEN-E joint scenarios likewise stresses that CCS, CCU and removals must be properly distinguished in infrastructure planning, and that scenarios not confuse fossil-CCS with permanent CDR.',
        ],
        sources: [REPORT_CDR, REPORT_TEN_E_SCEN],
      },
      {
        id: 'fossil-ccs-vs-cdr',
        claim: '"Fossil-CCS and permanent removals are basically the same thing."',
        question: 'How should fossil-CCS be treated differently from permanent carbon removals?',
        takeaway:
          'Fossil-CCS only reduces emissions at the point of capture; it is not a removal. Access to shared CO\u2082 infrastructure and public support should be restricted to activities with no or limited mitigation alternatives.',
        paragraphs: [
          'Carbon removals take CO\u2082 out of the atmosphere and store it durably; fossil-CCS captures CO\u2082 at an emitting facility. The two should not be lumped together in targets, certification or infrastructure access.',
          'The Advisory Board recommends prioritising Innovation Fund support for CCS towards permanent removals (BECCS, DACCS, mineralisation) and restricting fossil-CCS use to sectors with no or limited mitigation alternatives \u2014 avoiding lock-in in sectors that can decarbonise directly.',
          'The 2024 TEN-E advice warns that draft scenarios blur this distinction, and the 2023 cost\u2013benefit analysis recommendations call for GHG accounting to distinguish clearly between emission reductions, permanent removals and temporary removals.',
        ],
        sources: [REPORT_CDR, REPORT_TEN_E_SCEN, REPORT_INFRA_CBA],
      },
    ],
  },
  {
    id: 'agriculture',
    label: 'Agriculture',
    tagline: 'CAP \u00b7 GHG pricing \u00b7 diets \u00b7 food system \u00b7 funding',
    intro:
      'The EU agri-food system accounts for roughly a third of EU net GHG emissions, employs around 30 million people and manages 38% of EU land (Eurostat, utilised agricultural area). Climate-related losses already reach about \u20ac28 bn/year and are projected to rise towards \u20ac40 bn/year by mid-century. The Advisory Board\u2019s 2026 report \u201cClimate adaptation and mitigation in the agri-food system\u201d sets out six recommendations for a coherent EU policy mix.',
    items: [
      {
        id: 'cap-reform',
        claim: '"The Common Agricultural Policy already rewards climate-friendly farming."',
        question: 'Why does the Advisory Board want the CAP reformed?',
        takeaway:
          'Because a large share of CAP payments still flows to the most greenhouse-gas-intensive practices. The Board recommends removing climate-harmful payments already in the next CAP period and rethinking broader income support in the longer term.',
        paragraphs: [
          'Recommendation 1 of the 2026 report is to \u201cgradually remove climate-harmful payments\u201d from the CAP already over the next programming period, then explore alternatives to the current system of broader income support in the longer term.',
          'The 2024 policy-gap assessment and the 2025 CDR report both flag CAP coherence: payments should not pull against the EU climate-neutrality objective, and should incentivise soil carbon, climate adaptation and emission reductions instead.',
          'Reform is framed as essential for both mitigation and adaptation \u2014 protecting the land sink, climate-proofing production, and ensuring a just transition for farmers most exposed to climate risk.',
        ],
        sources: [REPORT_AGRI, REPORT_POLICY_GAP, REPORT_CDR],
      },
      {
        id: 'agri-pricing',
        claim: '"Pricing agricultural emissions would destroy EU farming."',
        question: 'Should the EU introduce a greenhouse gas pricing system for agriculture?',
        takeaway:
          'Yes \u2014 designed gradually and adaptively, so the polluter-pays principle reaches agricultural emissions while supporting farmers through the transition.',
        paragraphs: [
          'Recommendation 2 calls for a \u201cdedicated greenhouse gas pricing system for agriculture\u201d covering the value chain. The design should be gradual and adaptive, recognise non-CO\u2082 emissions (methane, nitrous oxide), and incentivise CDR in the land sector.',
          'Pricing is paired with Recommendation 3 (targeted financial and non-financial transition support), focused on the most GHG-intensive and/or least climate-resilient production systems. Recommendation 7 of the CDR report separately proposes a land-sector pricing and reward system.',
          'The point is not revenue \u2014 it is alignment of incentives across the value chain, removing the current inconsistency whereby most agricultural GHG emissions carry no price while other sectors are covered by the ETS.',
        ],
        sources: [REPORT_AGRI, REPORT_CDR, REPORT_POLICY_GAP],
      },
      {
        id: 'food-diets',
        question: 'What is the role of diets and food waste in EU climate policy?',
        takeaway:
          'A structural shift towards healthier, climate-friendlier diets and a reduction in food waste across the value chain is part of the EU\u2019s mitigation strategy \u2014 not just a private-consumption matter.',
        paragraphs: [
          'Recommendation 5 asks the EU to establish \u201can overarching food policy framework that promotes healthy, climate-friendly diets and reduces food waste across the value chain\u201d, while safeguarding equitable access to sufficient, nutritious, affordable food.',
          'The 2023 2040-target report already noted shifts in livestock share of food demand and reductions in food waste in feasible climate-neutral pathways. The 2026 report embeds this in a coherent policy framework.',
          'Framing is whole-system: production, processing, retail, public procurement and consumption, not a single intervention point. Adaptation benefits (reducing pressure on stressed crops and water) come alongside mitigation benefits.',
        ],
        sources: [REPORT_AGRI, REPORT_2040],
      },
      {
        id: 'food-system-adaptation',
        question: 'How should the EU help farmers adapt to unavoidable climate impacts?',
        takeaway:
          'Strengthen risk-management tools for acute and gradual losses \u2014 without undermining incentives for proactive, transformational adaptation.',
        paragraphs: [
          'Recommendation 4 asks the EU to \u201cstrengthen the set of instruments that help farmers cope with unavoidable climate-related impacts\u201d \u2014 acute losses from extreme hazards and gradual productivity declines \u2014 but warns that these instruments must not crowd out proactive adaptation.',
          'Losses from extreme weather are already around \u20ac28 bn/year and projected to rise to \u20ac40 bn/year by mid-century under SSP2-4.5; Southern Europe faces catastrophic risk by 2050. Transformation cannot be delayed.',
          'Adaptation at farm, landscape and system level must go hand in hand with mitigation \u2014 inadequate adaptation (e.g. degraded soils, lost land sink) undermines mitigation, and vice versa.',
        ],
        sources: [REPORT_AGRI],
      },
      {
        id: 'agri-funding',
        question: 'Where should the funding for the agri-food transition come from?',
        takeaway:
          'A mix of reoriented existing resources (CAP, cohesion funds) and new revenue streams, complemented by private finance \u2014 enough to fund transition support, risk management and innovation together.',
        paragraphs: [
          'Recommendation 6 asks the EU to \u201censure adequate public funding\u201d for the transition, exploring different options including reorientation of existing resources and mobilisation of new revenue streams.',
          'Private finance is a complement, not a substitute: markets alone will not deliver the scale and speed of change needed, particularly for the most exposed or least-resourced farms.',
          'Funding should be coordinated with the broader EU framework \u2014 the post-2030 MFF, Social Climate Fund, Innovation Fund, Horizon Europe \u2014 so that agri-food gets its fair share of the transition envelope.',
        ],
        sources: [REPORT_AGRI],
      },
      {
        id: 'energy-food-nexus',
        question: 'How are the energy and food systems interlinked during climate and energy shocks?',
        takeaway:
          'Energy-price shocks pass through to fertiliser and food prices, biomass decisions compete with food and biodiversity, and climate impacts hit both systems simultaneously \u2014 so policy responses must be joined up.',
        paragraphs: [
          'The 2023 energy-crisis advice highlights the interlinkages between the energy and food crises: spikes in energy prices feed into fertiliser and food prices, disproportionately hitting low-income households and net food-importing countries.',
          'The Advisory Board is clear that biomass should not be treated as a cheap drop-in replacement for Russian gas; supply and use must be sustainable and must minimise pressure on food production and biodiversity.',
          'The 2026 agri-food report embeds this logic in a broader framework: adaptation, mitigation, land use, food security and energy transition are tightly coupled, and an overarching food-policy framework must address them together.',
        ],
        sources: [REPORT_AGRI, REPORT_ENERGY_CRISIS],
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function FaqPage() {
  const [activeTopic, setActiveTopic] = useState<string>(TOPICS[0].id);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const topic = useMemo(
    () => TOPICS.find((t) => t.id === activeTopic) ?? TOPICS[0],
    [activeTopic],
  );

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAll = () =>
    setOpenIds(new Set(topic.items.map((i) => i.id)));
  const collapseAll = () => setOpenIds(new Set());

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title="FAQ & Prebunking"
        subtitle={
          'Plain-language answers to the most common questions \u2014 and misconceptions \u2014 about EU climate policy, grounded in ESABCC published advice. Topics will expand as more reports are released.'
        }
      />

      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
        {/* Topic tabs */}
        <div className="mb-6 sm:mb-8">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[#00928F] font-semibold mb-2">
            Topics
          </p>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const active = t.id === activeTopic;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTopic(t.id);
                    setOpenIds(new Set());
                  }}
                  className={`px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] rounded-sm border transition ${
                    active
                      ? 'bg-[#00928F] text-white border-[#00928F]'
                      : 'bg-white text-[#3D5265] border-[#E6E7E8] hover:border-[#00928F] hover:text-[#00928F]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic header + intro */}
        <div className="mb-6 sm:mb-8 border-l-2 border-[#00928F] pl-4">
          <p className="text-[11px] tracking-[0.12em] uppercase text-[#00928F] font-semibold mb-1">
            {topic.tagline}
          </p>
          <h2 className="text-[20px] sm:text-[22px] font-bold text-[#3D5265] mb-2">
            {topic.label}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-[#3D5265]/80 leading-relaxed max-w-3xl">
            {topic.intro}
          </p>
        </div>

        {/* Expand / collapse controls */}
        <div className="flex items-center justify-between mb-3 text-[12px]">
          <p className="text-[#3D5265]/60">
            {topic.items.length} question{topic.items.length === 1 ? '' : 's'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={expandAll}
              className="text-[#E87722] hover:text-[#c45f14] transition"
            >
              Expand all
            </button>
            <span className="text-[#E6E7E8]">·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[#3D5265]/60 hover:text-[#3D5265] transition"
            >
              Collapse all
            </button>
          </div>
        </div>

        {/* Questions */}
        <ul className="divide-y divide-[#E6E7E8] border border-[#E6E7E8] rounded-sm bg-white">
          {topic.items.map((item) => {
            const isOpen = openIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-3 text-left p-4 sm:p-5 hover:bg-[#F9FAFB] active:bg-[#F5F6F7] transition"
                >
                  <span className="flex-1 min-w-0">
                    {item.claim && (
                      <span className="block text-[11px] tracking-[0.08em] uppercase text-[#B83230] font-semibold mb-1">
                        Misconception
                      </span>
                    )}
                    {item.claim && (
                      <span className="block text-[12px] sm:text-[13px] italic text-[#3D5265]/70 mb-2 leading-snug">
                        {item.claim}
                      </span>
                    )}
                    <span className="block text-[14px] sm:text-[15px] font-bold text-[#3D5265] leading-snug">
                      {item.question}
                    </span>
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#00928F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`shrink-0 mt-1 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 sm:pb-6">
                    <div className="bg-[#EEF7F6] border-l-2 border-[#00928F] px-4 py-3 mb-3 rounded-sm">
                      <p className="text-[10px] tracking-[0.12em] uppercase text-[#00928F] font-semibold mb-1">
                        The short answer
                      </p>
                      <p className="text-[13px] sm:text-[14px] text-[#3D5265] font-semibold leading-snug">
                        {item.takeaway}
                      </p>
                    </div>
                    <div className="space-y-2.5 text-[13px] sm:text-[14px] text-[#3D5265]/85 leading-relaxed">
                      {item.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    {item.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[#E6E7E8]">
                        <p className="text-[10px] tracking-[0.12em] uppercase text-[#3D5265]/60 font-semibold mb-1.5">
                          ESABCC sources
                        </p>
                        <ul className="flex flex-wrap gap-x-4 gap-y-1">
                          {item.sources.map((s) => (
                            <li key={s.href}>
                              <a
                                href={s.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[12px] text-[#E87722] hover:text-[#c45f14] underline decoration-[#E87722]/30 hover:decoration-[#c45f14]"
                              >
                                {s.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[11px] text-[#3D5265]/55 leading-relaxed max-w-3xl">
          {
            'This module paraphrases and synthesises the Advisory Board\u2019s published advice for communication purposes. For the full reasoning, underlying evidence and exact wording, always consult the linked ESABCC reports.'
          }
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
