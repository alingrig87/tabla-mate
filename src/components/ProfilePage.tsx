/**
 * ProfilePage — shows the logged-in user's boards + received invites.
 *
 * Features:
 *   - User avatar, name, email
 *   - List of boards: title, date, open / delete
 *   - Inline rename (click title → editable input)
 *   - "Tablă nouă" button — creates a board and navigates straight into it
 *   - "Invitații primite" — invites sent to user's email; accept = open board
 */

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBoardsByUser, deleteBoard, updateBoardTitle, createBoard } from '../lib/boardSync';
import type { BoardMeta } from '../lib/boardSync';
import { getInvitesForUser, removeInvite } from '../lib/invites';
import type { InviteRecord } from '../lib/invites';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function boardAutoTitle(): string {
  return `Tablă · ${new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onOpenBoard: (boardId: string) => void;
}

export default function ProfilePage({ onBack, onOpenBoard }: Props): JSX.Element {
  const { user, logout } = useAuth();

  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline-rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Boards being deleted (show spinner)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Creating a new board
  const [creating, setCreating] = useState(false);

  // Received invites
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  // Load boards on mount
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getBoardsByUser(user.uid)
      .then(setBoards)
      .catch(() => setError('Nu am putut încărca tablele.'))
      .finally(() => setLoading(false));
  }, [user]);

  // Load invites on mount
  useEffect(() => {
    if (!user?.email) return;
    setLoadingInvites(true);
    getInvitesForUser(user.email)
      .then(setInvites)
      .catch(console.error)
      .finally(() => setLoadingInvites(false));
  }, [user]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleCreate() {
    if (!user || creating) return;
    setCreating(true);
    const newId = crypto.randomUUID().slice(0, 8);
    const title = boardAutoTitle();

    // 1. Navigate immediately — no waiting for Firestore
    const url = new URL(window.location.href);
    url.searchParams.set('board', newId);
    window.history.pushState({}, '', url.toString());
    onOpenBoard(newId);

    // 2. Persist to Firestore in background
    createBoard(newId, user.uid, title).catch(() => {
      setError('Nu am putut salva tabla. Verifică conexiunea.');
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('Ștergi tabla permanent?')) return;
    setDeletingIds((s) => new Set(s).add(id));
    try {
      await deleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError('Nu am putut șterge tabla.');
    } finally {
      setDeletingIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleRename(id: string) {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    setEditingId(null);
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title: trimmed } : b)));
    try {
      await updateBoardTitle(id, trimmed);
    } catch {
      setError('Nu am putut redenumi tabla.');
    }
  }

  function startEdit(board: BoardMeta) {
    setEditingId(board.id);
    setEditTitle(board.title);
  }

  function handleOpen(boardId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId);
    window.history.pushState({}, '', url.toString());
    onOpenBoard(boardId);
  }

  // Accept an invite: navigate to the board, then optionally remove the invite
  function handleAcceptInvite(invite: InviteRecord) {
    handleOpen(invite.boardId);
    // Non-blocking dismiss after navigating away
    removeInvite(invite.id).catch(console.error);
  }

  // Dismiss (decline) an invite without opening
  async function handleDismissInvite(invite: InviteRecord) {
    setDismissingId(invite.id);
    try {
      await removeInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch {
      setError('Nu am putut respinge invitația.');
    } finally {
      setDismissingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ ...s.root, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#718096' }}>Trebuie să fii autentificat pentru a vedea profilul.</p>
        <button onClick={onBack} style={s.backBtn}>
          ← Înapoi
        </button>
      </div>
    );
  }

  return (
    <div style={s.root}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={s.header}>
        <button onClick={onBack} style={s.backBtn} title="Înapoi la tablă">
          ← Tablă
        </button>

        {/* Avatar + info */}
        <div style={s.userRow}>
          {user.photoURL ? (
            <img src={user.photoURL} referrerPolicy="no-referrer" style={s.avatar} alt="avatar" />
          ) : (
            <div style={s.avatarFallback}>
              {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={s.userName}>{user.displayName ?? 'Utilizator'}</div>
            <div style={s.userEmail}>{user.email}</div>
          </div>
        </div>

        <button onClick={logout} style={s.logoutBtn} title="Deconectare">
          Logout
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={s.body}>
        {/* Section header */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>📋 Tablele mele</span>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{ ...s.newBtn, opacity: creating ? 0.6 : 1 }}
          >
            {creating ? 'Se creează…' : '+ Tablă nouă'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={s.errorBanner}>
            ⚠ {error}
            <button onClick={() => setError(null)} style={s.errorClose}>
              ✕
            </button>
          </div>
        )}

        {/* Board list */}
        {loading ? (
          <div style={s.emptyState}>Se încarcă…</div>
        ) : boards.length === 0 ? (
          <div style={s.emptyState}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🖊</span>
            Nu ai nicio tablă încă.
            <br />
            <span style={{ color: '#4a5568' }}>
              Click pe &ldquo;+ Tablă nouă&rdquo; sau folosește butonul 🔗 din tablă.
            </span>
          </div>
        ) : (
          <div style={s.list}>
            {boards.map((board) => (
              <div key={board.id} style={s.card}>
                {/* Title — inline editable */}
                <div style={s.cardLeft}>
                  {editingId === board.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRename(board.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(board.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      style={s.titleInput}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(board)}
                      title="Click pentru redenumire"
                      style={s.titleBtn}
                    >
                      {board.title}
                    </button>
                  )}
                  <span style={s.dateLabel}>{formatDate(board.createdAt)}</span>
                </div>

                {/* Actions */}
                <div style={s.cardActions}>
                  <button
                    onClick={() => handleOpen(board.id)}
                    style={s.openBtn}
                    title="Deschide tabla"
                  >
                    Deschide
                  </button>
                  <button
                    onClick={() => handleDelete(board.id)}
                    disabled={deletingIds.has(board.id)}
                    style={{ ...s.deleteBtn, opacity: deletingIds.has(board.id) ? 0.4 : 1 }}
                    title="Șterge tabla"
                  >
                    {deletingIds.has(board.id) ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Received invites section ──────────────────────────────────── */}
        {(loadingInvites || invites.length > 0) && (
          <>
            <div style={{ ...s.sectionHeader, marginTop: 28 }}>
              <span style={s.sectionTitle}>📬 Invitații primite</span>
            </div>

            {loadingInvites ? (
              <div style={{ ...s.emptyState, padding: '20px' }}>Se încarcă…</div>
            ) : (
              <div style={s.list}>
                {invites.map((inv) => (
                  <div key={inv.id} style={s.inviteCard}>
                    <div style={s.cardLeft}>
                      <span style={s.inviteTitle}>{inv.boardTitle}</span>
                      <span style={s.dateLabel}>
                        De la <strong style={{ color: '#a0aec0' }}>{inv.invitedByName}</strong>
                        {' · '}
                        {formatDate(inv.invitedAt)}
                      </span>
                    </div>
                    <div style={s.cardActions}>
                      <button
                        onClick={() => handleAcceptInvite(inv)}
                        style={s.openBtn}
                        title="Deschide tabla"
                      >
                        Acceptă
                      </button>
                      <button
                        onClick={() => handleDismissInvite(inv)}
                        disabled={dismissingId === inv.id}
                        style={{
                          ...s.deleteBtn,
                          opacity: dismissingId === inv.id ? 0.4 : 1,
                        }}
                        title="Respinge invitația"
                      >
                        {dismissingId === inv.id ? '…' : '✕'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#0b0d14',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    background: '#16181f',
    borderBottom: '1px solid #2d3148',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  backBtn: {
    background: '#2d3148',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid #2d3148',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#e2e8f0',
    lineHeight: 1.3,
  },
  userEmail: {
    fontSize: 12,
    color: '#4a5568',
  },
  logoutBtn: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef444433',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    maxWidth: 720,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#7c85ff',
  },
  newBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  errorBanner: {
    background: '#2d1a1a',
    color: '#fc8181',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e5353533',
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: '#fc8181',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096',
    fontSize: 14,
    lineHeight: 2,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  card: {
    background: '#16181f',
    border: '1px solid #2d3148',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    transition: 'border-color 0.15s',
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  titleBtn: {
    background: 'transparent',
    border: 'none',
    color: '#c7d2fe',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'text',
    padding: 0,
    textAlign: 'left',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  titleInput: {
    background: '#252840',
    border: '1px solid #4f46e5',
    borderRadius: 6,
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 600,
    padding: '3px 8px',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  dateLabel: {
    fontSize: 11,
    color: '#4a5568',
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  openBtn: {
    background: '#3730a3',
    color: '#c7d2fe',
    border: 'none',
    borderRadius: 7,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'background 0.15s',
  },
  deleteBtn: {
    background: '#1a1a2e',
    color: '#ef4444',
    border: '1px solid #ef444422',
    borderRadius: 7,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 14,
    transition: 'background 0.15s',
  },
  inviteCard: {
    background: '#16181f',
    border: '1px solid #3730a344',
    borderLeft: '3px solid #4f46e5',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
    transition: 'border-color 0.15s',
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#c7d2fe',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '100%',
  },
};
