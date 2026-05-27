/**
 * Dashboard charts showing policy domain distribution, connection types, and annotation statistics.
 */
'use client';
import { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Policy, PolicyConnection } from '@/lib/types';
import { getAnnotationStats, getTagColor, DEFAULT_TAGS } from '@/lib/store';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const DOMAIN_COLORS: Record<string, string> = {
  climate: '#007B6C', energy: '#FF9933', transport: '#6667AB',
  finance: '#004B7F', 'cross-cutting': '#3D5265', security: '#B83230',
  defense: '#808285', agriculture: '#00928F', industry: '#A530B8',
  digital: '#2D7DD2', trade: '#8B6914', circular_economy: '#2E8B57',
  health: '#C14040', environment: '#228B22', social: '#C77DBA',
  justice: '#7B3F61', migration: '#D4762C', education: '#4682B4',
  consumer: '#B8860B', fisheries: '#1E90FF',
};

const CONN_COLORS: Record<string, string> = {
  amends: '#B83230', implements: '#007B6C', references: '#004B7F',
  complements: '#FF9933', repeals: '#808285', is_part_of: '#6667AB',
};

interface Props { policies: Policy[]; connections: PolicyConnection[]; }

export default function AnalyticsCharts({ policies, connections }: Props) {
  const [annStats, setAnnStats] = useState<ReturnType<typeof getAnnotationStats> | null>(null);

  useEffect(() => { setAnnStats(getAnnotationStats()); }, []);

  const domainData = useMemo(() => {
    const counts: Record<string, number> = {};
    policies.forEach(p => { counts[p.domain] = (counts[p.domain] || 0) + 1; });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [{ label: 'Policies', data: labels.map(l => counts[l]),
        backgroundColor: labels.map(l => DOMAIN_COLORS[l] || '#999'), borderWidth: 0 }],
    };
  }, [policies]);

  const connData = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach(c => { counts[c.connection_type] = (counts[c.connection_type] || 0) + 1; });
    const labels = Object.keys(counts);
    return {
      labels: labels.map(l => l.replace('_', ' ')),
      datasets: [{ data: labels.map(l => counts[l]),
        backgroundColor: labels.map(l => CONN_COLORS[l] || '#999'), borderWidth: 0 }],
    };
  }, [connections]);

  const yearData = useMemo(() => {
    const counts: Record<string, number> = {};
    policies.forEach(p => {
      if (p.adoption_date) { const y = p.adoption_date.slice(0, 4); counts[y] = (counts[y] || 0) + 1; }
    });
    const labels = Object.keys(counts).sort();
    return {
      labels,
      datasets: [{ label: 'Policies adopted', data: labels.map(l => counts[l]),
        backgroundColor: '#007B6C', borderWidth: 0 }],
    };
  }, [policies]);

  const tagData = useMemo(() => {
    if (!annStats || Object.keys(annStats.byTag).length === 0) return null;
    const labels = Object.keys(annStats.byTag);
    return {
      labels: labels.map(l => l.replace(/_/g, ' ')),
      datasets: [{ label: 'Annotations', data: labels.map(l => annStats.byTag[l]),
        backgroundColor: labels.map(l => getTagColor(l)), borderWidth: 0 }],
    };
  }, [annStats]);

  const mostConnected = useMemo(() => {
    const counts: Record<string, number> = {};
    connections.forEach(c => {
      counts[c.source_policy_id] = (counts[c.source_policy_id] || 0) + 1;
      counts[c.target_policy_id] = (counts[c.target_policy_id] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => {
        const p = policies.find(pol => pol.id === id);
        return { label: p?.short_title || id, count, domain: p?.domain || '' };
      });
  }, [policies, connections]);

  const mcData = {
    labels: mostConnected.map(m => m.label),
    datasets: [{ label: 'Connections', data: mostConnected.map(m => m.count),
      backgroundColor: mostConnected.map(m => DOMAIN_COLORS[m.domain] || '#999'), borderWidth: 0 }],
  };

  const barOpts = { responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } };
  const barVertOpts = { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
        <h3 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Policies by Domain</h3>
        <div style={{ height: 220 }}><Bar data={domainData} options={barOpts} /></div>
      </div>
      <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
        <h3 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Connection Types</h3>
        <div style={{ height: 220 }}><Doughnut data={connData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } } }} /></div>
      </div>
      <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
        <h3 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Policies by Year</h3>
        <div style={{ height: 220 }}><Bar data={yearData} options={barVertOpts} /></div>
      </div>
      {tagData ? (
        <div className="bg-white rounded shadow-sm border border-grey-200 p-5">
          <h3 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Annotation Tags</h3>
          <div style={{ height: 220 }}><Bar data={tagData} options={barVertOpts} /></div>
        </div>
      ) : (
        <div className="bg-white rounded shadow-sm border border-grey-200 p-5 flex items-center justify-center">
          <p className="text-sm text-grey-500 italic">No annotations yet. Tag policy texts to see analytics here.</p>
        </div>
      )}
      <div className="bg-white rounded shadow-sm border border-grey-200 p-5 lg:col-span-2">
        <h3 className="font-bold text-tertiary-dark mb-4 text-sm uppercase tracking-wider">Most Connected Policies</h3>
        <div style={{ height: 250 }}><Bar data={mcData} options={barOpts} /></div>
      </div>
    </div>
  );
}
