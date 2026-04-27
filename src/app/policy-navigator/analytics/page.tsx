'use client';
import dynamic from 'next/dynamic';
import { policies, connections } from '@/data/policies';
import { fetchAnnotationStats, getTagColor, DEFAULT_TAGS } from '@/lib/store';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

const AnalyticsCharts = dynamic(() => import('@/components/AnalyticsCharts'), { ssr: false });
const ActivityFeed = dynamic(() => import('@/components/ActivityFeed'), { ssr: false });

type Tab = 'policy-data' | 'text-analysis' | 'content-analysis' | 'network-analysis' | 'user-activity';

// ─── Text Analysis Helpers ─────────────────────────────────────────────────

function computeWordFrequency(texts: string[]): Record<string, number> {
  const stopWords = new Set(['the','and','of','to','in','a','is','that','for','it','with','as','was','on','are','be','by','this','an','at','or','from','but','not','they','have','has','had','which','their','will','been','its','all','would','can','if','may','could','should','more','other','into','also','than','these','such','between','through','each','under','shall','any','those','after','only','where','most','about','upon','when','no','one','who','within','being','both','while','what','further','how','set','out','up','new','including','very','over','so','well','article','member','commission','european','union','council','parliament','states','measures','regulation','directive','accordance','pursuant','paragraph','referred','national','ensure','regard','particular','relevant']);
  const freq: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^a-záàâãäéèêëíìîïóòôõöúùûüñç\s-]/g, '').split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && !stopWords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }
  }
  return freq;
}

function computeBigrams(texts: string[]): Record<string, number> {
  const stopWords = new Set(['the','and','of','to','in','a','is','that','for','it','with','as','was','on','are','be','by','this','an','at','or','from','but','not']);
  const freq: Record<string, number> = {};
  for (const text of texts) {
    const words = text.toLowerCase().replace(/[^a-záàâãäéèêëíìîïóòôõöúùûüñç\s-]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      freq[bigram] = (freq[bigram] || 0) + 1;
    }
  }
  return freq;
}

function computeSentiment(text: string): { score: number; label: string; strongWords: string[]; weakWords: string[] } {
  const strong = ['shall', 'must', 'obligation', 'binding', 'enforce', 'mandatory', 'prohibit', 'require', 'ensure', 'guarantee', 'commit', 'target', 'deadline', 'penalty', 'sanction'];
  const weak = ['may', 'should', 'could', 'encourage', 'voluntary', 'consider', 'endeavour', 'aspire', 'recommend', 'invite', 'strive', 'aim', 'seek', 'explore', 'promote'];

  const words = text.toLowerCase().split(/\s+/);
  const strongFound = strong.filter(w => words.includes(w));
  const weakFound = weak.filter(w => words.includes(w));
  const strongCount = strongFound.reduce((sum, w) => sum + words.filter(x => x === w).length, 0);
  const weakCount = weakFound.reduce((sum, w) => sum + words.filter(x => x === w).length, 0);
  const total = strongCount + weakCount;
  const score = total > 0 ? (strongCount - weakCount) / total : 0;

  return {
    score,
    label: score > 0.3 ? 'Strong/Binding' : score < -0.3 ? 'Weak/Aspirational' : 'Moderate',
    strongWords: strongFound,
    weakWords: weakFound,
  };
}

function computeReadability(text: string): { syllables: number; words: number; sentences: number; fleschKincaid: number; level: string } {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const syllables = text.toLowerCase().split(/\s+/).reduce((sum, word) => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (!cleaned) return sum;
    const matches = cleaned.match(/[aeiouy]+/g);
    return sum + Math.max(1, matches ? matches.length : 1);
  }, 0);

  const fleschKincaid = words > 0 && sentences > 0
    ? 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    : 0;

  const level = fleschKincaid < 8 ? 'Easy' : fleschKincaid < 12 ? 'Moderate' : fleschKincaid < 16 ? 'Difficult' : 'Very Difficult';
  return { syllables, words, sentences, fleschKincaid: Math.round(fleschKincaid * 10) / 10, level };
}

function findPolicyGaps(policiesData: typeof policies): { domain: string; gaps: string[] }[] {
  const domainGaps: Record<string, string[]> = {};
  const domains = [...new Set(policiesData.map(p => p.domain))];

  for (const domain of domains) {
    const domainPolicies = policiesData.filter(p => p.domain === domain);
    const gaps: string[] = [];

    if (domainPolicies.every(p => p.status !== 'in_force')) {
      gaps.push('No active legislation in force');
    }
    if (domainPolicies.length < 3) {
      gaps.push('Limited policy coverage (fewer than 3 instruments)');
    }

    const connCount = domainPolicies.reduce((sum, p) => {
      return sum + connections.filter(c => c.source_policy_id === p.id || c.target_policy_id === p.id).length;
    }, 0);
    if (connCount / Math.max(domainPolicies.length, 1) < 2) {
      gaps.push('Low cross-referencing with other policies');
    }

    const hasRecentPolicy = domainPolicies.some(p => {
      const year = p.adoption_date ? parseInt(p.adoption_date.slice(0, 4)) : 0;
      return year >= 2020;
    });
    if (!hasRecentPolicy) {
      gaps.push('No recent policy updates (post-2020)');
    }

    if (gaps.length > 0) {
      domainGaps[domain] = gaps;
    }
  }

  return Object.entries(domainGaps).map(([domain, gaps]) => ({ domain, gaps }));
}

