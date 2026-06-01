/**
 * Threaded, DB-backed comment thread for any Project Workspace target.
 * --------------------------------------------------------------------
 * Drop-in `<WorkspaceComments projectId target={{kind,id}} />` on any
 * module to give non-technical users a place to discuss, @-mention
 * colleagues (which sends them an in-app notification) and resolve
 * review threads. Everything persists to `pw_comments` — nothing is
 * kept only in the browser.
 *
 * @mentions: typing "@" opens a people picker (loaded once from
 * /api/project-workspace/people). Picking someone inserts "@Name" and
 * remembers their id so the server can notify exactly the right people.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { pwApi, type WorkspaceComment } from '@/lib/project-workspace/client';

interface Person {
  id: string;
  name: string;
}

interface Props {
  projectId: string;
  target: { kind: string; id: string };
  /** Heading shown above the thread. */
  title?: string;
  /** Tighter spacing for use inside a row/cell drawer. */
  compact?: boolean;
}

export default function WorkspaceComments({ projectId, target, title = 'Discussion', compact }: Props) {
  const { user, displayName, requireAuth } = useAuth();
  const [comments, setComments] = useState<WorkspaceComment[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await pwApi.listComments(projectId, target);
    setComments(list);
    setLoading(false);
  }, [projectId, target.kind, target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    pwApi.listPeople().then(setPeople);
  }, []);

  const roots = useMemo(() => comments.filter(c => !c.parentId), [comments]);
  const repliesOf = useCallback(
    (id: string) => comments.filter(c => c.parentId === id),
    [comments]
  );

  async function submit(bodyText: string, mentions: string[], parentId: string | null) {
    const authed = await requireAuth('Sign in to post a comment.');
    if (!authed) return false;
    const { comment } = await pwApi.createComment({
      projectId,
      targetKind: target.kind,
      targetId: target.id,
      body: bodyText,
      parentId,
      mentions,
    });
    // Optimistic name fill for the brand-new row (server already stored it).
    setComments(prev => [...prev, { ...comment, authorName: comment.authorName || displayName || 'You' }]);
    setReplyTo(null);
    return true;
  }

  async function toggleResolved(c: WorkspaceComment) {
    const { comment } = await pwApi.patchComment(c.id, { resolved: !c.resolved });
    setComments(prev => prev.map(x => (x.id === c.id ? comment : x)));
  }

  async function remove(c: WorkspaceComment) {
    if (!confirm('Delete this comment?')) return;
    await pwApi.deleteComment(c.id);
    setComments(prev => prev.filter(x => x.id !== c.id && x.parentId !== c.id));
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <h4 className="text-xs font-bold text-tertiary-dark uppercase tracking-wide">
        {title} {comments.length > 0 && <span className="text-tertiary-light">({comments.length})</span>}
      </h4>

      {loading ? (
        <p className="text-[11px] text-tertiary-light">Loading…</p>
      ) : roots.length === 0 ? (
        <p className="text-[11px] text-tertiary-light italic">
          No comments yet. Start the discussion or @-mention a colleague to bring them in.
        </p>
      ) : (
        <ul className="space-y-2">
          {roots.map(c => (
            <li key={c.id}>
              <CommentCard
                comment={c}
                currentUserId={user?.id}
                onReply={() => setReplyTo(c.id)}
                onResolve={() => toggleResolved(c)}
                onDelete={() => remove(c)}
              />
              {repliesOf(c.id).length > 0 && (
                <ul className="mt-1.5 ml-4 space-y-1.5 border-l-2 border-grey-100 pl-3">
                  {repliesOf(c.id).map(r => (
                    <li key={r.id}>
                      <CommentCard
                        comment={r}
                        currentUserId={user?.id}
                        onDelete={() => remove(r)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {replyTo === c.id && (
                <div className="mt-2 ml-4">
                  <CommentComposer
                    people={people}
                    placeholder="Write a reply… use @ to tag a colleague"
                    onCancel={() => setReplyTo(null)}
                    onSubmit={(text, mentions) => submit(text, mentions, c.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {replyTo === null && (
        <CommentComposer
          people={people}
          placeholder="Add a comment… use @ to tag a colleague"
          onSubmit={(text, mentions) => submit(text, mentions, null)}
        />
      )}
    </div>
  );
}

function CommentCard({
  comment,
  currentUserId,
  onReply,
  onResolve,
  onDelete,
}: {
  comment: WorkspaceComment;
  currentUserId?: string;
  onReply?: () => void;
  onResolve?: () => void;
  onDelete?: () => void;
}) {
  const isOwner = currentUserId && currentUserId === comment.createdBy;
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        comment.resolved ? 'border-green-200 bg-green-50/50' : 'border-grey-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center text-[10px] font-bold text-secondary shrink-0">
          {(comment.authorName || '?')[0].toUpperCase()}
        </span>
        <span className="text-[11px] font-semibold text-tertiary-dark">
          {comment.authorName || 'Anonymous'}
        </span>
        <span className="text-[10px] text-tertiary-light">{timeAgo(comment.createdAt)}</span>
        {comment.resolved && (
          <span className="text-[9px] uppercase font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
            resolved
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {onReply && (
            <button onClick={onReply} className="text-[10px] text-tertiary hover:text-secondary">
              Reply
            </button>
          )}
          {onResolve && (
            <button onClick={onResolve} className="text-[10px] text-tertiary hover:text-green-700">
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
          )}
          {isOwner && onDelete && (
            <button onClick={onDelete} className="text-[10px] text-tertiary hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] text-tertiary-dark leading-relaxed whitespace-pre-wrap break-words">
        {renderWithMentions(comment.body)}
      </p>
    </div>
  );
}

/** Bold any @mention tokens so tagged colleagues stand out. */
function renderWithMentions(text: string) {
  const parts = text.split(/(@[\w.\-']+(?:\s[\w.\-']+)?)/g);
  return parts.map((p, i) =>
    p.startsWith('@') ? (
      <span key={i} className="font-semibold text-primary">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function CommentComposer({
  people,
  placeholder,
  onSubmit,
  onCancel,
}: {
  people: Person[];
  placeholder: string;
  onSubmit: (text: string, mentions: string[]) => Promise<boolean | void>;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<{ query: string; start: number } | null>(null);
  const [mentioned, setMentioned] = useState<Person[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setText(v);
    const caret = e.target.selectionStart ?? v.length;
    const before = v.slice(0, caret);
    const m = before.match(/@([\w.\-']*)$/);
    if (m) setPicker({ query: m[1].toLowerCase(), start: caret - m[1].length - 1 });
    else setPicker(null);
  }

  const matches = picker
    ? people.filter(p => p.name.toLowerCase().includes(picker.query)).slice(0, 6)
    : [];

  function pick(p: Person) {
    if (!picker) return;
    const caret = taRef.current?.selectionStart ?? text.length;
    const next = text.slice(0, picker.start) + `@${p.name} ` + text.slice(caret);
    setText(next);
    setMentioned(prev => (prev.some(x => x.id === p.id) ? prev : [...prev, p]));
    setPicker(null);
    setTimeout(() => taRef.current?.focus(), 0);
  }

  async function handleSubmit() {
    const body = text.trim();
    if (!body) return;
    // Only notify people still referenced by an @Name token in the final text.
    const mentions = mentioned.filter(p => body.includes(`@${p.name}`)).map(p => p.id);
    setBusy(true);
    try {
      const ok = await onSubmit(body, mentions);
      if (ok !== false) {
        setText('');
        setMentioned([]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative border border-grey-200 rounded-lg bg-white overflow-visible">
      <textarea
        ref={taRef}
        value={text}
        onChange={onChange}
        placeholder={placeholder}
        rows={2}
        className="w-full px-3 py-2 text-[12px] bg-transparent resize-y focus:outline-none focus:ring-2 focus:ring-secondary/30 rounded-t-lg"
      />
      {picker && matches.length > 0 && (
        <ul className="absolute left-2 bottom-12 z-50 w-56 max-h-48 overflow-y-auto rounded-lg border border-grey-200 bg-white shadow-xl py-1">
          {matches.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  pick(p);
                }}
                className="w-full text-left px-3 py-1.5 text-[12px] text-tertiary-dark hover:bg-primary/10 hover:text-primary"
              >
                @{p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between px-2 py-1.5 bg-grey-50 border-t border-grey-100 rounded-b-lg">
        <span className="text-[10px] text-tertiary-light">Type @ to tag a colleague</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="text-[11px] text-tertiary hover:underline">
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            className="px-3 py-1 rounded-md bg-secondary text-white text-[11px] font-semibold hover:bg-secondary-dark disabled:opacity-40"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
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
