/**
 * Threaded comment section for policy discussions with reply and delete support.
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Comment, fetchComments, createComment, deleteComment } from '@/lib/comments';
import { useAuth } from '@/lib/auth-context';

interface Props {
  policyId: string;
  refreshKey?: number;
}

export default function CommentSection({ policyId, refreshKey }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, requireAuth } = useAuth();

  const load = useCallback(() => {
    fetchComments(policyId).then(setComments);
  }, [policyId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const handleSubmit = async (parentId?: string) => {
    const text = newText.trim();
    if (!text) return;

    const authedUser = await requireAuth('Sign in to post a comment.');
    if (!authedUser) return;

    setSubmitting(true);
    try {
      const result = await createComment(policyId, authedUser.id, text, { parentId });
      if (result) {
        setNewText('');
        setReplyTo(null);
        // Reload comments from storage
        load();
      } else {
        setError('Failed to post comment. Please try again.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (err) {
      console.error('Comment submit error:', err);
      setError('Failed to post comment. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    await deleteComment(id);
    load();
  };

  const generalComments = comments.filter(c => c.char_start === null);
  const textComments = comments.filter(c => c.char_start !== null);

  return (
    <div className="space-y-6">
      {/* General comments */}
      <div>
        <h3 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-4">
          Discussion ({generalComments.length})
        </h3>

        {generalComments.length === 0 && (
          <p className="text-sm text-grey-500 italic mb-4">No comments yet. Start the discussion.</p>
        )}

        <div className="space-y-3 mb-4">
          {generalComments.map(c => (
            <CommentCard
              key={c.id}
              comment={c}
              currentUserId={user?.id}
              onDelete={handleDelete}
              onReply={id => { setReplyTo(id); }}
              depth={0}
            />
          ))}
        </div>

        {/* New comment form */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 text-accent-red text-sm rounded border border-red-200">
            {error}
          </div>
        )}
        <div className="border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] rounded-lg overflow-hidden">
          <label className="sr-only" htmlFor="cmt-input">{replyTo ? 'Write a reply' : 'Add a comment'}</label>
          <textarea
            id="cmt-input"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
            className="w-full px-4 py-3 text-sm bg-transparent min-h-[88px] resize-y focus:outline-none focus:ring-2 focus:ring-secondary/30"
            style={{ maxHeight: '40dvh' }}
          />
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2 gap-2 bg-grey-50 dark:bg-[var(--mh-bg)] border-t border-grey-100 dark:border-[var(--mh-border)]">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-grey-400 dark:text-[var(--mh-muted)]">Markdown supported</span>
              {replyTo && (
                <button onClick={() => setReplyTo(null)} className="text-[12px] text-secondary hover:underline min-h-[36px]">
                  Cancel reply
                </button>
              )}
            </div>
            <button
              onClick={() => handleSubmit(replyTo || undefined)}
              disabled={submitting || !newText.trim()}
              className="w-full sm:w-auto px-4 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-secondary text-white text-[13px] sm:text-xs font-medium rounded hover:bg-secondary-dark active:bg-primary disabled:opacity-40 transition"
            >
              {submitting ? 'Posting…' : replyTo ? 'Post reply' : 'Post comment'}
            </button>
          </div>
        </div>
      </div>

      {/* Text-level comments */}
      {textComments.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-tertiary-dark uppercase tracking-wider mb-3">
            Text Annotations ({textComments.length})
          </h3>
          <div className="space-y-2">
            {textComments.map(c => (
              <CommentCard
                key={c.id}
                comment={c}
                currentUserId={user?.id}
                onDelete={handleDelete}
                onReply={id => setReplyTo(id)}
                depth={0}
                showExcerpt
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment, currentUserId, onDelete, onReply, depth, showExcerpt,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onReply: (id: string) => void;
  depth: number;
  showExcerpt?: boolean;
}) {
  const isOwner = currentUserId === comment.user_id;
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div className={`${depth > 0 ? 'ml-3 sm:ml-6 border-l-2 border-grey-100 dark:border-[var(--mh-border)] pl-3 sm:pl-4' : ''}`}>
      <div className="bg-white dark:bg-[var(--mh-card)] rounded border border-grey-200 dark:border-[var(--mh-border)] p-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <span className="text-[13px] sm:text-xs font-bold text-secondary">
              {(comment.user_display_name || '?')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] sm:text-xs font-medium text-tertiary-dark dark:text-[var(--mh-fg)] truncate">
            {comment.user_display_name || 'Anonymous'}
          </span>
          <span className="text-[11px] text-grey-400 dark:text-[var(--mh-muted)]">{timeAgo}</span>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => onReply(comment.id)}
              className="text-[12px] text-tertiary dark:text-[var(--mh-muted)] hover:text-secondary px-2 py-1 min-h-[36px] rounded active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
            >
              Reply
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                aria-label="Delete comment"
                className="text-[12px] text-grey-400 dark:text-[var(--mh-muted)] hover:text-accent-red px-2 py-1 min-h-[36px] rounded active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {showExcerpt && comment.char_start !== null && (
          <div className="text-[11px] sm:text-xs text-tertiary dark:text-[var(--mh-muted)] italic bg-grey-50 dark:bg-[var(--mh-bg)] rounded px-2 py-1 mb-2 border-l-2 border-secondary/30">
            Refers to text at position {comment.char_start}-{comment.char_end}
          </div>
        )}

        <p className="text-[14px] sm:text-sm text-tertiary-dark dark:text-[var(--mh-fg)] leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
      </div>

      {/* Threaded replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
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