// ─── Content Analysis Helpers ───────────────────────────────────────────────

const CODING_FRAMEWORK = {
  'Policy Instruments': {
    'Regulatory': /\b(regulation|directive|prohibition|ban|restrict|standard|requirement|mandate|rule|law)\b/gi,
    'Economic': /\b(tax|subsidy|incentive|tariff|fee|levy|allowance|trading|auction|fund|grant|financial)\b/gi,
    'Informational': /\b(label|report|disclosure|transparency|information|awareness|education|training|guidance)\b/gi,
    'Voluntary': /\b(voluntary|agreement|self-regulation|best practice|guideline|code of conduct|pledge|commitment)\b/gi,
  },
  'Policy Targets': {
    'Quantitative': /\b(\d+\s*%|\d+\s*percent|\d+\s*GW|\d+\s*Mt|\d+\s*tonne|\d+\s*TWh|reduction of \d+|target of \d+|at least \d+)\b/gi,
    'Qualitative Goals': /\b(climate neutrality|sustainable development|just transition|circular economy|green economy|zero pollution|carbon neutral|net.?zero|decarboni[sz]ation)\b/gi,
  },
  'Temporal Markers': {
    'Deadlines': /\b(by \d{4}|before \d{4}|no later than|deadline|due date|within \d+ (?:months|years|days))\b/gi,
    'Review Dates': /\b(review|assessment|evaluation|revisit|progress report|mid-term|periodic)\b/gi,
    'Phase-in': /\b(phase.?in|gradual|transition period|step.?by.?step|progressive|incremental|staged)\b/gi,
  },
  'Stakeholder References': {
    'Member States': /\b(member states?|national authorit|competent authorit|national government)\b/gi,
    'Industry': /\b(industry|operator|manufacturer|producer|enterprise|company|business|SME|sector)\b/gi,
    'Citizens': /\b(citizen|consumer|public|household|individual|civil society|community)\b/gi,
    'Institutions': /\b(commission|parliament|council|agency|body|committee|board|authority)\b/gi,
  },
  'Compliance Mechanisms': {
    'Monitoring': /\b(monitor|surveillance|inspect|verify|audit|track|measure|indicator)\b/gi,
    'Reporting': /\b(report|notify|submit|communicate|inform|declaration|disclosure)\b/gi,
    'Enforcement': /\b(enforce|infringement|non.?compliance|breach|violation|sanction|compulsory)\b/gi,
    'Penalties': /\b(penalty|fine|punish|penalt|sanction|fee|forfeiture|surcharge)\b/gi,
  },
};

function computeCodingMatrix(policiesData: typeof policies): { categories: string[]; subcategories: string[]; matrix: Record<string, Record<string, number>> } {
  const categories: string[] = [];
  const subcategories: string[] = [];
  const catMap: Record<string, string> = {};

  for (const [cat, subs] of Object.entries(CODING_FRAMEWORK)) {
    for (const sub of Object.keys(subs)) {
      const key = `${cat}: ${sub}`;
      categories.push(cat);
      subcategories.push(key);
      catMap[key] = cat;
    }
  }

  const matrix: Record<string, Record<string, number>> = {};
  for (const p of policiesData) {
    const text = (p as any).full_text || p.summary;
    matrix[p.id] = {};
    for (const [cat, subs] of Object.entries(CODING_FRAMEWORK)) {
      for (const [sub, regex] of Object.entries(subs)) {
        const key = `${cat}: ${sub}`;
        const matches = text.match(regex);
        matrix[p.id][key] = matches ? matches.length : 0;
      }
    }
  }

  return { categories: [...new Set(categories)], subcategories, matrix };
}

function computeThemes(policiesData: typeof policies): { theme: string; keywords: string[]; count: number; policyIds: string[] }[] {
  const themePatterns: Record<string, string[]> = {
    'Emissions Reduction': ['emission', 'greenhouse', 'carbon', 'CO2', 'reduction', 'mitigation', 'decarboni'],
    'Renewable Energy': ['renewable', 'solar', 'wind', 'biomass', 'hydrogen', 'clean energy', 'geothermal'],
    'Energy Efficiency': ['efficiency', 'consumption', 'performance', 'building', 'insulation', 'renovation'],
    'Carbon Markets': ['trading', 'allowance', 'ETS', 'auction', 'carbon price', 'market', 'cap'],
    'Biodiversity & Land': ['biodiversity', 'forest', 'land use', 'ecosystem', 'nature', 'habitat', 'soil'],
    'Transport & Mobility': ['transport', 'vehicle', 'fuel', 'aviation', 'shipping', 'mobility', 'electric'],
    'Industry & Manufacturing': ['industry', 'manufacturing', 'industrial', 'production', 'factory', 'installation'],
    'Finance & Investment': ['finance', 'investment', 'fund', 'budget', 'taxonomy', 'sustainable finance', 'green bond'],
    'Governance & Compliance': ['governance', 'monitoring', 'reporting', 'compliance', 'enforcement', 'transparency'],
    'Just Transition': ['just transition', 'social', 'worker', 'employment', 'skill', 'vulnerable', 'cohesion'],
  };

  return Object.entries(themePatterns).map(([theme, keywords]) => {
    const regex = new RegExp(keywords.join('|'), 'gi');
    let count = 0;
    const policyIds: string[] = [];
    for (const p of policiesData) {
      const text = ((p as any).full_text || p.summary).toLowerCase();
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        count += matches.length;
        policyIds.push(p.id);
      }
    }
    return { theme, keywords, count, policyIds };
  }).sort((a, b) => b.count - a.count);
}

