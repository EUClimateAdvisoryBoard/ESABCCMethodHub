'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';

// ─────────────────────────────────────────────────────────────────────────────
// Project Manual v2.1 – ESABCC 5-Phase Project Lifecycle
// Source: project-documents/2023-10-22 Project Manual_v2-1.docx
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_COLORS = {
  inception:   { bg: '#3d5584', light: '#e8edf5', border: '#3d5584', text: '#3d5584' },
  scoping:     { bg: '#2e7a4f', light: '#e5f4ec', border: '#2e7a4f', text: '#2e7a4f' },
  analysis:    { bg: '#c45f14', light: '#fdf0e6', border: '#c45f14', text: '#c45f14' },
  production:  { bg: '#4f3a66', light: '#f0ebf8', border: '#4f3a66', text: '#4f3a66' },
  evaluation:  { bg: '#608c95', light: '#ecf3f5', border: '#608c95', text: '#608c95' },
};

const PHASES = [
  {
    id: 'inception',
    num: 1,
    name: 'Inception',
    shortName: 'Inception',
    months: { start: 1, end: 2 },
    color: PHASE_COLORS.inception,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    purpose: 'Mature an idea for a new analysis. Clarify the problem statement and the relevance of the project, frame the initial thesis, and prepare a project proposal.',
    keyQuestion: 'Is the idea worth pursuing? Does it fit the ESABCC mandate and work programme?',
    activities: {
      secretariat: [
        'Review policy calendar and identify emerging issues',
        'Draw overview of developments in climate science/politics',
        'Collect ideas from the Board',
        'Develop project proposal',
        'Assign resources',
      ],
      advisoryBoard: [
        'Submit project proposals',
        'Discuss annual work programme',
        'Appoint Subgroup members',
      ],
    },
    deliverables: [
      { name: 'Project Proposal', type: 'doc', required: true },
      { name: 'Slide deck for Advisory Board', type: 'slides', required: true },
      { name: 'Slide deck for EEA Management Board', type: 'slides', required: false },
      { name: 'Draft Work Programme', type: 'doc', required: true },
    ],
    gate: 'Approval by the Advisory Board of the annual work programme (or approval of new projects between work programmes on an exceptional basis)',
    tools: ['Project proposal template', 'Work programme template'],
    narrative: {
      form: 'Simple tentative narrative in bullet points',
      included: 'Within the project proposal',
    },
    stakeholder: 'Initial identification of key stakeholders relevant to the project topic',
  },
  {
    id: 'scoping',
    num: 2,
    name: 'Scoping',
    shortName: 'Scoping',
    months: { start: 3, end: 5 },
    color: PHASE_COLORS.scoping,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
    purpose: 'Clarify the project\'s relevance, aim, scope and methodological approach. Organise the project in terms of planning, resources and stakeholder management.',
    keyQuestion: 'Why are we doing this? What exactly? How? For whom? By whom? When? Who are the stakeholders?',
    keyElements: [
      { q: 'Why?', a: 'Relevance in view of science, policy context, and ESABCC mandate/strategy' },
      { q: 'What?', a: 'Aim and scope, topics to include, preliminary key messages' },
      { q: 'How?', a: 'Methodological approach' },
      { q: 'For whom?', a: 'Target audience' },
      { q: 'By whom?', a: 'Project team, roles and responsibilities' },
      { q: 'When?', a: 'Planning / timeline' },
    ],
    activities: {
      secretariat: [
        'First mapping and review of scientific literature, reports and policy documents',
        'Identify how the Advisory Board could add value',
        'Mapping of stakeholders and first consultations with external experts',
        'Coordinate with the subgroup champion',
        'Organise internal kick-off meeting(s) and subgroup meetings',
        'Draft the tentative narrative',
        'Draft the project description',
        'Draft outline',
      ],
      subgroupChampion: [
        'Coordinate with the project team (primarily via the project lead)',
        'Participate in scoping meetings',
        'Review draft narrative and project description',
      ],
      advisoryBoard: [
        'Participate in discussions during Advisory Board meeting',
        'Provide feedback on tentative narrative',
        'Approve project description and outline',
      ],
    },
    deliverables: [
      { name: 'Project Description', type: 'doc', required: true },
      { name: 'Tentative Narrative', type: 'doc', required: true },
      { name: 'Stakeholder Strategy', type: 'doc', required: true },
      { name: 'Risk Analysis', type: 'doc', required: true },
      { name: 'Report Outline / Table of Contents', type: 'doc', required: true },
      { name: 'Milestone Plan', type: 'plan', required: true },
    ],
    gate: 'Approval by the Advisory Board of the tentative narrative AND the outline of the report',
    tools: ['Project description template', 'Narrative template', 'Stakeholder mapping tool', 'Risk matrix template'],
    narrative: {
      form: 'Developed as a separate product — short, clear, comprehensible prose covering: 1) relevance, aim, scope; 2) approach and content; 3) tentative messages and conclusions',
      included: 'Standalone document, complementing the project description',
    },
    stakeholder: 'Full stakeholder mapping and prioritisation. Draft stakeholder strategy covering: scientific context, policy context, involvement plan per phase',
  },
  {
    id: 'analysis',
    num: 3,
    name: 'Analysis & Drafting',
    shortName: 'Analysis',
    months: { start: 6, end: 14 },
    color: PHASE_COLORS.analysis,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    purpose: 'Production phase where the overall final product is prepared — report, briefing or analysis — plus supplementary outputs. Quality and risk management are key. Progress is continuously evaluated.',
    keyQuestion: 'Are we building the right analysis? Does the evidence support our key messages?',
    activities: {
      secretariat: [
        'Collect evidence from scientific literature',
        'Organise expert consultations',
        'Coordinate drafting and revisions',
        'Quality control within the Secretariat',
        'Update project description and milestone plan continuously',
        'Draft executive summary',
        'Prepare report slides for Advisory Board',
        'Manage contractors (if applicable)',
      ],
      subgroup: [
        'Guide on specific topics',
        'Iterative reviews and quality control',
        'Participate in subgroup meetings',
        'Provide written feedback on drafts',
      ],
      advisoryBoard: [
        'Steer on recommendations',
        'Review draft report chapters',
        'Provide strategic direction',
      ],
    },
    deliverables: [
      { name: 'Updated Project Description & Milestone Plan', type: 'doc', required: true },
      { name: 'Detailed Outline', type: 'doc', required: true },
      { name: 'Contractors\' Inputs (if applicable)', type: 'doc', required: false },
      { name: 'Narrative & Draft Executive Summary', type: 'doc', required: true },
      { name: 'Draft Chapters', type: 'doc', required: true },
      { name: 'Draft Data Charts', type: 'visual', required: true },
      { name: 'Report Slides for Advisory Board', type: 'slides', required: true },
    ],
    gate: 'Approval by the Advisory Board of the final report for language editing and graphic design',
    tools: ['Evidence tracking sheet', 'Expert consultation log', 'Quality review checklist', 'Milestone tracker'],
    narrative: {
      form: 'Evolves to become more precise, mirrors the draft report. Actively used in dialogue with the Advisory Board. Will eventually become the publication\'s summary, conclusions, and recommendations.',
      included: 'Living document updated throughout the phase',
    },
    stakeholder: 'Ongoing stakeholder engagement per the strategy: expert consultations, stakeholder workshops, peer review. Track interactions and update strategy if project scope changes.',
  },
  {
    id: 'production',
    num: 4,
    name: 'Production & Outreach',
    shortName: 'Production',
    months: { start: 15, end: 17 },
    color: PHASE_COLORS.production,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    ),
    purpose: 'Prepare the final report with proofread text in the right graphic layout. Organise publication activities. Advisory Board members present the report to stakeholders.',
    keyQuestion: 'Is the report ready for publication? Are stakeholders prepared for the launch?',
    activities: {
      secretariat: [
        'Coordinate with proofreader and designer',
        'Language editing and graphic design support',
        'Prepare presentations and Q&A',
        'Prepare communications materials for website, mailing, social media',
        'Prepare dissemination strategy',
        'Brief Advisory Board speakers',
      ],
      advisoryBoard: [
        'Read Q&A documents',
        'Present report to stakeholders',
        'Participate in launch events',
      ],
    },
    deliverables: [
      { name: 'Final Charts (designed)', type: 'visual', required: true },
      { name: 'Proof Edited Draft', type: 'doc', required: true },
      { name: 'Internal Q&A', type: 'doc', required: true },
      { name: 'Webpage Text', type: 'doc', required: true },
      { name: 'Letters / Emails / Newsletters', type: 'doc', required: true },
      { name: 'Social Media Materials', type: 'media', required: true },
    ],
    gate: 'Report published and launch event completed',
    tools: ['Communication plan template', 'Social media checklist', 'Q&A template', 'Design brief'],
    narrative: {
      form: 'The narrative has now become the published executive summary, conclusions and recommendations.',
      included: 'Final published report',
    },
    stakeholder: 'Dissemination to key stakeholders: personal outreach, launch events, media strategy. Track media coverage and stakeholder reactions.',
  },
  {
    id: 'evaluation',
    num: 5,
    name: 'Evaluation',
    shortName: 'Evaluation',
    months: { start: 18, end: 18 },
    color: PHASE_COLORS.evaluation,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    purpose: 'Evaluate the project to learn from what was successful and where improvements can be made. Evaluation meeting held within the Secretariat and a separate discussion in the Advisory Board.',
    keyQuestion: 'What worked? What can we improve for future projects?',
    activities: {
      secretariat: [
        'Prepare evaluation meetings and documents',
        'Collect feedback after publication',
        'Evaluate internally within the Secretariat',
        'Discuss with Subgroup champion and/or Subgroup',
        'Consolidate evaluation results',
        'Identify best practices and gaps',
        'Prepare final evaluation report',
      ],
      advisoryBoard: [
        'Participate in evaluation meeting',
        'Provide feedback on the process',
      ],
      projectLead: [
        'Identify best practices to share with the team',
        'Identify gaps and areas of improvement',
        'Prepare and facilitate evaluation meetings (within 1 month from production and outreach)',
        'Submit evaluation report to Head of Secretariat',
      ],
    },
    deliverables: [
      { name: 'Evaluation Matrix', type: 'doc', required: true },
      { name: 'Evaluation Report', type: 'doc', required: true },
    ],
    gate: 'Report on evaluation submitted to Head of Secretariat',
    tools: ['Evaluation matrix template', 'Lessons learned log'],
    narrative: {
      form: 'The narrative is not updated in this phase — focus is on retrospective evaluation.',
      included: 'N/A',
    },
    stakeholder: 'Post-publication stakeholder feedback collection. Assess impact and reach of the report.',
  },
];

