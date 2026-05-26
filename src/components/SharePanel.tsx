/**
 * SharePanel — floating panel for collaborative board sharing + invite.
 *
 * Features:
 *   - Shows the shareable board URL with one-click copy
 *   - Email invite field with Google Contacts autocomplete (if logged in)
 *   - Lists people already invited to this board
 *   - Revoke invite with one click
 *
 * When the user is not logged in, the contacts autocomplete is hidden and a
 * gentle nudge to log in is shown (manual email entry still works).
 *
 * If the Google People API is not enabled in Cloud Console, contacts fall
 * back silently and only manual email input is available.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { getOrFetchContacts } from '../lib/contacts';
import type { GoogleContact } from '../lib/contacts';
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
  const { user, googleAccessToken, loginWithGoogle } = useAuth();

  // URL copy
  const [copyLabel, setCopyLabel] = useState('Copiază');

  // Email invite input
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendOk, setSendOk] = useState<string | null>(null); // success message

  // Google Contacts autocomplete
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [suggestions, setSuggestions] = useState<GoogleContact[]>([]);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [activeSugg, setActiveSugg] = useState(-1);
  const suggRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Existing invites for this board
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Load contacts once (cached per access token) ─────────────────────────
  useEffect(() => {
    if (!googleAccessToken) return;
    getOrFetchContacts(googleAccessToken)
      .then(setContacts)
      .catch((err: Error) => {
        // Surface a friendly message only for the "API not enabled" case
        if (err.message.includes('People API')) {
          setContactsError('Autocomplete dezactivat (People API neactivat).');
        }
        // Other errors (token expired, network) — silently degrade
      });
  }, [googleAccessToken]);

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

  // ── Autocomplete filtering ────────────────────────────────────────────────
  function handleEmailChange(value: string) {
    setEmailInput(value);
    setSendError(null);
    setSendOk(null);
    setActiveSugg(-1);

    const q = value.trim().toLowerCase();
    if (q.length < 1 || contacts.length === 0) {
      setSuggestions([]);
      return;
    }
    const hits = contacts
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 6);
    setSuggestions(hits);
  }

  function pickSuggestion(c: GoogleContact) {
    setEmailInput(c.email);
    setSuggestions([]);
    setActiveSugg(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSugg((n) => Math.min(n + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSugg((n) => Math.max(n - 1, 0));
    } else if (e.key === 'Enter' && activeSugg >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[activeSugg]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  }

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
    // Check duplicate
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
      setSendOk(`Invitație trimisă către ${email}`);
      setEmailInput('');
      setSuggestions([]);
      refreshInvites();
    } catch {
      setSendError('Nu am putut trimite invitația. Încearcă din nou.');
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
      // Silently fail — refresh will show real state
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

  // ── Close on outside click ────────────────────────────────────────────────
  // (handled by CanvasBoard's existing data-panel logic, so no extra handler needed)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      data-panel
      style={s.panel}
      // Prevent canvas pointer events from firing through the panel
      onPointerDown={(e) => e.stopPropagation()}
    >
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

        {/* Contacts autocomplete wrapper */}
        <div style={{ position: 'relative' }}>
          <div style={s.row}>
            <input
              ref={inputRef}
              type="email"
              placeholder={
                googleAccessToken ? 'Caută în contacte sau scrie email…' : 'Adresă email…'
              }
              value={emailInput}
              onChange={(e) => handleEmailChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Delay so click on suggestion fires first
                setTimeout(() => setSuggestions([]), 150);
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

          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul ref={suggRef} style={s.dropdown}>
              {suggestions.map((c, i) => (
                <li
                  key={c.email}
                  style={{
                    ...s.suggItem,
                    background: i === activeSugg ? '#2d3148' : 'transparent',
                  }}
                  onMouseDown={() => pickSuggestion(c)}
                >
                  {c.photoUrl ? (
                    <img src={c.photoUrl} style={s.suggPhoto} referrerPolicy="no-referrer" alt="" />
                  ) : (
                    <div style={s.suggInitial}>{(c.name || c.email)[0].toUpperCase()}</div>
                  )}
                  <div style={s.suggInfo}>
                    <span style={s.suggName}>{c.name}</span>
                    <span style={s.suggEmail}>{c.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Feedback messages */}
        {sendError && <p style={s.errorMsg}>⚠ {sendError}</p>}
        {sendOk && <p style={s.okMsg}>✓ {sendOk}</p>}
        {contactsError && <p style={s.warnMsg}>ℹ {contactsError}</p>}

        {/* Nudge to login for contacts autocomplete */}
        {!user && (
          <p style={s.hint}>
            <button onClick={loginWithGoogle} style={s.inlineLoginBtn}>
              Conectează-te cu Google
            </button>{' '}
            pentru a invita din contactele tale.
          </p>
        )}
        {user && !googleAccessToken && (
          <p style={s.hint}>
            <button onClick={loginWithGoogle} style={s.inlineLoginBtn}>
              Reconectează-te
            </button>{' '}
            pentru autocomplete din contacte.
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
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1e2030',
    border: '1px solid #2d3148',
    borderRadius: 10,
    marginTop: 4,
    padding: '4px 0',
    listStyle: 'none',
    zIndex: 30,
    boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
    maxHeight: 220,
    overflowY: 'auto',
  },
  suggItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 12px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderRadius: 6,
    margin: '0 4px',
  },
  suggPhoto: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    flexShrink: 0,
    border: '1px solid #2d3148',
  },
  suggInitial: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#4f46e5',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  suggInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  suggName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#e2e8f0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  suggEmail: {
    fontSize: 11,
    color: '#718096',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
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
  warnMsg: {
    margin: '6px 0 0',
    fontSize: 11,
    color: '#f6ad55',
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