function computeTfIdf(policiesData: typeof policies): Record<string, { term: string; score: number }[]> {
  const stopWords = new Set(['the','and','of','to','in','a','is','that','for','it','with','as','was','on','are','be','by','this','an','at','or','from','but','not','they','have','has','had','which','their','will','been','its','all','would','can','if','may','could','should','more','other','into','also','than','these','such','between','through','each','under','shall','any','those','after','only','where','most','about','upon','when','no','one','who','within','being','both','while','what','further','how','set','out','up','new','including','very','over','so','well','article','member','commission','european','union','council','parliament','states','measures','regulation','directive','accordance','pursuant','paragraph','referred','national','ensure','regard','particular','relevant']);
  const N = policiesData.length;

  // Tokenize each document
  const docTokens: Record<string, Record<string, number>> = {};
  const docWordCounts: Record<string, number> = {};
  const docContaining: Record<string, number> = {};

  for (const p of policiesData) {
    const text = ((p as any).full_text || p.summary).toLowerCase().replace(/[^a-záàâãäéèêëíìîïóòôõöúùûüñç\s-]/g, '');
    const words: string[] = text.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    docTokens[p.id] = freq;
    docWordCounts[p.id] = words.length;
    for (const w of Object.keys(freq)) {
      docContaining[w] = (docContaining[w] || 0) + 1;
    }
  }

  const result: Record<string, { term: string; score: number }[]> = {};
  for (const p of policiesData) {
    const scores: { term: string; score: number }[] = [];
    const totalWords: number = docWordCounts[p.id] || 1;
    for (const [term, count] of Object.entries(docTokens[p.id] || {})) {
      const tf: number = count / totalWords;
      const idf = Math.log(N / (docContaining[term] || 1));
      scores.push({ term, score: Math.round(tf * idf * 10000) / 10000 });
    }
    result[p.id] = scores.sort((a, b) => b.score - a.score).slice(0, 10);
  }
  return result;
}

function computeJaccardSimilarity(policiesData: typeof policies): { p1: string; p2: string; similarity: number; shared: number; total: number }[] {
  const stopWords = new Set(['the','and','of','to','in','a','is','that','for','it','with','as','was','on','are','be','by','this','an','at','or','from','but','not','they','have','has','had','which','their','will','been','its','all','would','can','if','may','could','should','more','other','into','also','than','these','such','between','through','each','under','shall','any','those','after','only','where','most','about','upon','when','no','one','who','within','being','both','while','what','further','how','set','out','up','new','including','very','over','so','well','article','member','commission','european','union','council','parliament','states','measures','regulation','directive','accordance','pursuant','paragraph','referred','national','ensure','regard','particular','relevant']);

  const termSets: Record<string, Set<string>> = {};
  for (const p of policiesData) {
    const text = ((p as any).full_text || p.summary).toLowerCase().replace(/[^a-záàâãäéèêëíìîïóòôõöúùûüñç\s-]/g, '');
    termSets[p.id] = new Set(text.split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w)));
  }

  const pairs: { p1: string; p2: string; similarity: number; shared: number; total: number }[] = [];
  for (let i = 0; i < policiesData.length; i++) {
    for (let j = i + 1; j < policiesData.length; j++) {
      const a = termSets[policiesData[i].id];
      const b = termSets[policiesData[j].id];
      const intersection = new Set(Array.from(a).filter(x => b.has(x)));
      const union = new Set(Array.from(a).concat(Array.from(b)));
      const similarity = union.size > 0 ? intersection.size / union.size : 0;
      pairs.push({
        p1: policiesData[i].id,
        p2: policiesData[j].id,
        similarity: Math.round(similarity * 1000) / 1000,
        shared: intersection.size,
        total: union.size,
      });
    }
  }
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

