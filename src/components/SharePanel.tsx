/**
 * SharePanel — floating panel for collaborative board sharing + invite.
 *
 * Features:
 *   - Shows the shareable board URL with one-click copy
 *   - Manual email invite field (Firestore-backed)
 *   - Lists people already invited to this board with revoke button
 *
 * Google Contacts autocomplete is intentionally omitted: that scope requires
 * Google app verification. Manual email invite works without any extra OAuth scope.
 */

import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { inviteToBoard, getInvitesForBoard, removeInvite } from '../lib/invites';
import type { InviteRecord } from '../lib/invites';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  boardId: string;
  boardTitle: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getShareUrl(boardId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('board', boardId);
  return url.toString();
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SharePanel({ boardId, boardTitle, onClose }: Props): JSX.Element {
  const { user, loginWithGoogle } = useAuth();

  // URL copy
  const [copyLabel, setCopyLabel] = useState('Copiază');

  // Email invite input
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null);

  // Existing invites for this board
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Load existing invites for this board ─────────────────────────────────
  const refreshInvites = useCallback(() => {
    setLoadingInvites(true);
    getInvitesForBoard(boardId)
      .then(setInvites)
      .catch(console.error)
      .finally(() => setLoadingInvites(false));
  }, [boardId]);

  useEffect(() => {
    refreshInvites();
  }, [refreshInvites]);

  // ── Send invite ───────────────────────────────────────────────────────────
  async function handleInvite() {
    const email = emailInput.trim();
    if (!isValidEmail(email)) {
      setSendError('Adresă email invalidă.');
      return;
    }
    if (!user) {
      setSendError('Trebuie să fii autentificat pentru a invita.');
      return;
    }
    if (invites.some((inv) => inv.inviteeEmail === email.toLowerCase())) {
      setSendError('Persoana a fost deja invitată.');
      return;
    }

    setSending(true);
    setSendError(null);
    setSendOk(null);

    try {
      await inviteToBoard(
        boardId,
        boardTitle,
        email,
        user.uid,
        user.displayName ?? user.email ?? 'Cineva'
      );
      setSendOk(`Invitație salvată! Trimite email-ul care s-a deschis.`);
      setEmailInput('');
      refreshInvites();

      // Open the user's email client with a pre-composed message
      const boardUrl = getShareUrl(boardId);
      const inviterName = user.displayName ?? user.email ?? 'Cineva';
      const subject = encodeURIComponent(`Invitație la tabla colaborativă: ${boardTitle}`);
      const body = encodeURIComponent(
        `Salut,\n\n${inviterName} te invită să colaborezi pe tabla „${boardTitle}".\n\nIntră pe link:\n${boardUrl}\n\n(Este nevoie de un cont Google pentru a salva desenele.)`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    } catch {
      setSendError('Nu am putut salva invitația. Încearcă din nou.');
    } finally {
      setSending(false);
    }
  }

  // ── Revoke invite ─────────────────────────────────────────────────────────
  async function handleRevoke(invite: InviteRecord) {
    setRevokingId(invite.id);
    try {
      await removeInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch {
      /* silently fail — refresh shows real state */
    } finally {
      setRevokingId(null);
    }
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────
  function handleCopy() {
    navigator.clipboard.writeText(getShareUrl(boardId)).then(() => {
      setCopyLabel('Copiat! ✓');
      setTimeout(() => setCopyLabel('Copiază'), 2000);
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div data-panel style={s.panel} onPointerDown={(e) => e.stopPropagation()}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={s.header}>
        <span style={s.liveDot} />
        <span style={s.headerTitle}>Colaborează</span>
        <button onClick={onClose} style={s.closeBtn} title="Închide">
          ✕
        </button>
      </div>

      {/* ── Share URL ───────────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionLabel}>🔗 Link de acces</div>
        <div style={s.row}>
          <input
            readOnly
            value={getShareUrl(boardId)}
            onFocus={(e) => e.currentTarget.select()}
            style={s.urlInput}
          />
          <button onClick={handleCopy} style={s.copyBtn}>
            {copyLabel}
          </button>
        </div>
        <p style={s.hint}>Oricine cu link-ul poate desena. Nu e nevoie de cont.</p>
      </div>

      <hr style={s.divider} />

      {/* ── Invite section ──────────────────────────────────────────────── */}
      <div style={s.section}>
        <div style={s.sectionLabel}>✉ Invită pe cineva</div>

        <div style={s.row}>
          <input
            type="email"
            placeholder="Adresă email…"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              setSendError(null);
              setSendOk(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInvite();
            }}
            style={s.emailInput}
            disabled={sending}
          />
          <button
            onClick={handleInvite}
            disabled={sending || !emailInput.trim()}
            style={{
              ...s.inviteBtn,
              opacity: sending || !emailInput.trim() ? 0.5 : 1,
            }}
          >
            {sending ? '…' : 'Invită'}
          </button>
        </div>

        {/* Feedback messages */}
        {sendError && <p style={s.errorMsg}>⚠ {sendError}</p>}
        {sendOk && <p style={s.okMsg}>✓ {sendOk}</p>}

        {/* Nudge to login */}
        {!user && (
          <p style={s.hint}>
            <button onClick={loginWithGoogle} style={s.inlineLoginBtn}>
              Conectează-te cu Google
            </button>{' '}
            pentru a putea invita pe cineva.
          </p>
        )}
      </div>

      {/* ── Invited people ──────────────────────────────────────────────── */}
      {(loadingInvites || invites.length > 0) && (
        <>
          <hr style={s.divider} />
          <div style={s.section}>
            <div style={s.sectionLabel}>👥 Persoane invitate</div>
            {loadingInvites ? (
              <p style={s.hint}>Se încarcă…</p>
            ) : (
              <ul style={s.inviteList}>
                {invites.map((inv) => (
                  <li key={inv.id} style={s.inviteItem}>
                    <div style={s.inviteAvatar}>{inv.inviteeEmail[0].toUpperCase()}</div>
                    <span style={s.inviteEmail}>{inv.inviteeEmail}</span>
                    {user && user.uid === inv.invitedByUid && (
                      <button
                        onClick={() => handleRevoke(inv)}
                        disabled={revokingId === inv.id}
                        style={s.revokeBtn}
                        title="Revocă invitația"
                      >
                        {revokingId === inv.id ? '…' : '✕'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  panel: {
    position: 'fixed',
    top: 68,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#16181f',
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid #2d3148',
    padding: '0 0 4px',
    zIndex: 20,
    minWidth: 320,
    maxWidth: 'calc(100vw - 32px)',
    width: 400,
    userSelect: 'none',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px 12px',
    borderBottom: '1px solid #2d3148',
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    flexShrink: 0,
    boxShadow: '0 0 6px #22c55e88',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#e2e8f0',
    flex: 1,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#718096',
    fontSize: 15,
    lineHeight: 1,
    padding: '2px 4px',
    borderRadius: 4,
  },
  section: {
    padding: '12px 16px',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #2d3148',
    margin: 0,
  },
  row: {
    display: 'flex',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    minWidth: 0,
    padding: '7px 10px',
    borderRadius: 8,
    border: '1px solid #2d3148',
    fontSize: 11,
    fontFamily: 'monospace',
    background: '#0b0d14',
    color: '#a0aec0',
    outline: 'none',
  },
  copyBtn: {
    padding: '7px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#3730a3',
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  },
  hint: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#718096',
    lineHeight: 1.5,
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #2d3148',
    fontSize: 13,
    background: '#0b0d14',
    color: '#e2e8f0',
    outline: 'none',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  inviteBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  errorMsg: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#fc8181',
  },
  okMsg: {
    margin: '6px 0 0',
    fontSize: 12,
    color: '#68d391',
  },
  inlineLoginBtn: {
    background: 'transparent',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    padding: 0,
    fontSize: 11,
    fontWeight: 600,
    textDecoration: 'underline',
  },
  inviteList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  inviteItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    background: '#0b0d14',
    borderRadius: 8,
    border: '1px solid #2d3148',
  },
  inviteAvatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: '#2d3148',
    color: '#a0aec0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  inviteEmail: {
    flex: 1,
    fontSize: 12,
    color: '#a0aec0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  revokeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#718096',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 4px',
    borderRadius: 4,
    flexShrink: 0,
  },
};
