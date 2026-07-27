import * as pg from '../../src/data/policy-gaps.ts';
import * as sg from '../../src/data/summer-prep-sector-gaps.ts';
import * as syn from '../../src/data/summer-prep-synergies.ts';
import { ESABCC_REPORT_INDICATORS } from '../../src/data/esabcc-indicators.ts';
import fs from 'fs';
const plain = (m) => Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v !== 'function'));
const out = { policyGaps: plain(pg), sectorGaps: plain(sg), synergies: plain(syn), indicators: ESABCC_REPORT_INDICATORS };
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log('gaps', pg.POLICY_GAPS.length, '| synergies', syn.SYNERGIES.length, '| candidates', sg.CANDIDATE_GAPS.length, '| reassessments', Object.keys(sg.GAP_REASSESSMENTS).length, '| indicators', ESABCC_REPORT_INDICATORS.length);