function findKWIC(policiesData: typeof policies, searchTerm: string): { policyId: string; policyTitle: string; before: string; term: string; after: string }[] {
  if (!searchTerm.trim()) return [];
  const results: { policyId: string; policyTitle: string; before: string; term: string; after: string }[] = [];
  const regex = new RegExp(`\\b${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');

  for (const p of policiesData) {
    const text = (p as any).full_text || p.summary;
    const words = text.split(/\s+/);
    const fullText = text;
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const beforeStart = Math.max(0, match.index - 120);
      const afterEnd = Math.min(fullText.length, match.index + match[0].length + 120);
      const before = fullText.slice(beforeStart, match.index).split(/\s+/).slice(-20).join(' ');
      const after = fullText.slice(match.index + match[0].length, afterEnd).split(/\s+/).slice(0, 20).join(' ');
      results.push({
        policyId: p.id,
        policyTitle: p.short_title,
        before,
        term: match[0],
        after,
      });
      if (results.length >= 200) return results;
    }
  }
  return results;
}

export default function PolicyAnalyticsPage() {
  const [stats, setStats] = useState<{ total: number; byTag: Record<string, number>; byPolicy: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<Tab>('policy-data');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [kwicSearch, setKwicSearch] = useState('');
  const [comparePolicies, setComparePolicies] = useState<string[]>([]);

  useEffect(() => { fetchAnnotationStats().then(setStats); }, []);

  const domains = useMemo(() => [...new Set(policies.map(p => p.domain))].sort(), []);
  const statuses = useMemo(() => [...new Set(policies.map(p => p.status))], []);
  const docTypes = useMemo(() => [...new Set(policies.map(p => p.document_type))], []);

  const filteredPolicies = useMemo(() => {
    return selectedDomain === 'all' ? policies : policies.filter(p => p.domain === selectedDomain);
  }, [selectedDomain]);

  // Text analysis
  const textAnalysis = useMemo(() => {
    const texts = filteredPolicies.map(p => `${p.title} ${p.summary}`);
    const allText = texts.join(' ');

    const wordFreq = computeWordFrequency(texts);
    const bigrams = computeBigrams(texts);
    const sentiment = computeSentiment(allText);
    const readability = computeReadability(allText);

    // Domain co-occurrence
    const domainConnections: Record<string, Record<string, number>> = {};
    for (const conn of connections) {
      const src = policies.find(p => p.id === conn.source_policy_id);
      const tgt = policies.find(p => p.id === conn.target_policy_id);
      if (src && tgt && src.domain !== tgt.domain) {
        const key1 = src.domain;
        const key2 = tgt.domain;
        if (!domainConnections[key1]) domainConnections[key1] = {};
        domainConnections[key1][key2] = (domainConnections[key1][key2] || 0) + 1;
      }
    }

    return { wordFreq, bigrams, sentiment, readability, domainConnections };
  }, [filteredPolicies]);

  const policyGaps = useMemo(() => findPolicyGaps(filteredPolicies), [filteredPolicies]);

  // Content analysis
  const codingMatrix = useMemo(() => computeCodingMatrix(filteredPolicies), [filteredPolicies]);
  const themes = useMemo(() => computeThemes(filteredPolicies), [filteredPolicies]);
  const tfidf = useMemo(() => computeTfIdf(filteredPolicies), [filteredPolicies]);
  const jaccardPairs = useMemo(() => computeJaccardSimilarity(filteredPolicies), [filteredPolicies]);
  const kwicResults = useMemo(() => findKWIC(filteredPolicies, kwicSearch), [filteredPolicies, kwicSearch]);

  const compareData = useMemo(() => {
    return comparePolicies.map(id => {
      const p = filteredPolicies.find(pp => pp.id === id);
      if (!p) return null;
      const text = (p as any).full_text || p.summary;
      const sent = computeSentiment(text);
      const read = computeReadability(text);
      const words = text.split(/\s+/);
      const strongCount = ['shall','must','obligation','binding','enforce','mandatory','prohibit','require'].reduce(
        (sum, w) => sum + words.filter((x: string) => x.toLowerCase() === w).length, 0
      );
      const weakCount = ['may','should','could','encourage','voluntary','consider','recommend'].reduce(
        (sum, w) => sum + words.filter((x: string) => x.toLowerCase() === w).length, 0
      );
      const bindingRatio = (strongCount + weakCount) > 0 ? (strongCount / (strongCount + weakCount) * 100).toFixed(0) : 'N/A';
      const articleMatches = text.match(/\bArticle\s+\d+/gi);
      return {
        id: p.id,
        title: p.short_title,
        languageStrength: sent.label,
        strengthScore: sent.score,
        readabilityGrade: read.fleschKincaid,
        readabilityLevel: read.level,
        wordCount: read.words,
        articles: articleMatches ? articleMatches.length : 0,
        bindingRatio: `${bindingRatio}%`,
        topTerms: (tfidf[p.id] || []).slice(0, 5).map(t => t.term),
      };
    }).filter(Boolean);
  }, [comparePolicies, filteredPolicies, tfidf]);

  // Network analysis
  const networkMetrics = useMemo(() => {
    const degrees: Record<string, number> = {};
    const inDegrees: Record<string, number> = {};
    const outDegrees: Record<string, number> = {};

    for (const p of policies) {
      degrees[p.id] = 0;
      inDegrees[p.id] = 0;
      outDegrees[p.id] = 0;
    }

    for (const c of connections) {
      degrees[c.source_policy_id] = (degrees[c.source_policy_id] || 0) + 1;
      degrees[c.target_policy_id] = (degrees[c.target_policy_id] || 0) + 1;
      outDegrees[c.source_policy_id] = (outDegrees[c.source_policy_id] || 0) + 1;
      inDegrees[c.target_policy_id] = (inDegrees[c.target_policy_id] || 0) + 1;
    }

    const degreeValues = Object.values(degrees);
    const avgDegree = degreeValues.length > 0 ? degreeValues.reduce((a, b) => a + b, 0) / degreeValues.length : 0;
    const maxDegree = Math.max(...degreeValues, 0);
    const density = policies.length > 1 ? (2 * connections.length) / (policies.length * (policies.length - 1)) : 0;

    // Identify bridges (policies that connect different domains)
    const bridges = policies
      .map(p => {
        const pConns = connections.filter(c => c.source_policy_id === p.id || c.target_policy_id === p.id);
        const connectedDomains = new Set(pConns.map(c => {
          const otherId = c.source_policy_id === p.id ? c.target_policy_id : c.source_policy_id;
          return policies.find(pp => pp.id === otherId)?.domain;
        }).filter(Boolean));
        return { policy: p, bridgeDomains: connectedDomains.size, connections: pConns.length };
      })
      .filter(b => b.bridgeDomains > 1)
      .sort((a, b) => b.bridgeDomains - a.bridgeDomains);

    // Hub policies (highest degree)
    const hubs = Object.entries(degrees)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, deg]) => ({ policy: policies.find(p => p.id === id)!, degree: deg, inDegree: inDegrees[id] || 0, outDegree: outDegrees[id] || 0 }));

    return { avgDegree: Math.round(avgDegree * 100) / 100, maxDegree, density: Math.round(density * 1000) / 1000, bridges: bridges.slice(0, 10), hubs };
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'policy-data', label: 'Policy Overview' },
    { key: 'text-analysis', label: 'Text Analysis' },
    { key: 'content-analysis', label: 'Content Analysis' },
    { key: 'network-analysis', label: 'Network Analysis' },
    { key: 'user-activity', label: 'User Activity' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      <Link href="/policy-navigator" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-secondary hover:text-primary transition mb-3">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        Back to Policy Navigator
      </Link>
      <h1 className="text-2xl font-bold text-tertiary-dark mb-6">Analytics Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Policies', value: policies.length, color: 'text-[#004B7F]' },
          { label: 'Connections', value: connections.length, color: 'text-[#FF9933]' },
          { label: 'Domains', value: domains.length, color: 'text-[#3D5265]' },
          { label: 'Annotations', value: stats?.total || 0, color: 'text-[#7C3AED]' },
          { label: 'Network Density', value: `${(networkMetrics.density * 100).toFixed(1)}%`, color: 'text-[#007B6C]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded shadow-sm border border-gray-200 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Domain filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500 font-medium">Filter domain:</span>
        <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1">
          <option value="all">All Domains</option>
          {domains.map(d => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t.key ? 'border-[#FF9933] text-[#FF9933]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'policy-data' && (
        <div className="space-y-8">
          {/* Domain breakdown */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Policies by Domain</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {domains.map(d => {
                const count = policies.filter(p => p.domain === d).length;
                const pct = Math.round((count / policies.length) * 100);
                return (
                  <div key={d} className="p-3 rounded border border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDomain(d)}>
                    <p className="text-lg font-bold text-[#3D5265]">{count}</p>
                    <p className="text-xs text-gray-500 capitalize">{d.replace('_', ' ')}</p>
                    <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#004B7F] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status + DocType */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">By Status</h2>
              <div className="flex flex-wrap gap-3">
                {statuses.map(s => (
                  <div key={s} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded">
                    <span className="text-lg font-bold text-[#3D5265]">{policies.filter(p => p.status === s).length}</span>
                    <span className="text-sm text-gray-500 capitalize">{s.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">By Document Type</h2>
              <div className="flex flex-wrap gap-3">
                {docTypes.map(dt => (
                  <div key={dt} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded">
                    <span className="text-lg font-bold text-[#3D5265]">{policies.filter(p => p.document_type === dt).length}</span>
                    <span className="text-sm text-gray-500 capitalize">{dt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts */}
          {policies.length > 0 && <AnalyticsCharts policies={policies} connections={connections} />}
        </div>
      )}

      {tab === 'text-analysis' && (
        <div className="space-y-6">
          {/* Language Strength Analysis */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Policy Language Strength Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 rounded border border-gray-100 text-center">
                <p className={`text-2xl font-bold ${textAnalysis.sentiment.score > 0.3 ? 'text-green-600' : textAnalysis.sentiment.score < -0.3 ? 'text-red-500' : 'text-amber-500'}`}>
                  {textAnalysis.sentiment.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">Overall Language Tone</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.abs(textAnalysis.sentiment.score) * 100}%`, backgroundColor: textAnalysis.sentiment.score > 0 ? '#10B981' : '#EF4444' }} />
                </div>
              </div>
              <div className="p-4 rounded border border-gray-100">
                <p className="text-sm font-medium text-green-700 mb-2">Binding Language Found</p>
                <div className="flex flex-wrap gap-1">
                  {textAnalysis.sentiment.strongWords.map(w => (
                    <span key={w} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">{w}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded border border-gray-100">
                <p className="text-sm font-medium text-amber-700 mb-2">Non-binding Language Found</p>
                <div className="flex flex-wrap gap-1">
                  {textAnalysis.sentiment.weakWords.map(w => (
                    <span key={w} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{w}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-policy sentiment */}
            <h3 className="text-sm font-medium text-[#3D5265] mb-3">Per-Policy Language Strength</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredPolicies.map(p => {
                const s = computeSentiment(`${p.title} ${p.summary}`);
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1.5">
                    <span className={`text-xs font-medium w-20 ${s.score > 0.3 ? 'text-green-600' : s.score < -0.3 ? 'text-red-500' : 'text-amber-500'}`}>
                      {s.label.split('/')[0]}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${50 + s.score * 50}%`,
                        backgroundColor: s.score > 0.3 ? '#10B981' : s.score < -0.3 ? '#EF4444' : '#F59E0B'
                      }} />
                    </div>
                    <span className="text-xs text-gray-600 w-48 truncate">{p.short_title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Readability */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Readability Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Words', value: textAnalysis.readability.words.toLocaleString() },
                { label: 'Sentences', value: textAnalysis.readability.sentences.toLocaleString() },
                { label: 'Avg Words/Sentence', value: (textAnalysis.readability.words / Math.max(textAnalysis.readability.sentences, 1)).toFixed(1) },
                { label: 'Flesch-Kincaid Grade', value: textAnalysis.readability.fleschKincaid.toString() },
                { label: 'Difficulty Level', value: textAnalysis.readability.level },
              ].map(m => (
                <div key={m.label} className="p-3 rounded border border-gray-100 text-center">
                  <p className="text-xl font-bold text-[#3D5265]">{m.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Keywords */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Top Keywords</h2>
              <div className="space-y-2">
                {Object.entries(textAnalysis.wordFreq)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 20)
                  .map(([word, count]) => (
                    <div key={word} className="flex items-center gap-2">
                      <span className="text-sm font-mono text-[#004B7F] w-32 truncate">{word}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#004B7F]/60 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(textAnalysis.wordFreq).slice(0, 1))) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
              <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Top Bigrams (Word Pairs)</h2>
              <div className="space-y-2">
                {Object.entries(textAnalysis.bigrams)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 20)
                  .map(([bigram, count]) => (
                    <div key={bigram} className="flex items-center gap-2">
                      <span className="text-sm font-mono text-[#007B6C] w-40 truncate">{bigram}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#007B6C]/60 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(textAnalysis.bigrams).slice(0, 1))) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Policy Gap Analysis */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Policy Gap Analysis</h2>
            {policyGaps.length > 0 ? (
              <div className="space-y-3">
                {policyGaps.map(({ domain, gaps }) => (
                  <div key={domain} className="p-3 rounded border border-amber-200 bg-amber-50">
                    <p className="text-sm font-medium text-amber-800 capitalize mb-1">{domain.replace(/_/g, ' ')}</p>
                    <ul className="space-y-1">
                      {gaps.map(gap => (
                        <li key={gap} className="text-xs text-amber-700 flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No significant gaps identified in current domain filter.</p>
            )}
          </div>

          {/* Cross-domain connection matrix */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Cross-Domain Connection Matrix</h2>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="p-1"></th>
                    {domains.slice(0, 10).map(d => (
                      <th key={d} className="p-1 text-gray-500 font-normal writing-mode-vertical" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxWidth: '2rem' }}>
                        <span className="capitalize truncate">{d.replace(/_/g, ' ').slice(0, 8)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {domains.slice(0, 10).map(d1 => (
                    <tr key={d1}>
                      <td className="p-1 text-gray-600 capitalize text-right pr-2">{d1.replace(/_/g, ' ').slice(0, 10)}</td>
                      {domains.slice(0, 10).map(d2 => {
                        const count = (textAnalysis.domainConnections[d1]?.[d2] || 0) + (textAnalysis.domainConnections[d2]?.[d1] || 0);
                        return (
                          <td key={d2} className="p-1 text-center">
                            {d1 === d2 ? (
                              <span className="w-6 h-6 inline-flex items-center justify-center bg-gray-100 rounded text-gray-400">-</span>
                            ) : count > 0 ? (
                              <span className="w-6 h-6 inline-flex items-center justify-center rounded text-white text-[10px] font-bold"
                                style={{ backgroundColor: `rgba(0,75,127,${Math.min(count / 10, 1)})` }}>
                                {count}
                              </span>
                            ) : (
                              <span className="w-6 h-6 inline-flex items-center justify-center bg-gray-50 rounded text-gray-300">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'content-analysis' && (
        <div className="space-y-6">
          {/* KWIC / Concordance Search */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Concordance / Key Word In Context (KWIC)</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={kwicSearch}
                onChange={e => setKwicSearch(e.target.value)}
                placeholder="Search for a term (e.g., emission, renewable, target)..."
                className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933]/50 focus:border-[#FF9933]"
              />
              {kwicSearch && (
                <button onClick={() => setKwicSearch('')} className="text-xs text-gray-400 hover:text-gray-600 px-2">Clear</button>
              )}
            </div>
            {kwicSearch.trim() && (
              <div>
                <p className="text-xs text-gray-500 mb-3">{kwicResults.length} occurrence{kwicResults.length !== 1 ? 's' : ''} found across policies</p>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {kwicResults.slice(0, 50).map((r, i) => (
                    <div key={i} className="flex gap-2 text-xs py-1.5 border-b border-gray-50">
                      <span className="text-[#004B7F] font-medium w-36 shrink-0 truncate">{r.policyTitle}</span>
                      <span className="text-gray-400 text-right">...{r.before}</span>
                      <span className="font-bold text-[#FF9933] whitespace-nowrap">{r.term}</span>
                      <span className="text-gray-400">{r.after}...</span>
                    </div>
                  ))}
                </div>
                {kwicResults.length > 50 && (
                  <p className="text-xs text-gray-400 mt-2 italic">Showing first 50 of {kwicResults.length} results.</p>
                )}
              </div>
            )}
            {!kwicSearch.trim() && (
              <p className="text-sm text-gray-400 italic">Enter a search term to see it in context across all policy documents.</p>
            )}
          </div>

          {/* Coding Framework Matrix */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Coding Framework Matrix</h2>
            <p className="text-xs text-gray-500 mb-4">Pattern-based content coding across policy documents. Counts of regex matches per category.</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="p-1.5 text-left text-gray-500 font-medium sticky left-0 bg-white">Policy</th>
                    {codingMatrix.subcategories.map(sc => (
                      <th key={sc} className="p-1 text-gray-500 font-normal" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxWidth: '2rem', height: '8rem' }}>
                        <span className="truncate">{sc.split(': ')[1]}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.slice(0, 20).map(p => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="p-1.5 text-gray-600 truncate max-w-[12rem] sticky left-0 bg-white">{p.short_title}</td>
                      {codingMatrix.subcategories.map(sc => {
                        const val = codingMatrix.matrix[p.id]?.[sc] || 0;
                        const intensity = Math.min(val / 10, 1);
                        return (
                          <td key={sc} className="p-1 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: val > 0 ? `rgba(0,75,127,${0.1 + intensity * 0.7})` : '#f9fafb',
                                color: val > 3 ? 'white' : val > 0 ? '#004B7F' : '#d1d5db',
                              }}>
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPolicies.length > 20 && (
              <p className="text-xs text-gray-400 mt-2 italic">Showing first 20 of {filteredPolicies.length} policies.</p>
            )}
          </div>

          {/* Thematic Analysis */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Thematic Analysis</h2>
            <p className="text-xs text-gray-500 mb-4">Theme prevalence based on keyword cluster frequency across policies.</p>
            <div className="space-y-3">
              {themes.map(t => {
                const maxCount = themes[0]?.count || 1;
                return (
                  <div key={t.theme}>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-[#3D5265] w-48 shrink-0">{t.theme}</span>
                      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#004B7F]/70 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${(t.count / maxCount) * 100}%` }}>
                          <span className="text-[10px] text-white font-bold">{t.count}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 w-24 text-right">{t.policyIds.length} policies</span>
                    </div>
                    <div className="flex gap-1 ml-48 pl-3">
                      {t.keywords.slice(0, 5).map(kw => (
                        <span key={kw} className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TF-IDF Distinctive Keywords */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">TF-IDF Distinctive Keywords</h2>
            <p className="text-xs text-gray-500 mb-4">Terms that are most distinctive to each policy (important in that document but rare across others).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[32rem] overflow-y-auto">
              {filteredPolicies.slice(0, 16).map(p => (
                <div key={p.id} className="p-3 rounded border border-gray-100">
                  <p className="text-xs font-medium text-[#3D5265] mb-2 truncate">{p.short_title}</p>
                  <div className="flex flex-wrap gap-1">
                    {(tfidf[p.id] || []).map((t, i) => (
                      <span key={t.term} className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `rgba(0,75,127,${0.08 + (1 - i / 10) * 0.2})`,
                          color: i < 3 ? '#004B7F' : '#6b7280',
                          fontWeight: i < 3 ? 600 : 400,
                        }}>
                        {t.term} <span className="text-[10px] opacity-60">{t.score.toFixed(4)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comparative Policy Table */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Comparative Policy Table</h2>
            <p className="text-xs text-gray-500 mb-3">Select 2-4 policies to compare side-by-side.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className="text-sm border border-gray-200 rounded px-2 py-1"
                value=""
                onChange={e => {
                  if (e.target.value && !comparePolicies.includes(e.target.value) && comparePolicies.length < 4) {
                    setComparePolicies([...comparePolicies, e.target.value]);
                  }
                }}
              >
                <option value="">Add policy to compare...</option>
                {filteredPolicies.filter(p => !comparePolicies.includes(p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.short_title}</option>
                ))}
              </select>
              {comparePolicies.map(id => {
                const p = filteredPolicies.find(pp => pp.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 text-xs bg-[#004B7F]/10 text-[#004B7F] px-2 py-1 rounded">
                    {p?.short_title || id}
                    <button onClick={() => setComparePolicies(comparePolicies.filter(x => x !== id))} className="hover:text-red-500 ml-1">&times;</button>
                  </span>
                );
              })}
              {comparePolicies.length > 0 && (
                <button onClick={() => setComparePolicies([])} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
              )}
            </div>
            {compareData.length >= 2 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="p-2 text-left text-xs text-gray-500 font-medium">Metric</th>
                      {compareData.map((d: any) => (
                        <th key={d.id} className="p-2 text-left text-xs text-[#004B7F] font-medium max-w-[14rem] truncate">{d.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Language Strength', key: 'languageStrength' },
                      { label: 'Strength Score', key: 'strengthScore' },
                      { label: 'Readability Grade (FK)', key: 'readabilityGrade' },
                      { label: 'Readability Level', key: 'readabilityLevel' },
                      { label: 'Word Count', key: 'wordCount' },
                      { label: 'Articles Mentioned', key: 'articles' },
                      { label: 'Binding Ratio', key: 'bindingRatio' },
                    ].map(row => (
                      <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-2 text-xs text-gray-600 font-medium">{row.label}</td>
                        {compareData.map((d: any) => (
                          <td key={d.id} className="p-2 text-xs text-gray-700">
                            {typeof d[row.key] === 'number' ? (Math.round(d[row.key] * 100) / 100).toString() : d[row.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-2 text-xs text-gray-600 font-medium">Key Terms (TF-IDF)</td>
                      {compareData.map((d: any) => (
                        <td key={d.id} className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {d.topTerms.map((t: string) => (
                              <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Select at least 2 policies above to compare.</p>
            )}
          </div>

          {/* Inter-document Consistency / Jaccard Similarity */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Inter-document Consistency (Jaccard Similarity)</h2>
            <p className="text-xs text-gray-500 mb-4">Term-set overlap between policy pairs. Higher values indicate greater shared terminology.</p>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">
                <span className="w-48">Policy A</span>
                <span className="w-48">Policy B</span>
                <span className="flex-1">Similarity</span>
                <span className="w-16 text-right">Shared</span>
                <span className="w-16 text-right">Jaccard</span>
              </div>
              {jaccardPairs.slice(0, 30).map((pair, i) => {
                const pA = filteredPolicies.find(p => p.id === pair.p1);
                const pB = filteredPolicies.find(p => p.id === pair.p2);
                return (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-gray-50">
                    <span className="text-xs text-gray-600 w-48 truncate">{pA?.short_title}</span>
                    <span className="text-xs text-gray-600 w-48 truncate">{pB?.short_title}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#007B6C]/60 rounded-full" style={{ width: `${pair.similarity * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{pair.shared}</span>
                    <span className="text-xs font-mono text-[#007B6C] w-16 text-right">{pair.similarity.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
            {jaccardPairs.length > 30 && (
              <p className="text-xs text-gray-400 mt-2 italic">Showing top 30 most similar pairs of {jaccardPairs.length} total.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'network-analysis' && (
        <div className="space-y-6">
          {/* Network metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Degree', value: networkMetrics.avgDegree, desc: 'Average connections per policy' },
              { label: 'Max Degree', value: networkMetrics.maxDegree, desc: 'Most connected policy' },
              { label: 'Network Density', value: `${(networkMetrics.density * 100).toFixed(1)}%`, desc: 'Ratio of actual to possible connections' },
              { label: 'Bridge Policies', value: networkMetrics.bridges.length, desc: 'Policies connecting different domains' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded shadow-sm border border-gray-200 p-4">
                <p className="text-2xl font-bold text-[#004B7F]">{m.value}</p>
                <p className="text-sm font-medium text-[#3D5265] mt-1">{m.label}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Hub policies */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Hub Policies (Most Connected)</h2>
            <div className="space-y-2">
              {networkMetrics.hubs.map(h => (
                <div key={h.policy.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                  <div className="w-10 text-center">
                    <span className="text-lg font-bold text-[#004B7F]">{h.degree}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#3D5265]">{h.policy.short_title}</p>
                    <p className="text-xs text-gray-500 capitalize">{h.policy.domain.replace(/_/g, ' ')} &middot; In: {h.inDegree} &middot; Out: {h.outDegree}</p>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#004B7F]/60 rounded-full" style={{ width: `${(h.degree / networkMetrics.maxDegree) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bridge policies */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Bridge Policies (Cross-Domain Connectors)</h2>
            <p className="text-xs text-gray-500 mb-4">Policies that connect the most different domains, acting as integration points across the legislative framework.</p>
            <div className="space-y-2">
              {networkMetrics.bridges.map(b => (
                <div key={b.policy.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                  <div className="w-16 text-center">
                    <span className="text-sm font-bold text-[#007B6C]">{b.bridgeDomains} domains</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#3D5265]">{b.policy.short_title}</p>
                    <p className="text-xs text-gray-500">{b.connections} connections</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connection type distribution */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Connection Types Distribution</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['amends', 'implements', 'references', 'complements', 'repeals', 'is_part_of'].map(type => {
                const count = connections.filter(c => c.connection_type === type).length;
                const pct = connections.length > 0 ? Math.round((count / connections.length) * 100) : 0;
                return (
                  <div key={type} className="p-3 rounded border border-gray-100">
                    <p className="text-lg font-bold text-[#3D5265]">{count}</p>
                    <p className="text-xs text-gray-500 capitalize">{type.replace(/_/g, ' ')}</p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF9933] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{pct}% of all connections</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'user-activity' && (
        <div className="space-y-6">
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Annotation Summary</h2>
            {stats && stats.total > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  <span className="text-2xl font-bold text-[#7C3AED]">{stats.total}</span> annotations across{' '}
                  <span className="font-bold text-[#3D5265]">{Object.keys(stats.byPolicy).length}</span> policies
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byTag).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: getTagColor(tag) }}>
                      {tag.replace(/_/g, ' ')} ({count})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No annotations yet.</p>
            )}
          </div>

          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Available Tags</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {DEFAULT_TAGS.map(tag => (
                <div key={tag.name} className="flex items-start gap-3 p-3 rounded border border-gray-100">
                  <span className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: tag.color }} />
                  <div>
                    <p className="text-sm font-medium text-[#3D5265]">{tag.name.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{tag.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-gray-200 p-6">
            <h2 className="font-bold text-[#3D5265] text-sm mb-4 uppercase tracking-wider">Global Activity Feed</h2>
            <ActivityFeed limit={50} />
          </div>
        </div>
      )}
    </div>
  );
}
