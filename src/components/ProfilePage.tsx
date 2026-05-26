/**
 * ProfilePage — board management + received invites.
 *
 * Layout: grid of board cards with color-coded headers.
 * Each card: colored gradient band → title (click to rename) → date + actions.
 * Bottom section: received invitations with accept / dismiss.
 */

import { useState, useEffect, useRef } from 'react';
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
    month: 'short',
    year: 'numeric',
  });
}

function boardAutoTitle(): string {
  return `Tablă · ${new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}`;
}

// Derive a stable accent color from the board id
const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#7c3aed', '#e11d48'];
function boardColor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BoardCardProps {
  board: BoardMeta;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  deleting: boolean;
}

function BoardCard({ board, onOpen, onDelete, onRename, deleting }: BoardCardProps) {
  const color = boardColor(board.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(board.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function save() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== board.title) onRename(trimmed);
  }

  return (
    <div
      style={cs.card}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen();
      }}
    >
      {/* ── Colored band ─────────────────────────────────────────────── */}
      <div style={{ ...cs.band, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
        <span style={cs.bandInitial}>
          {board.title.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')[0]?.toUpperCase() ?? '📋'}
        </span>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div style={cs.cardBody}>
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            style={cs.renameInput}
          />
        ) : (
          <div style={cs.cardTitle}>
            <span style={cs.cardTitleText} title={board.title}>
              {board.title}
            </span>
            <button style={cs.pencilBtn} onClick={startEdit} title="Redenumește">
              ✏
            </button>
          </div>
        )}
        <span style={cs.cardDate}>{formatDate(board.createdAt)}</span>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────── */}
      <div style={cs.cardFooter} onClick={(e) => e.stopPropagation()}>
        <button style={{ ...cs.openBtn, borderColor: `${color}66`, color }} onClick={onOpen}>
          Deschide →
        </button>
        <button style={cs.deleteBtn} onClick={onDelete} disabled={deleting} title="Șterge tabla">
          {deleting ? '…' : '🗑'}
        </button>
      </div>
    </div>
  );
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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  // Received invites
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getBoardsByUser(user.uid)
      .then(setBoards)
      .catch(() => setError('Nu am putut încărca tablele.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    setLoadingInvites(true);
    getInvitesForUser(user.email)
      .then(setInvites)
      .catch(console.error)
      .finally(() => setLoadingInvites(false));
  }, [user]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleOpen(boardId: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId);
    window.history.pushState({}, '', url.toString());
    onOpenBoard(boardId);
  }

  function handleCreate() {
    if (!user || creating) return;
    setCreating(true);
    const newId = crypto.randomUUID().slice(0, 8);
    const title = boardAutoTitle();
    const url = new URL(window.location.href);
    url.searchParams.set('board', newId);
    window.history.pushState({}, '', url.toString());
    onOpenBoard(newId);
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
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  async function handleRename(id: string, title: string) {
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title } : b)));
    try {
      await updateBoardTitle(id, title);
    } catch {
      setError('Nu am putut redenumi tabla.');
    }
  }

  function handleAcceptInvite(invite: InviteRecord) {
    handleOpen(invite.boardId);
    removeInvite(invite.id).catch(console.error);
  }

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

        <button onClick={logout} style={s.logoutBtn}>
          Logout
        </button>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div style={s.body}>
        {/* Error banner */}
        {error && (
          <div style={s.errorBanner}>
            ⚠ {error}
            <button onClick={() => setError(null)} style={s.errorClose}>
              ✕
            </button>
          </div>
        )}

        {/* Section header */}
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>📋 Tablele mele</span>
          <span style={s.boardCount}>
            {boards.length} {boards.length === 1 ? 'tablă' : 'table'}
          </span>
        </div>

        {/* Board grid */}
        {loading ? (
          <div style={s.loadingRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        ) : (
          <div style={s.grid}>
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onOpen={() => handleOpen(board.id)}
                onDelete={() => handleDelete(board.id)}
                onRename={(title) => handleRename(board.id, title)}
                deleting={deletingIds.has(board.id)}
              />
            ))}

            {/* Create new card */}
            <button
              style={{ ...cs.card, ...cs.newCard }}
              onClick={handleCreate}
              disabled={creating}
            >
              <div style={cs.newCardInner}>
                <span style={cs.newCardPlus}>+</span>
                <span style={cs.newCardLabel}>{creating ? 'Se creează…' : 'Tablă nouă'}</span>
              </div>
            </button>
          </div>
        )}

        {/* ── Received invites ────────────────────────────────────────────── */}
        {(loadingInvites || invites.length > 0) && (
          <>
            <div style={{ ...s.sectionHeader, marginTop: 32 }}>
              <span style={s.sectionTitle}>📬 Invitații primite</span>
              {invites.length > 0 && <span style={s.inviteBadge}>{invites.length}</span>}
            </div>

            {loadingInvites ? (
              <p style={{ color: '#718096', fontSize: 13 }}>Se încarcă…</p>
            ) : (
              <div style={s.inviteList}>
                {invites.map((inv) => (
                  <div key={inv.id} style={s.inviteCard}>
                    <div style={{ ...s.inviteAccent, background: boardColor(inv.boardId) }} />
                    <div style={s.inviteBody}>
                      <span style={s.inviteTitle}>{inv.boardTitle}</span>
                      <span style={s.inviteMeta}>
                        De la <strong>{inv.invitedByName}</strong> · {formatDate(inv.invitedAt)}
                      </span>
                    </div>
                    <div style={s.inviteActions}>
                      <button style={s.acceptBtn} onClick={() => handleAcceptInvite(inv)}>
                        Acceptă
                      </button>
                      <button
                        style={s.dismissBtn}
                        onClick={() => handleDismissInvite(inv)}
                        disabled={dismissingId === inv.id}
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

// ─── Card styles (used by BoardCard sub-component) ────────────────────────────

const cs: Record<string, CSSProperties> = {
  card: {
    background: '#1a1c27',
    border: '1px solid #2d3148',
    borderRadius: 14,
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.15s, transform 0.12s',
    userSelect: 'none',
    textAlign: 'left',
    padding: 0,
  },
  band: {
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bandInitial: {
    fontSize: 28,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter, system-ui, sans-serif',
    lineHeight: 1,
  },
  cardBody: {
    padding: '10px 14px 6px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  cardTitleText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    minWidth: 0,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  pencilBtn: {
    background: 'transparent',
    border: 'none',
    color: '#4a5568',
    cursor: 'pointer',
    fontSize: 11,
    padding: '1px 3px',
    borderRadius: 3,
    flexShrink: 0,
    lineHeight: 1,
  },
  cardDate: {
    fontSize: 11,
    color: '#4a5568',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  renameInput: {
    background: '#252840',
    border: '1px solid #4f46e5',
    borderRadius: 5,
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 700,
    padding: '3px 7px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif',
    outline: 'none',
  },
  cardFooter: {
    padding: '8px 14px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  openBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid',
    borderRadius: 7,
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'background 0.12s',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid #ef444422',
    borderRadius: 7,
    color: '#ef4444',
    padding: '5px 8px',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'background 0.12s',
  },
  newCard: {
    background: '#16181f',
    border: '2px dashed #2d3148',
    borderRadius: 14,
    cursor: 'pointer',
    minHeight: 160,
    transition: 'border-color 0.15s',
  },
  newCardInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: '100%',
    padding: 24,
  },
  newCardPlus: {
    fontSize: 32,
    color: '#4a5568',
    lineHeight: 1,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  newCardLabel: {
    fontSize: 13,
    color: '#718096',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

// ─── Page styles ──────────────────────────────────────────────────────────────

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
    background: '#0b0d14',
    borderBottom: '1px solid #1e2030',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  backBtn: {
    background: '#1e2030',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
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
    width: 38,
    height: 38,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid #2d3148',
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
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
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 24px 40px',
    maxWidth: 900,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#a0aec0',
  },
  boardCount: {
    fontSize: 12,
    color: '#4a5568',
    background: '#1e2030',
    borderRadius: 20,
    padding: '2px 10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 14,
  },
  loadingRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 14,
  },
  skeleton: {
    background: '#1a1c27',
    borderRadius: 14,
    height: 160,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  errorBanner: {
    background: '#2d1a1a',
    color: '#fc8181',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 18,
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
  // Invites
  inviteBadge: {
    background: '#4f46e5',
    color: '#fff',
    borderRadius: 20,
    padding: '2px 9px',
    fontSize: 11,
    fontWeight: 700,
  },
  inviteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  inviteCard: {
    background: '#1a1c27',
    border: '1px solid #2d3148',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  inviteAccent: {
    width: 4,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  inviteBody: {
    flex: 1,
    minWidth: 0,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  inviteTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#c7d2fe',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  inviteMeta: {
    fontSize: 11,
    color: '#4a5568',
  },
  inviteActions: {
    display: 'flex',
    gap: 8,
    padding: '0 14px',
    flexShrink: 0,
  },
  acceptBtn: {
    background: '#3730a3',
    color: '#c7d2fe',
    border: 'none',
    borderRadius: 7,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
  },
  dismissBtn: {
    background: 'transparent',
    border: '1px solid #2d3148',
    borderRadius: 7,
    color: '#718096',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 13,
  },
};
