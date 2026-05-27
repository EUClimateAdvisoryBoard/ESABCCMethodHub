/**
 * User profile page with account settings and activity log.
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchActivityLog, ActivityEntry } from '@/lib/comments';
import { supabase } from '@/lib/supabase';

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, subtitle, badge, children }: {
  title: string; subtitle?: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E6E7E8] shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-[#E6E7E8]">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#3D5265]">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-[#3D5265]/60 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Activity item ───────────────────────────────────────────────────────────

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const actionLabels: Record<string, { label: string; color: string }> = {
    comment_created: { label: 'Comment', color: 'bg-blue-100 text-blue-700' },
    annotation_created: { label: 'Annotation', color: 'bg-purple-100 text-purple-700' },
    tag_added: { label: 'Tag', color: 'bg-teal-100 text-teal-700' },
    news_posted: { label: 'Post', color: 'bg-orange-100 text-orange-700' },
    reading_list_added: { label: 'Reading List', color: 'bg-indigo-100 text-indigo-700' },
  };
  const info = actionLabels[entry.action] || { label: entry.action, color: 'bg-grey-100 text-grey-700' };
  const timeAgo = getTimeAgo(entry.created_at);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#E6E7E8] last:border-0">
      <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${info.color}`}>
        {info.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#3D5265]">{entry.summary}</p>
        {entry.policy_id && (
          <p className="text-xs text-[#3D5265]/50 mt-0.5">Policy: {entry.policy_id}</p>
        )}
      </div>
      <span className="shrink-0 text-xs text-[#3D5265]/40">{timeAgo}</span>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Contribution Badge ──────────────────────────────────────────────────────

function ContributionBadge({ count }: { count: number }) {
  let level = 'Newcomer';
  let color = 'bg-gray-100 text-gray-600 border-gray-200';
  let icon = '🌱';

  if (count >= 100) { level = 'Champion'; color = 'bg-yellow-50 text-yellow-700 border-yellow-300'; icon = '🏆'; }
  else if (count >= 50) { level = 'Expert'; color = 'bg-purple-50 text-purple-700 border-purple-300'; icon = '⭐'; }
  else if (count >= 20) { level = 'Contributor'; color = 'bg-blue-50 text-blue-700 border-blue-300'; icon = '🔬'; }
  else if (count >= 5) { level = 'Active Member'; color = 'bg-green-50 text-green-700 border-green-300'; icon = '🌿'; }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {icon} {level}
    </span>
  );
}

// ─── Admin User Row ──────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastSignIn: string | null;
  contributions: number;
  pendingDeletion: { requestedAt: string; scheduledFor: string; reason: string } | null;
}

function AdminUserRow({ u, currentUserId, onToggleRole, onDelete, onCancelDeletion }: {
  u: AdminUser;
  currentUserId: string;
  onToggleRole: (userId: string, newRole: string) => void;
  onDelete: (userId: string, email: string) => void;
  onCancelDeletion: (userId: string, email: string) => void;
}) {
  const isMe = u.id === currentUserId;
  const isPending = !!u.pendingDeletion;
  const scheduledLabel = u.pendingDeletion
    ? new Date(u.pendingDeletion.scheduledFor).toLocaleDateString()
    : null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-[#E6E7E8] last:border-0 ${isPending ? 'opacity-75' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-[#004B7F]/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-[#004B7F]">{(u.displayName || u.email || '?')[0].toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-[#3D5265] truncate">{u.displayName}</p>
            {u.role === 'admin' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#004B7F]/10 text-[#004B7F]">Admin</span>
            )}
            {isMe && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">You</span>
            )}
            {isPending && (
              <span
                title={`Scheduled for permanent deletion on ${scheduledLabel}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700"
              >
                Deletion scheduled
              </span>
            )}
          </div>
          <p className="text-xs text-[#3D5265]/50 truncate">{u.email}</p>
          {isPending && (
            <p className="text-[11px] text-red-600/80 mt-0.5">Erasure on {scheduledLabel} (30-day grace period)</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#3D5265]/60 shrink-0">
        <span title="Contributions" className="flex items-center gap-1 bg-[#E6E7E8]/50 rounded px-2 py-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          {u.contributions}
        </span>
        {u.lastSignIn && (
          <span className="hidden sm:inline">Last: {new Date(u.lastSignIn).toLocaleDateString()}</span>
        )}
      </div>
      {!isMe && (
        <div className="flex items-center gap-2 shrink-0">
          {isPending ? (
            <button
              onClick={() => onCancelDeletion(u.id, u.email || '')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#004B7F]/20 text-[#004B7F] hover:bg-[#004B7F]/5 transition"
            >
              Cancel deletion
            </button>
          ) : (
            <>
              <button
                onClick={() => onToggleRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  u.role === 'admin'
                    ? 'border border-orange-200 text-orange-600 hover:bg-orange-50'
                    : 'border border-[#004B7F]/20 text-[#004B7F] hover:bg-[#004B7F]/5'
                }`}
              >
                {u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
              </button>
              <button
                onClick={() => onDelete(u.id, u.email || '')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Profile Page ───────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const {
    user, loading, displayName, role, session,
    requireAuth, signOut, updateDisplayName, changePassword,
    refreshProfile,
  } = useAuth();

  // Redirect to home if not logged in (after loading completes)
  useEffect(() => {
    if (!loading && !user) {
      requireAuth('Sign in to view your profile.').then((u) => {
        if (!u) router.push('/');
      });
    }
  }, [loading, user, requireAuth, router]);

  // Profile form state
  const [nameValue, setNameValue] = useState('');
  const [nameStatus, setNameStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [nameSaving, setNameSaving] = useState(false);

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  // Activity log
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Contribution counts
  const [contributionCount, setContributionCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [annotationCount, setAnnotationCount] = useState(0);

  // Admin panel state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminMessage, setAdminMessage] = useState('');

  // Initialize name field
  useEffect(() => {
    if (displayName) setNameValue(displayName);
  }, [displayName]);

  // Load activity
  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    const entries = await fetchActivityLog({ limit: 20 });
    setActivity(entries);
    setActivityLoading(false);
  }, []);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  // Load contribution counts
  useEffect(() => {
    if (!user || !supabase) return;

    const s = supabase;
    if (!s) return;

    const loadCounts = async () => {
      // Activity log total
      const { count: actCount } = await s
        .from('activity_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setContributionCount(actCount || 0);

      // Comments count
      const { count: cmtCount } = await s
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setCommentCount(cmtCount || 0);

      // Annotations count
      const { count: annCount } = await s
        .from('annotations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setAnnotationCount(annCount || 0);
    };

    loadCounts();
  }, [user]);

  // Load admin users
  const loadAdminUsers = useCallback(async () => {
    if (role !== 'admin' || !session) return;
    setAdminLoading(true);
    setAdminError('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Failed to load users.');
      } else {
        setAdminUsers(data.users || []);
      }
    } catch {
      setAdminError('Network error loading users.');
    }
    setAdminLoading(false);
  }, [role, session]);

  useEffect(() => { loadAdminUsers(); }, [loadAdminUsers]);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaving(true);
    setNameStatus(null);
    const result = await updateDisplayName(nameValue);
    if (result.error) {
      setNameStatus({ type: 'error', msg: result.error });
    } else {
      setNameStatus({ type: 'success', msg: 'Name updated successfully.' });
    }
    setNameSaving(false);
    setTimeout(() => setNameStatus(null), 4000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    setPwSaving(true);
    setPwStatus(null);
    const result = await changePassword(newPassword);
    if (result.error) {
      setPwStatus({ type: 'error', msg: result.error });
    } else {
      setPwStatus({ type: 'success', msg: 'Password changed successfully.' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPwSaving(false);
    setTimeout(() => setPwStatus(null), 4000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleToggleRole = async (userId: string, newRole: string) => {
    if (!session) return;
    setAdminMessage('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Failed to update role.');
      } else {
        setAdminMessage(`Role updated to ${newRole}.`);
        loadAdminUsers();
      }
    } catch {
      setAdminError('Network error.');
    }
    setTimeout(() => { setAdminMessage(''); setAdminError(''); }, 4000);
  };

  // GDPR Art. 6(1)(a) — LLM-processing consent (opt-in for AI summaries).
  const [llmConsentAt, setLlmConsentAt] = useState<string | null>(null);
  const [llmConsentBusy, setLlmConsentBusy] = useState(false);

  const refreshLlmConsent = useCallback(async () => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('llm_consent_at')
      .eq('id', user.id)
      .maybeSingle();
    setLlmConsentAt(data?.llm_consent_at ?? null);
  }, [user]);

  useEffect(() => { refreshLlmConsent(); }, [refreshLlmConsent]);

  const toggleLlmConsent = async () => {
    if (!user || !supabase) return;
    setLlmConsentBusy(true);
    const next = llmConsentAt ? null : new Date().toISOString();
    const { error } = await supabase
      .from('profiles')
      .update({ llm_consent_at: next })
      .eq('id', user.id);
    if (!error) setLlmConsentAt(next);
    setLlmConsentBusy(false);
  };

  // GDPR Art. 17 — pending self-deletion request, if any.
  type DeletionRequest = { requested_at: string; scheduled_for: string; cancelled_at: string | null; reason: string };
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionError, setDeletionError] = useState('');

  const refreshDeletionRequest = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/user/delete-request', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDeletionRequest(data?.request ?? null);
    } catch { /* ignore */ }
  }, [session]);

  useEffect(() => { refreshDeletionRequest(); }, [refreshDeletionRequest]);

  const handleRequestDeletion = async () => {
    if (!session) return;
    if (!confirm(
      'This will schedule your account for permanent deletion in 30 days.\n\n' +
      'You can cancel anytime in the next 30 days. After that, all your annotations, ' +
      'comments, activity log and reading-list entries will be erased.\n\nProceed?'
    )) return;
    setDeletionBusy(true);
    setDeletionError('');
    try {
      const res = await fetch('/api/user/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed.' }));
        setDeletionError(data.error || 'Request failed.');
      } else {
        await refreshDeletionRequest();
      }
    } catch {
      setDeletionError('Network error.');
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!session) return;
    setDeletionBusy(true);
    setDeletionError('');
    try {
      const res = await fetch('/api/user/delete-request', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Cancel failed.' }));
        setDeletionError(data.error || 'Cancel failed.');
      } else {
        await refreshDeletionRequest();
      }
    } catch {
      setDeletionError('Network error.');
    } finally {
      setDeletionBusy(false);
    }
  };

  // GDPR Art. 20 — download a machine-readable copy of all personal data.
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState('');
  const handleExportMyData = async () => {
    if (!session) return;
    setExportBusy(true);
    setExportError('');
    try {
      const res = await fetch('/api/user/export', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Export failed.' }));
        setExportError(data.error || 'Export failed.');
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const match = /filename="?([^";]+)"?/.exec(contentDisposition);
      const filename = match?.[1] || `esabcc-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Network error.');
    } finally {
      setExportBusy(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!session) return;
    if (!confirm(
      `Schedule "${email}" for deletion?\n\n` +
      'GDPR Art. 17 requires a 30-day grace period before erasure. The account ' +
      'will be marked for deletion now and permanently erased by the retention ' +
      'job after 30 days. You can cancel during the grace period.\n\nProceed?'
    )) return;
    setAdminMessage('');
    setAdminError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Failed to delete user.');
      } else {
        const when = data?.scheduled_for
          ? new Date(data.scheduled_for).toLocaleDateString()
          : 'in 30 days';
        setAdminMessage(`User "${email}" scheduled for deletion on ${when}. You can cancel during the grace period.`);
        loadAdminUsers();
      }
    } catch {
      setAdminError('Network error.');
    }
    setTimeout(() => { setAdminMessage(''); setAdminError(''); }, 6000);
  };

  const handleAdminCancelDeletion = async (userId: string, email: string) => {
    if (!session) return;
    if (!confirm(`Cancel the scheduled deletion for "${email}"?`)) return;
    setAdminMessage('');
    setAdminError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, cancelDeletion: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminError(data.error || 'Failed to cancel deletion.');
      } else {
        setAdminMessage(`Scheduled deletion for "${email}" cancelled.`);
        loadAdminUsers();
      }
    } catch {
      setAdminError('Network error.');
    }
    setTimeout(() => { setAdminMessage(''); setAdminError(''); }, 4000);
  };

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="animate-pulse text-tertiary">Loading profile...</div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-tertiary">Please sign in to view your profile.</p>
        </main>
      </>
    );
  }

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-6">

        {/* Profile Header */}
        <div className="bg-gradient-to-r from-[#004B7F] to-[#007B6C] rounded-xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold">
                {(displayName || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold truncate">{displayName || 'User'}</h1>
                {role === 'admin' && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-white/20 text-white border border-white/30">Admin</span>
                )}
              </div>
              <p className="text-white/70 text-sm mt-0.5 truncate">{user.email}</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs text-white/50">Member since {memberSince}</span>
                <ContributionBadge count={contributionCount} />
              </div>
              <nav className="flex flex-wrap gap-3 mt-4 text-xs">
                <a href="/profile/workbench" className="text-white/80 hover:text-white underline">My Workbench</a>
                <a href="/profile/inbox" className="text-white/80 hover:text-white underline">Inbox</a>
                <a href="/profile/preferences" className="text-white/80 hover:text-white underline">Preferences</a>
                <a href="/profile/workspaces" className="text-white/80 hover:text-white underline">Workspaces</a>
                <a href="/profile/collections" className="text-white/80 hover:text-white underline">Collections</a>
              </nav>
            </div>
          </div>
        </div>

        {/* Contribution Stats (Gamification) */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-[#E6E7E8] shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-[#004B7F]">{contributionCount}</div>
            <div className="text-xs text-[#3D5265]/60 mt-1 font-medium">Total Contributions</div>
            <div className="mt-2">
              <div className="h-1.5 bg-[#E6E7E8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#004B7F] to-[#007B6C] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (contributionCount / 100) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-[#3D5265]/40 mt-1">
                {contributionCount >= 100 ? 'Champion level!' : `${100 - contributionCount} to Champion`}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E6E7E8] shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-blue-600">{commentCount}</div>
            <div className="text-xs text-[#3D5265]/60 mt-1 font-medium">Comments</div>
            <div className="mt-2 flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span className="text-[10px] text-[#3D5265]/40">Policy discussions</span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-[#E6E7E8] shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-purple-600">{annotationCount}</div>
            <div className="text-xs text-[#3D5265]/60 mt-1 font-medium">Annotations</div>
            <div className="mt-2 flex items-center justify-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              <span className="text-[10px] text-[#3D5265]/40">Policy highlights</span>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <Section title="Profile Information" subtitle="Update your display name visible to other users.">
          <form onSubmit={handleNameSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3D5265] mb-1.5">Display Name</label>
              <input
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                placeholder="Your display name"
                className="w-full border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-lg px-4 py-2.5 min-h-[44px] text-sm focus:ring-2 focus:ring-[#007B6C]/30 focus:border-[#007B6C] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D5265] mb-1.5">Email Address</label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="w-full border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-lg px-4 py-2.5 min-h-[44px] text-sm bg-[#F8F9FA] dark:bg-[var(--mh-bg)] text-[#3D5265]/60 dark:text-[var(--mh-muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[#3D5265]/50 mt-1">Email address cannot be changed.</p>
            </div>

            {nameStatus && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                nameStatus.type === 'error' ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'
              }`}>
                {nameStatus.msg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={nameSaving || nameValue === displayName}
                className="w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 bg-[#007B6C] text-white text-sm font-semibold rounded-lg hover:bg-[#006B5E] active:bg-[#005A4F] disabled:opacity-40 transition"
              >
                {nameSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Section>

        {/* Change Password */}
        <Section title="Change Password" subtitle="Update your account password. Minimum 6 characters.">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#3D5265] mb-1.5">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                className="w-full border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-lg px-4 py-2.5 min-h-[44px] text-sm focus:ring-2 focus:ring-[#007B6C]/30 focus:border-[#007B6C] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#3D5265] mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                minLength={6}
                required
                className="w-full border border-[#E6E7E8] dark:border-[var(--mh-border)] rounded-lg px-4 py-2.5 min-h-[44px] text-sm focus:ring-2 focus:ring-[#007B6C]/30 focus:border-[#007B6C] focus:outline-none transition"
              />
            </div>

            {/* Password strength hint */}
            {newPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#E6E7E8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      newPassword.length >= 12 ? 'bg-green-500 w-full'
                        : newPassword.length >= 8 ? 'bg-yellow-500 w-2/3'
                        : newPassword.length >= 6 ? 'bg-orange-500 w-1/3'
                        : 'bg-red-500 w-1/6'
                    }`}
                  />
                </div>
                <span className="text-xs text-[#3D5265]/60">
                  {newPassword.length >= 12 ? 'Strong' : newPassword.length >= 8 ? 'Good' : newPassword.length >= 6 ? 'Fair' : 'Weak'}
                </span>
              </div>
            )}

            {pwStatus && (
              <p className={`text-xs px-3 py-2 rounded-lg ${
                pwStatus.type === 'error' ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'
              }`}>
                {pwStatus.msg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwSaving || !newPassword || !confirmPassword}
                className="px-6 py-2.5 bg-[#004B7F] text-white text-sm font-semibold rounded-lg hover:bg-[#003D68] disabled:opacity-40 transition"
              >
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </Section>

        {/* Recent Activity */}
        <Section title="Recent Activity" subtitle="Your latest actions across the platform.">
          {activityLoading ? (
            <div className="py-6 text-center text-sm text-[#3D5265]/50 animate-pulse">Loading activity...</div>
          ) : activity.length === 0 ? (
            <div className="py-8 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3D5265" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 opacity-20">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-sm text-[#3D5265]/50">No activity yet. Start by commenting on or annotating policies.</p>
            </div>
          ) : (
            <div>
              {activity.map(entry => (
                <ActivityItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </Section>

        {/* Admin Panel — only visible to admins */}
        {role === 'admin' && (
          <Section
            title="User Management"
            subtitle="Manage all registered users. Grant or revoke admin privileges."
            badge={<span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#004B7F]/10 text-[#004B7F]">Admin Only</span>}
          >
            {adminLoading ? (
              <div className="py-6 text-center text-sm text-[#3D5265]/50 animate-pulse">Loading users...</div>
            ) : adminError && adminUsers.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600">{adminError}</p>
                <button onClick={loadAdminUsers} className="mt-2 text-xs text-[#004B7F] hover:underline">Retry</button>
              </div>
            ) : (
              <div>
                {/* Summary */}
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#E6E7E8]">
                  <div className="flex items-center gap-2 text-sm text-[#3D5265]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    <span className="font-medium">{adminUsers.length} registered users</span>
                  </div>
                  <div className="text-xs text-[#3D5265]/50">
                    {adminUsers.filter(u => u.role === 'admin').length} admins
                  </div>
                  <button onClick={loadAdminUsers} className="ml-auto text-xs text-[#004B7F] hover:underline flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    Refresh
                  </button>
                </div>

                {adminError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{adminError}</p>}
                {adminMessage && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{adminMessage}</p>}

                {/* User list */}
                <div>
                  {adminUsers
                    .sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1) || a.displayName.localeCompare(b.displayName))
                    .map(u => (
                      <AdminUserRow
                        key={u.id}
                        u={u}
                        currentUserId={user.id}
                        onToggleRole={handleToggleRole}
                        onDelete={handleDeleteUser}
                        onCancelDeletion={handleAdminCancelDeletion}
                      />
                    ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Your data (GDPR rights) */}
        <Section title="Your data" subtitle="Exercise your GDPR rights. See the privacy notice for full details.">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <p className="text-sm font-medium text-[#3D5265]">Download my data (Art. 20)</p>
                <p className="text-xs text-[#3D5265]/50">
                  Get a JSON copy of every annotation, comment, reading-list entry and activity-log row stored about you.
                </p>
              </div>
              <button
                onClick={handleExportMyData}
                disabled={exportBusy}
                className="shrink-0 px-5 py-2.5 border border-[#3D5265]/20 text-[#3D5265] text-sm font-semibold rounded-lg hover:bg-[#3D5265]/5 transition disabled:opacity-50"
              >
                {exportBusy ? 'Preparing…' : 'Download'}
              </button>
            </div>
            {exportError && <p className="text-xs text-red-600">{exportError}</p>}

            <div className="border-t border-[#E6E7E8] pt-4">
              <div className="flex items-center justify-between">
                <div className="pr-4">
                  <p className="text-sm font-medium text-[#3D5265]">AI summarisation consent (Art. 6(1)(a))</p>
                  <p className="text-xs text-[#3D5265]/50">
                    Opt in to allow newsletter and policy text to be sent to third-party LLM providers
                    (Anthropic, OpenAI, Google, Azure OpenAI) for summarisation. You can withdraw at any time.
                  </p>
                  {llmConsentAt && (
                    <p className="text-[11px] text-[#3D5265]/40 mt-1">
                      Consent recorded: {new Date(llmConsentAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={toggleLlmConsent}
                  disabled={llmConsentBusy}
                  className={`shrink-0 px-5 py-2.5 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                    llmConsentAt
                      ? 'border border-amber-300 text-amber-700 hover:bg-amber-50'
                      : 'border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {llmConsentAt ? 'Withdraw' : 'Opt in'}
                </button>
              </div>
            </div>

            <div className="border-t border-[#E6E7E8] pt-4">
              {deletionRequest && !deletionRequest.cancelled_at ? (
                <div className="flex items-start justify-between gap-4 rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Account deletion scheduled.</p>
                    <p className="mt-0.5">
                      Your account will be permanently erased on{' '}
                      <strong>{new Date(deletionRequest.scheduled_for).toLocaleString()}</strong>.
                      Cancel before then to keep your account.
                    </p>
                  </div>
                  <button
                    onClick={handleCancelDeletion}
                    disabled={deletionBusy}
                    className="shrink-0 px-4 py-2 border border-amber-400 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                  >
                    Cancel deletion
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <p className="text-sm font-medium text-[#3D5265]">Delete my account (Art. 17)</p>
                    <p className="text-xs text-[#3D5265]/50">
                      Schedule permanent deletion of your account and all associated data after a 30-day grace period.
                    </p>
                  </div>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={deletionBusy}
                    className="shrink-0 px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                  >
                    {deletionBusy ? 'Working…' : 'Delete account'}
                  </button>
                </div>
              )}
              {deletionError && <p className="text-xs text-red-600 mt-2">{deletionError}</p>}
            </div>
          </div>
        </Section>

        {/* Account Actions */}
        <Section title="Account" subtitle="Manage your account settings.">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#3D5265]">Sign Out</p>
              <p className="text-xs text-[#3D5265]/50">Sign out of your ESABCC MethodHub account.</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-5 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition"
            >
              Sign Out
            </button>
          </div>
        </Section>

      </main>
    </>
  );
}
