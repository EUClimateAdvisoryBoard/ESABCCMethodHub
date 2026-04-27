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
        <div className="border border-grey-200 rounded-lg overflow-hidden">
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
            className="w-full px-4 py-3 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
          <div className="flex items-center justify-between px-4 py-2 bg-grey-50 border-t border-grey-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-grey-400">Markdown supported</span>
              {replyTo && (
                <button onClick={() => setReplyTo(null)} className="text-xs text-secondary hover:underline">
                  Cancel reply
                </button>
              )}
            </div>
            <button
              onClick={() => handleSubmit(replyTo || undefined)}
              disabled={submitting || !newText.trim()}
              className="px-4 py-1.5 bg-secondary text-white text-xs font-medium rounded hover:bg-secondary-dark disabled:opacity-40 transition"
            >
              {submitting ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Comment'}
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
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-grey-100 pl-4' : ''}`}>
      <div className="bg-white rounded border border-grey-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-secondary">
              {(comment.user_display_name || '?')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-medium text-tertiary-dark">
            {comment.user_display_name || 'Anonymous'}
          </span>
          <span className="text-xs text-grey-400">{timeAgo}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => onReply(comment.id)}
              className="text-xs text-tertiary hover:text-secondary">Reply</button>
            {isOwner && (
              <button onClick={() => onDelete(comment.id)}
                className="text-xs text-grey-400 hover:text-accent-red">Delete</button>
            )}
          </div>
        </div>

        {showExcerpt && comment.char_start !== null && (
          <div className="text-xs text-tertiary italic bg-grey-50 rounded px-2 py-1 mb-2 border-l-2 border-secondary/30">
            Refers to text at position {comment.char_start}-{comment.char_end}
          </div>
        )}

        <p className="text-sm text-tertiary-dark leading-relaxed whitespace-pre-wrap">{comment.text}</p>
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
