/**
 * Surfaces which backend the voting store is using.
 *
 * Filesystem mode is fine for local development but loses every ballot the
 * next time the deploy is rebuilt or the runtime cold-starts (e.g. on
 * Vercel). The banner makes that loud so users don't quietly run a real
 * meeting against ephemeral storage.
 */
import type { VotingBackend } from '@/lib/voting/backend';

export default function StorageBackendBanner({ backend }: { backend: VotingBackend }) {
  if (backend === 'supabase') {
    return (
      <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#00928F]/40 bg-[#E6F5F4] text-[12px] text-[#00928F]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00928F]" aria-hidden />
        <span className="font-mono uppercase tracking-[0.08em] text-[10.5px]">Storage</span>
        <span className="font-semibold">Supabase</span>
        <span className="text-[#00928F]/80">— ballots are persisted in Postgres.</span>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-sm border border-[#E87722]/40 bg-[#FBF1ED] p-3 text-[12.5px] text-[#3D5265]">
      <p className="font-semibold text-[#E87722]">
        Filesystem storage is active — ballots may not persist across deploys or restarts.
      </p>
      <p className="mt-1 text-[12px] text-[#3D5265]/80">
        Set <code className="font-mono bg-white border border-[#E6E7E8] px-1 rounded-sm">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
        and <code className="font-mono bg-white border border-[#E6E7E8] px-1 rounded-sm">SUPABASE_SERVICE_ROLE_KEY</code>,
        then apply <code className="font-mono bg-white border border-[#E6E7E8] px-1 rounded-sm">supabase/migrations/029_voting_tool.sql</code>{' '}
        and <code className="font-mono bg-white border border-[#E6E7E8] px-1 rounded-sm">030_voting_shared_tokens.sql</code>{' '}
        to switch to Postgres.
      </p>
    </div>
  );
}