const KEY_DOCUMENTS = [
  {
    id: 'project-narrative',
    name: 'Project Narrative',
    icon: '📖',
    color: '#3d5584',
    phase: 'Scoping → All',
    purpose: 'The backbone of the project. Creates common understanding of the analysis internally and between the Advisory Board and project team throughout the process.',
    whatIs: 'A short, clear, comprehensible overview covering: 1) relevance, aim, scope; 2) approach and content; 3) tentative messages and conclusions.',
    structure: [
      { title: 'Beginning — Relevance & Aim', desc: 'Why is this analysis needed? What is the problem? How does it fit ESABCC\'s mandate and strategy?' },
      { title: 'Middle — Approach & Content', desc: 'How will we approach the analysis? What topics are in scope? What methodology will we use?' },
      { title: 'End — Tentative Conclusions & Recommendations', desc: 'What do we expect to find? What are the preliminary key messages?' },
    ],
    evolution: [
      { phase: 'Inception', form: 'Simple bullet-point narrative in project proposal' },
      { phase: 'Scoping', form: 'Developed as standalone document, approved by Advisory Board' },
      { phase: 'Analysis & Drafting', form: 'Evolves to mirror draft report; used in AB dialogue' },
      { phase: 'Production', form: 'Becomes the final executive summary and recommendations' },
    ],
    tip: 'Storytelling research shows that narratives enhance knowledge acquisition. Use the classic beginning-middle-end structure to ensure the analysis tells a coherent story.',
  },
  {
    id: 'stakeholder-strategy',
    name: 'Stakeholder Strategy',
    icon: '🤝',
    color: '#2e7a4f',
    phase: 'Scoping → All',
    purpose: 'Identify and engage the right stakeholders throughout the project lifecycle to ensure scientific rigour and policy relevance.',
    whatIs: 'A living document that maps, prioritises and defines the involvement of key stakeholders — scientific experts, policy makers, civil society — at each project phase.',
    structure: [
      { title: 'Stakeholder Mapping', desc: 'Who are the relevant stakeholders? Map them by scientific and policy context.' },
      { title: 'Prioritisation', desc: 'Which stakeholders are most important for this specific project? Use a power/interest matrix.' },
      { title: 'Involvement Plan', desc: 'How, when and to what extent should each stakeholder group be involved?' },
      { title: 'Risk Assessment', desc: 'What are the risks related to stakeholder management? How to mitigate them?' },
    ],
    evolution: [
      { phase: 'Inception', form: 'Initial identification of key stakeholders' },
      { phase: 'Scoping', form: 'Full mapping, prioritisation, and draft strategy' },
      { phase: 'Analysis & Drafting', form: 'Active engagement; strategy updated as needed' },
      { phase: 'Production & Outreach', form: 'Dissemination strategy; launch events' },
      { phase: 'Evaluation', form: 'Post-publication stakeholder feedback' },
    ],
    tip: 'All ESABCC reports are science-to-policy. Understanding both the scientific and political stakeholder landscape is essential to positioning the report for maximum impact.',
  },
  {
    id: 'project-description',
    name: 'Project Description',
    icon: '📋',
    color: '#c45f14',
    phase: 'Inception → Scoping',
    purpose: 'A concrete overview of what the project will entail, which the Advisory Board will decide on. Prepared by the project lead.',
    whatIs: 'A structured document covering the practical organisation of the project — complementing the narrative and the report outline.',
    structure: [
      { title: 'Relevance, Aim & Scope', desc: 'Why this project? What will it cover? Brief summary.' },
      { title: 'Methodological Approach', desc: 'How will the analysis be conducted?' },
      { title: 'Tentative Key Messages', desc: 'What are the preliminary conclusions?' },
      { title: 'Target Audience', desc: 'Who is the report for?' },
      { title: 'Timing & Format', desc: 'When will deliverables be ready? What format?' },
      { title: 'Stakeholder Engagement', desc: 'Who are the key stakeholders and how will they be involved?' },
      { title: 'Risk Analysis', desc: 'What risks could affect project success? How to mitigate?' },
      { title: 'Resources', desc: 'What internal/external resources are needed? What is the budget?' },
    ],
    evolution: [
      { phase: 'Inception', form: 'Initial project description in the project proposal' },
      { phase: 'Scoping', form: 'Fully elaborated project description approved by Advisory Board' },
      { phase: 'Analysis & Drafting', form: 'Updated continuously as the project evolves' },
    ],
    tip: 'The project description is the "what" and "how" — keep the narrative for the "why" and the scientific framing. Both documents work together.',
  },
  {
    id: 'milestone-plan',
    name: 'Milestone Plan',
    icon: '📅',
    color: '#4f3a66',
    phase: 'Scoping → Analysis',
    purpose: 'Track project progress, ensure on-time delivery, and flag risks early. Updated throughout the project lifecycle.',
    whatIs: 'A timeline showing key milestones, deliverable due dates, review gates, and Advisory Board touchpoints.',
    structure: [
      { title: 'Phase Gates', desc: 'Approval milestones by the Advisory Board between phases.' },
      { title: 'Internal Deliverables', desc: 'Draft chapters, narrative versions, outlines.' },
      { title: 'External Deliverables', desc: 'Published report, communication materials.' },
      { title: 'Meetings', desc: 'Advisory Board meetings, subgroup meetings, stakeholder consultations.' },
      { title: 'Reviews', desc: 'Internal quality reviews, external peer review, language editing.' },
    ],
    evolution: [
      { phase: 'Scoping', form: 'Initial milestone plan with key dates' },
      { phase: 'Analysis & Drafting', form: 'Updated as project progresses; manages scope changes' },
    ],
    tip: 'If the basis, scope or time horizon of the project changes, call a strategic perspective meeting to reframe the analysis before updating the milestone plan.',
  },
  {
    id: 'evaluation-matrix',
    name: 'Evaluation Matrix',
    icon: '📊',
    color: '#608c95',
    phase: 'Evaluation',
    purpose: 'Structured framework for evaluating project success, identifying best practices, and capturing lessons learned for future projects.',
    whatIs: 'A matrix-format document used in evaluation meetings with the Secretariat and Advisory Board to assess what worked well and what needs improvement.',
    structure: [
      { title: 'Process Evaluation', desc: 'Was the project well-organised? Were timelines met? Was the team well-resourced?' },
      { title: 'Output Evaluation', desc: 'Was the report of high quality? Did it meet the original aims and scope?' },
      { title: 'Impact Evaluation', desc: 'Did the report reach the target audience? Did it influence policy?' },
      { title: 'Lessons Learned', desc: 'What best practices should be shared? What gaps need addressing in future projects?' },
    ],
    evolution: [
      { phase: 'Evaluation', form: 'Completed within 1 month of publication' },
    ],
    tip: 'The Head of Secretariat collects evaluations from both the Secretariat and the Advisory Board and ensures relevant recommendations are implemented in future projects.',
  },
];

// Gantt chart data
const TOTAL_MONTHS = 18;
const MILESTONES = [
  { month: 2, label: 'AB Work Programme Approval', phase: 'inception' },
  { month: 5, label: 'AB Narrative & Outline Approval', phase: 'scoping' },
  { month: 8, label: 'Draft Chapter 1 Complete', phase: 'analysis' },
  { month: 11, label: 'Full Draft to Subgroup', phase: 'analysis' },
  { month: 14, label: 'AB Final Report Approval', phase: 'analysis' },
  { month: 16, label: 'Report Published', phase: 'production' },
  { month: 18, label: 'Evaluation Complete', phase: 'evaluation' },
];

function GanttChart({ projectStart = 'Jan 2025' }: { projectStart?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const barHeight = 28;
  const rowGap = 8;
  const labelWidth = 150;
  const headerHeight = 40;
  const monthWidth = 48;
  const totalWidth = labelWidth + TOTAL_MONTHS * monthWidth;
  const totalHeight = headerHeight + PHASES.length * (barHeight + rowGap) + 60;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        width={totalWidth}
        height={totalHeight}
        className="font-sans text-xs"
      >
        {/* Background */}
        <rect width={totalWidth} height={totalHeight} fill="#f9fafb" rx="8"/>

        {/* Month header */}
        {months.map((m, i) => (
          <g key={i}>
            <rect
              x={labelWidth + i * monthWidth}
              y={0}
              width={monthWidth}
              height={headerHeight}
              fill={i % 2 === 0 ? '#f3f4f5' : '#e6e7e8'}
            />
            <text
              x={labelWidth + i * monthWidth + monthWidth / 2}
              y={headerHeight / 2 + 4}
              textAnchor="middle"
              fill="#3D5265"
              fontSize="10"
              fontWeight="600"
            >
              M{i + 1}
            </text>
            <text
              x={labelWidth + i * monthWidth + monthWidth / 2}
              y={headerHeight - 6}
              textAnchor="middle"
              fill="#808285"
              fontSize="9"
            >
              {m}
            </text>
          </g>
        ))}

        {/* Grid lines */}
        {months.map((_, i) => (
          <line
            key={i}
            x1={labelWidth + i * monthWidth}
            y1={headerHeight}
            x2={labelWidth + i * monthWidth}
            y2={totalHeight - 30}
            stroke="#e6e7e8"
            strokeWidth="1"
          />
        ))}

        {/* Phase bars */}
        {PHASES.map((phase, pi) => {
          const y = headerHeight + pi * (barHeight + rowGap);
          const x = labelWidth + (phase.months.start - 1) * monthWidth;
          const w = (phase.months.end - phase.months.start + 1) * monthWidth;
          const isHovered = hovered === phase.id;

          return (
            <g key={phase.id}>
              {/* Row background */}
              <rect
                x={0}
                y={y}
                width={totalWidth}
                height={barHeight + rowGap}
                fill={pi % 2 === 0 ? '#ffffff' : '#f9fafb'}
                opacity="0.6"
              />

              {/* Phase label */}
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fill={phase.color.text}
                fontSize="11"
                fontWeight="600"
              >
                {phase.num}. {phase.shortName}
              </text>

              {/* Phase bar */}
              <rect
                x={x + 2}
                y={y + 4}
                width={w - 4}
                height={barHeight - 8}
                fill={phase.color.bg}
                opacity={isHovered ? 1 : 0.85}
                rx="4"
                className="cursor-pointer transition-opacity"
                onMouseEnter={(e) => {
                  setHovered(phase.id);
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  setTooltip({ x: rect.left, y: rect.top - 60, text: `Phase ${phase.num}: ${phase.name} (M${phase.months.start}–M${phase.months.end})` });
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); }}
              />

              {/* Phase name inside bar */}
              {(phase.months.end - phase.months.start) >= 2 && (
                <text
                  x={x + w / 2}
                  y={y + barHeight / 2 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="600"
                  className="pointer-events-none"
                >
                  {phase.shortName}
                </text>
              )}
            </g>
          );
        })}

        {/* Milestones */}
        {MILESTONES.map((m, mi) => {
          const phase = PHASES.find(p => p.id === m.phase);
          if (!phase) return null;
          const x = labelWidth + (m.month - 1) * monthWidth + monthWidth / 2;
          const pi = PHASES.findIndex(p => p.id === m.phase);
          const y = headerHeight + pi * (barHeight + rowGap) + barHeight / 2;

          return (
            <g key={mi}>
              {/* Diamond milestone marker */}
              <polygon
                points={`${x},${y - 8} ${x + 8},${y} ${x},${y + 8} ${x - 8},${y}`}
                fill="white"
                stroke={phase.color.bg}
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGPolygonElement).getBoundingClientRect();
                  setTooltip({ x: rect.left - 60, y: rect.top - 50, text: m.label });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}

        {/* Today line / Progress indicator */}
        <line
          x1={labelWidth}
          y1={headerHeight}
          x2={labelWidth}
          y2={totalHeight - 30}
          stroke="#e87722"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.6"
        />
        <text x={labelWidth + 4} y={totalHeight - 14} fill="#e87722" fontSize="9" fontWeight="600">
          Project Start
        </text>

        {/* Legend */}
        <g transform={`translate(${labelWidth}, ${totalHeight - 24})`}>
          <polygon points="0,-6 6,0 0,6 -6,0" fill="white" stroke="#3d5584" strokeWidth="1.5" transform="translate(8,6)"/>
          <text x="18" y="10" fill="#808285" fontSize="9">Milestone / Gate</text>
        </g>
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 bg-tertiary-dark text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function PhaseCard({ phase, isActive, onClick }: {
  phase: typeof PHASES[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-[120px] rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: isActive ? phase.color.bg : '#e6e7e8',
        backgroundColor: isActive ? phase.color.light : 'white',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: phase.color.bg }}
        >
          {phase.num}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: phase.color.text }}>
          Phase {phase.num}
        </span>
      </div>
      <p className="text-sm font-bold text-tertiary-dark leading-tight">{phase.name}</p>
      <p className="text-[10px] text-grey-500 mt-1">M{phase.months.start}–M{phase.months.end}</p>
    </button>
  );
}

function DocumentCard({ doc, isActive, onClick }: {
  doc: typeof KEY_DOCUMENTS[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md w-full"
      style={{
        borderColor: isActive ? doc.color : '#e6e7e8',
        backgroundColor: isActive ? `${doc.color}12` : 'white',
      }}
    >
      <span className="text-2xl shrink-0">{doc.icon}</span>
      <div>
        <p className="text-sm font-bold text-tertiary-dark">{doc.name}</p>
        <p className="text-[10px] text-grey-500 mt-0.5">{doc.phase}</p>
      </div>
    </button>
  );
}

type ChecklistState = Record<string, Record<string, boolean>>;

export default function ProjectManagementPage() {
  const [activePhase, setActivePhase] = useState<string>('inception');
  const [activeDoc, setActiveDoc] = useState<string>('project-narrative');
  const [activeTab, setActiveTab] = useState<'workflow' | 'gantt' | 'documents' | 'checklist'>('workflow');
  const [checklist, setChecklist] = useState<ChecklistState>({});
  const [projectName, setProjectName] = useState('');
  const [projectPhase, setProjectPhase] = useState('inception');
  const [showProjectSetup, setShowProjectSetup] = useState(false);

  const phase = PHASES.find(p => p.id === activePhase)!;
  const doc = KEY_DOCUMENTS.find(d => d.id === activeDoc)!;

  const toggleChecklist = useCallback((phaseId: string, item: string) => {
    setChecklist(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        [item]: !prev[phaseId]?.[item],
      },
    }));
  }, []);

  const getPhaseProgress = (phaseId: string) => {
    const p = PHASES.find(ph => ph.id === phaseId)!;
    const items = [...p.activities.secretariat, ...p.deliverables.map(d => d.name)];
    const done = items.filter(item => checklist[phaseId]?.[item]).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  };

  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />
      <PageHero
        title="Project Management"
        subtitle="ESABCC 5-Phase Project Lifecycle — based on the ESABCC Project Manual v2.1. Manage projects from inception to evaluation with Gantt charts, phase checklists, and key document guides."
      >
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>
            Beta
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
            Based on Project Manual v2.1 (2023)
          </span>
        </div>
      </PageHero>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Project Setup Banner ─────────────────────────────────────── */}
        {!showProjectSetup ? (
          <div className="bg-white rounded-2xl border border-grey-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-tertiary-dark">Start a New Project</h2>
              <p className="text-sm text-tertiary mt-0.5">Set up a project to track progress through all 5 phases of the ESABCC project lifecycle.</p>
            </div>
            <button
              onClick={() => setShowProjectSetup(true)}
              className="shrink-0 px-5 py-2.5 bg-secondary text-white text-sm font-semibold rounded-xl hover:bg-secondary-dark transition"
            >
              + New Project
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-secondary p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-tertiary-dark">New Project Setup</h2>
              <button onClick={() => setShowProjectSetup(false)} className="text-grey-400 hover:text-tertiary transition">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-tertiary-dark mb-1">Project Name *</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. EU 2040 Climate Target Analysis"
                  className="w-full border border-grey-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary-dark mb-1">Current Phase</label>
                <select
                  value={projectPhase}
                  onChange={e => setProjectPhase(e.target.value)}
                  className="w-full border border-grey-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary transition bg-white"
                >
                  {PHASES.map(p => (
                    <option key={p.id} value={p.id}>Phase {p.num}: {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-tertiary-dark mb-1">Project Start</label>
                <input
                  type="month"
                  className="w-full border border-grey-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary transition"
                  defaultValue="2025-01"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  if (projectName) {
                    setActivePhase(projectPhase);
                    setActiveTab('workflow');
                    setShowProjectSetup(false);
                  }
                }}
                className="px-5 py-2 bg-secondary text-white text-sm font-semibold rounded-xl hover:bg-secondary-dark transition"
              >
                Create Project
              </button>
              <button onClick={() => setShowProjectSetup(false)} className="px-5 py-2 border border-grey-200 text-tertiary text-sm rounded-xl hover:bg-grey-50 transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Tab Navigation ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1 bg-white rounded-2xl border border-grey-200 p-1.5">
          {[
            { id: 'workflow', label: 'Phase Workflow', icon: '⚡' },
            { id: 'gantt', label: 'Gantt Chart', icon: '📊' },
            { id: 'documents', label: 'Key Documents', icon: '📁' },
            { id: 'checklist', label: 'Phase Checklists', icon: '✅' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-secondary text-white shadow-sm'
                  : 'text-tertiary hover:bg-grey-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB: PHASE WORKFLOW
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Phase selector */}
            <div className="flex flex-wrap gap-3">
              {PHASES.map(p => (
                <PhaseCard
                  key={p.id}
                  phase={p}
                  isActive={activePhase === p.id}
                  onClick={() => setActivePhase(p.id)}
                />
              ))}
            </div>

            {/* Phase detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Phase overview */}
              <div className="lg:col-span-2 space-y-4">
                {/* Header */}
                <div
                  className="rounded-2xl p-6 text-white"
                  style={{ backgroundColor: phase.color.bg }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-white/20 rounded-xl p-2.5">{phase.icon}</span>
                    <div>
                      <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Phase {phase.num}</p>
                      <h2 className="text-xl font-bold">{phase.name}</h2>
                    </div>
                    <span className="ml-auto bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                      Month {phase.months.start}–{phase.months.end}
                    </span>
                  </div>
                  <p className="text-white/90 text-sm leading-relaxed mb-3">{phase.purpose}</p>
                  <div className="bg-white/15 rounded-xl p-3">
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider mb-1">Key Question</p>
                    <p className="text-white text-sm font-medium">{phase.keyQuestion}</p>
                  </div>
                </div>

                {/* Key elements (Scoping only) */}
                {'keyElements' in phase && phase.keyElements && (
                  <div className="bg-white rounded-2xl border border-grey-200 p-5">
                    <h3 className="text-sm font-bold text-tertiary-dark mb-4">Key Questions to Address</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {phase.keyElements.map((el: { q: string; a: string }) => (
                        <div key={el.q} className="rounded-xl p-3" style={{ backgroundColor: phase.color.light }}>
                          <p className="text-xs font-bold mb-1" style={{ color: phase.color.text }}>{el.q}</p>
                          <p className="text-xs text-tertiary">{el.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                <div className="bg-white rounded-2xl border border-grey-200 p-5">
                  <h3 className="text-sm font-bold text-tertiary-dark mb-4">Key Activities</h3>
                  <div className="space-y-4">
                    {Object.entries(phase.activities).map(([role, items]) => {
                      const roleLabels: Record<string, string> = {
                        secretariat: 'Secretariat',
                        advisoryBoard: 'Advisory Board',
                        subgroupChampion: 'Subgroup Champion',
                        subgroup: 'Subgroup',
                        projectLead: 'Project Lead',
                      };
                      return (
                        <div key={role}>
                          <p className="text-xs font-bold text-tertiary-dark mb-2 flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-full text-white text-[10px]"
                              style={{ backgroundColor: phase.color.bg }}
                            >
                              {roleLabels[role] || role}
                            </span>
                          </p>
                          <ul className="space-y-1.5">
                            {(items as string[]).map(item => (
                              <li key={item} className="flex items-start gap-2 text-sm text-tertiary">
                                <span className="mt-1 w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: phase.color.light }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: phase.color.bg }}/>
                                </span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Deliverables + Gate + Tools */}
              <div className="space-y-4">
                {/* Deliverables */}
                <div className="bg-white rounded-2xl border border-grey-200 p-5">
                  <h3 className="text-sm font-bold text-tertiary-dark mb-3">
                    Deliverables
                  </h3>
                  <div className="space-y-2">
                    {phase.deliverables.map(del => {
                      const typeIcon: Record<string, string> = {
                        doc: '📄', slides: '📊', plan: '📅', visual: '🎨', media: '📣',
                      };
                      return (
                        <div
                          key={del.name}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg"
                          style={{ backgroundColor: phase.color.light }}
                        >
                          <span className="text-base shrink-0">{typeIcon[del.type] || '📄'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-tertiary-dark truncate">{del.name}</p>
                            <p className="text-[10px] text-grey-500">{del.required ? 'Required' : 'Optional'}</p>
                          </div>
                          {del.required && (
                            <span
                              className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: phase.color.bg }}
                            >
                              !
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phase Gate */}
                <div
                  className="rounded-2xl p-4 border-2"
                  style={{ borderColor: phase.color.bg, backgroundColor: phase.color.light }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: phase.color.text }}>
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <h3 className="text-xs font-bold" style={{ color: phase.color.text }}>Phase Gate</h3>
                  </div>
                  <p className="text-xs text-tertiary leading-relaxed">{phase.gate}</p>
                </div>

                {/* Narrative */}
                <div className="bg-white rounded-2xl border border-grey-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📖</span>
                    <h3 className="text-xs font-bold text-tertiary-dark">Narrative Status</h3>
                  </div>
                  <p className="text-xs text-secondary font-semibold mb-1">{phase.narrative.included}</p>
                  <p className="text-xs text-tertiary leading-relaxed">{phase.narrative.form}</p>
                </div>

                {/* Stakeholder */}
                <div className="bg-white rounded-2xl border border-grey-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">🤝</span>
                    <h3 className="text-xs font-bold text-tertiary-dark">Stakeholder Engagement</h3>
                  </div>
                  <p className="text-xs text-tertiary leading-relaxed">{phase.stakeholder}</p>
                </div>

                {/* Tools */}
                <div className="bg-white rounded-2xl border border-grey-200 p-4">
                  <h3 className="text-xs font-bold text-tertiary-dark mb-2">Tools & Templates</h3>
                  <div className="space-y-1.5">
                    {phase.tools.map(tool => (
                      <div key={tool} className="flex items-center gap-2 text-xs text-tertiary">
                        <span className="text-secondary">→</span>
                        {tool}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Phase navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  const idx = PHASES.findIndex(p => p.id === activePhase);
                  if (idx > 0) setActivePhase(PHASES[idx - 1].id);
                }}
                disabled={PHASES[0].id === activePhase}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-grey-200 text-sm text-tertiary hover:bg-grey-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                Previous Phase
              </button>
              <button
                onClick={() => {
                  const idx = PHASES.findIndex(p => p.id === activePhase);
                  if (idx < PHASES.length - 1) setActivePhase(PHASES[idx + 1].id);
                }}
                disabled={PHASES[PHASES.length - 1].id === activePhase}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-grey-200 text-sm text-tertiary hover:bg-grey-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next Phase
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l7-7-7-7"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB: GANTT CHART
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'gantt' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-grey-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-tertiary-dark">Project Timeline — Gantt Chart</h2>
                  <p className="text-sm text-tertiary mt-0.5">18-month typical ESABCC project lifecycle. Hover over bars and milestones for details.</p>
                </div>
                <div className="flex gap-2 text-xs text-tertiary">
                  {PHASES.map(p => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color.bg }}/>
                      <span>{p.shortName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <GanttChart />
            </div>

            {/* Milestone table */}
            <div className="bg-white rounded-2xl border border-grey-200 p-6">
              <h3 className="text-sm font-bold text-tertiary-dark mb-4">Key Milestones & Phase Gates</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-grey-200">
                      <th className="text-left text-xs font-bold text-tertiary-dark py-2 pr-4">Month</th>
                      <th className="text-left text-xs font-bold text-tertiary-dark py-2 pr-4">Milestone / Gate</th>
                      <th className="text-left text-xs font-bold text-tertiary-dark py-2 pr-4">Phase</th>
                      <th className="text-left text-xs font-bold text-tertiary-dark py-2">Decision Maker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MILESTONES.map((m, i) => {
                      const p = PHASES.find(ph => ph.id === m.phase)!;
                      const decisionMakers: Record<string, string> = {
                        inception: 'Advisory Board',
                        scoping: 'Advisory Board',
                        analysis: 'Advisory Board',
                        production: 'Head of Secretariat',
                        evaluation: 'Head of Secretariat',
                      };
                      return (
                        <tr key={i} className="border-b border-grey-100 hover:bg-grey-50 transition">
                          <td className="py-3 pr-4">
                            <span
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: p.color.bg }}
                            >
                              M{m.month}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-medium text-tertiary-dark">{m.label}</td>
                          <td className="py-3 pr-4">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-semibold"
                              style={{ backgroundColor: p.color.bg }}
                            >
                              {p.name}
                            </span>
                          </td>
                          <td className="py-3 text-tertiary text-xs">{decisionMakers[m.phase]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phase summary table */}
            <div className="bg-white rounded-2xl border border-grey-200 p-6">
              <h3 className="text-sm font-bold text-tertiary-dark mb-4">Phase Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {PHASES.map(p => (
                  <div key={p.id} className="rounded-xl p-4 text-center" style={{ backgroundColor: p.color.light }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2" style={{ backgroundColor: p.color.bg }}>
                      {p.num}
                    </div>
                    <p className="text-xs font-bold text-tertiary-dark">{p.name}</p>
                    <p className="text-[11px] mt-1" style={{ color: p.color.text }}>
                      M{p.months.start}–M{p.months.end}
                    </p>
                    <p className="text-[11px] text-grey-500 mt-0.5">
                      {p.months.end - p.months.start + 1} month{p.months.end - p.months.start > 0 ? 's' : ''}
                    </p>
                    <p className="text-[10px] text-tertiary mt-2">{p.deliverables.filter(d => d.required).length} required deliverables</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB: KEY DOCUMENTS
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Doc list */}
            <div className="lg:col-span-1 space-y-2">
              <h2 className="text-sm font-bold text-tertiary-dark px-1 mb-3">Core Documents</h2>
              {KEY_DOCUMENTS.map(d => (
                <DocumentCard
                  key={d.id}
                  doc={d}
                  isActive={activeDoc === d.id}
                  onClick={() => setActiveDoc(d.id)}
                />
              ))}
              <div className="mt-4 p-3 bg-surface-teal rounded-xl border border-grey-200">
                <p className="text-[10px] text-tertiary leading-relaxed">
                  <strong className="text-tertiary-dark">Source:</strong> ESABCC Project Manual v2.1 (October 2023). All documents follow the ESABCC project framework.
                </p>
              </div>
            </div>

            {/* Doc detail */}
            <div className="lg:col-span-3 space-y-4">
              {/* Header */}
              <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: `${doc.color}15`, borderLeft: `4px solid ${doc.color}` }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{doc.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-tertiary-dark">{doc.name}</h2>
                      <span
                        className="px-2 py-0.5 rounded-full text-white text-[10px] font-semibold"
                        style={{ backgroundColor: doc.color }}
                      >
                        {doc.phase}
                      </span>
                    </div>
                    <p className="text-sm text-tertiary leading-relaxed">{doc.purpose}</p>
                  </div>
                </div>
              </div>

              {/* What is it */}
              <div className="bg-white rounded-2xl border border-grey-200 p-5">
                <h3 className="text-sm font-bold text-tertiary-dark mb-3">What Is It?</h3>
                <p className="text-sm text-tertiary leading-relaxed">{doc.whatIs}</p>
              </div>

              {/* Structure */}
              <div className="bg-white rounded-2xl border border-grey-200 p-5">
                <h3 className="text-sm font-bold text-tertiary-dark mb-4">Document Structure</h3>
                <div className="space-y-3">
                  {doc.structure.map((section, si) => (
                    <div key={si} className="flex gap-4">
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                        style={{ backgroundColor: doc.color }}
                      >
                        {si + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-tertiary-dark">{section.title}</p>
                        <p className="text-xs text-tertiary mt-0.5">{section.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolution through phases */}
              <div className="bg-white rounded-2xl border border-grey-200 p-5">
                <h3 className="text-sm font-bold text-tertiary-dark mb-4">How It Evolves Through the Project</h3>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-grey-200"/>
                  <div className="space-y-4">
                    {doc.evolution.map((ev, ei) => {
                      const p = PHASES.find(ph => ph.name === ev.phase || ph.name.startsWith(ev.phase));
                      return (
                        <div key={ei} className="flex gap-4 relative">
                          <div
                            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10"
                            style={{ backgroundColor: p?.color.bg || doc.color }}
                          >
                            {ei + 1}
                          </div>
                          <div className="pb-2">
                            <p className="text-xs font-bold text-tertiary-dark">{ev.phase}</p>
                            <p className="text-xs text-tertiary mt-0.5 leading-relaxed">{ev.form}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tip */}
              <div
                className="rounded-2xl p-4 border"
                style={{ borderColor: `${doc.color}40`, backgroundColor: `${doc.color}08` }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <p className="text-xs font-bold text-tertiary-dark mb-1">Pro Tip from the Project Manual</p>
                    <p className="text-xs text-tertiary leading-relaxed">{doc.tip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB: PHASE CHECKLISTS
        ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-grey-200 p-5">
              <h2 className="text-base font-bold text-tertiary-dark mb-1">Phase Checklists</h2>
              <p className="text-sm text-tertiary">Track activities and deliverables for each phase. Check items off as you complete them.</p>
            </div>

            {/* Progress overview */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {PHASES.map(p => {
                const { done, total, pct } = getPhaseProgress(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePhase(p.id)}
                    className="bg-white rounded-2xl border-2 p-4 text-left hover:shadow-md transition"
                    style={{ borderColor: activePhase === p.id ? p.color.bg : '#e6e7e8' }}
                  >
                    <p className="text-xs font-bold text-tertiary-dark mb-2">{p.name}</p>
                    <div className="h-1.5 bg-grey-200 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: p.color.bg }}
                      />
                    </div>
                    <p className="text-[10px] text-grey-500">{done}/{total} complete</p>
                  </button>
                );
              })}
            </div>

            {/* Active phase checklist */}
            {PHASES.filter(p => p.id === activePhase).map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-grey-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: p.color.bg }}
                  >
                    {p.num}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-tertiary-dark">{p.name} Phase Checklist</h3>
                    <p className="text-xs text-tertiary">Month {p.months.start}–{p.months.end}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activities */}
                  <div>
                    <h4 className="text-xs font-bold text-tertiary-dark uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-white text-[10px]"
                        style={{ backgroundColor: p.color.bg }}
                      >
                        Activities
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(p.activities).flatMap(([role, items]) =>
                        (items as string[]).map(item => {
                          const key = `${p.id}:activity:${item}`;
                          const done = checklist[p.id]?.[item] || false;
                          return (
                            <label
                              key={key}
                              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-grey-50 transition group"
                            >
                              <div className="relative mt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={done}
                                  onChange={() => toggleChecklist(p.id, item)}
                                  className="sr-only"
                                />
                                <div
                                  className="w-5 h-5 rounded flex items-center justify-center border-2 transition"
                                  style={{
                                    borderColor: done ? p.color.bg : '#BCBEC0',
                                    backgroundColor: done ? p.color.bg : 'white',
                                  }}
                                >
                                  {done && (
                                    <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <span className={`text-sm leading-relaxed ${done ? 'line-through text-grey-400' : 'text-tertiary-dark'}`}>
                                {item}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div>
                    <h4 className="text-xs font-bold text-tertiary-dark uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-white text-[10px]"
                        style={{ backgroundColor: p.color.bg }}
                      >
                        Deliverables
                      </span>
                    </h4>
                    <div className="space-y-2">
                      {p.deliverables.map(del => {
                        const done = checklist[p.id]?.[del.name] || false;
                        return (
                          <label
                            key={del.name}
                            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-grey-50 transition"
                          >
                            <div className="relative mt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => toggleChecklist(p.id, del.name)}
                                className="sr-only"
                              />
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center border-2 transition"
                                style={{
                                  borderColor: done ? p.color.bg : '#BCBEC0',
                                  backgroundColor: done ? p.color.bg : 'white',
                                }}
                              >
                                {done && (
                                  <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm ${done ? 'line-through text-grey-400' : 'text-tertiary-dark'}`}>
                                {del.name}
                              </span>
                              <span className={`ml-2 text-[10px] ${del.required ? 'text-red-500' : 'text-grey-400'}`}>
                                {del.required ? '● Required' : '○ Optional'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Phase gate box */}
                    <div
                      className="mt-4 rounded-xl p-4 border-2"
                      style={{ borderColor: p.color.bg, backgroundColor: p.color.light }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color.text }}>
                        Phase Gate to Pass
                      </p>
                      <p className="text-xs text-tertiary-dark leading-relaxed">{p.gate}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Source attribution ──────────────────────────────────────── */}
        <div className="bg-surface-teal rounded-2xl border border-grey-200 p-5">
          <h3 className="text-xs font-bold text-tertiary-dark mb-2">Source Document</h3>
          <p className="text-xs text-tertiary leading-relaxed">
            This module is based on the <strong className="text-tertiary-dark">ESABCC Project Manual v2.1</strong> (22 October 2023). The five-phase project lifecycle (Inception → Scoping → Analysis &amp; Drafting → Production &amp; Outreach → Evaluation) is the official project management framework used by the European Scientific Advisory Board on Climate Change. All activities, deliverables, roles and phase gates are drawn directly from the project manual. The Gantt chart illustrates a typical 18-month project timeline; actual project durations will vary.
          </p>
        </div>
      </div>
    </div>
  );
}
