# Commit 25 — Share Panel + Email Invite System

## 🇬🇧 English

### Requirements

After opening a collaborative board, the owner should be able to:

- Share the board URL with one click
- Invite specific people by email
- See who has been invited (and revoke invitations)
- Invited users should see the invitation in their Profile page

### What Was Implemented

| File                             | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `src/components/SharePanel.tsx`  | Floating dark-themed panel (URL copy + invite)  |
| `src/lib/invites.ts`             | Firestore CRUD for the `invites` collection     |
| `src/lib/contacts.ts`            | Google People API wrapper (kept for future use) |
| `src/components/ProfilePage.tsx` | "Invitații primite" section                     |
| `src/components/CanvasBoard.tsx` | Uses `<SharePanel>`, tracks `boardTitle`        |
| `src/lib/boardSync.ts`           | Added `getBoardMeta()`                          |

### Invite Data Model

```
invites/{inviteId}
  boardId:        string    — which board
  boardTitle:     string    — denormalised title (shown in inbox without extra query)
  inviteeEmail:   string    — lowercase email of invited person
  invitedByUid:   string    — Firebase UID of inviter
  invitedByName:  string    — denormalised display name
  invitedAt:      Timestamp — server timestamp
```

**Deterministic document ID**: `{boardId}_{sanitized_email}` — re-inviting the same
person is idempotent (overwrites instead of creating duplicates):

```typescript
const inviteId = `${boardId}_${inviteeEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
await setDoc(doc(db, 'invites', inviteId), { ... });
```

**Single-field queries** (no composite index needed):

```typescript
// Inbox: invites for a specific email
where('inviteeEmail', '==', email.toLowerCase());

// Board panel: invites sent for a specific board
where('boardId', '==', boardId);
```

### Why Board Title Is Denormalised

When showing the invite inbox (`ProfilePage`), we need to display the board title.
The alternative — fetching each board's metadata for every invite — would require
N+1 Firestore reads. By storing the title in the invite document, one query suffices.

Downside: if the board is renamed, existing invite notifications show the old title.
This is an acceptable trade-off for this app.

### SharePanel Component

Replaces the original inline share panel that only had a URL copy button.
Key design decisions:

- Dark theme matching the rest of the app (`#16181f` background)
- `onPointerDown: stopPropagation` prevents canvas drawing when interacting with the panel
- `data-panel` attribute allows CanvasBoard's existing outside-click-close logic to work
- `maxHeight: calc(100vh - 100px)` + `overflowY: auto` for long invite lists on small screens

### Google Contacts Autocomplete — Decision

Initially implemented with `contacts.readonly` OAuth scope to autocomplete email
addresses from the user's Google contacts. Removed because:

1. The `contacts.readonly` scope is classified as **sensitive** by Google
2. Any app requesting it triggers **"Google hasn't verified this app"** for all users
3. Passing Google's OAuth verification is a weeks-long review process
4. Manual email invite achieves the same result without the friction

The `contacts.ts` file is kept as dead code for potential future use (after verification).

**Workaround for developers**: Add test users in Google Cloud Console →
APIs & Services → OAuth consent screen → Test users. Those users can bypass
the warning by clicking "Advanced" → "Go to [app] (unsafe)".

### BoardTitle State in CanvasBoard

The `SharePanel` needs the board title for invite notifications. CanvasBoard now:

1. Generates the title when **creating** a board
2. Fetches it via `getBoardMeta(boardId)` when **loading from URL** (`?board=xxx`)

```typescript
useEffect(() => {
  if (!boardId) return;
  getBoardMeta(boardId)
    .then((meta) => {
      if (meta) setBoardTitle(meta.title);
    })
    .catch(() => {
      /* non-critical */
    });
}, [boardId]);
```

### Profile Page — Received Invitations

The "Invitații primite" section queries invites by the user's email:

```typescript
getInvitesForUser(user.email); // where('inviteeEmail', '==', email)
```

- **Accept** → navigates to the board AND removes the invite (non-blocking)
- **Dismiss** → removes the invite without opening the board

---

## 🇷🇴 Română

### Cerințe

Posibilitatea de a invita persoane specifice la o tablă colaborativă prin email,
cu vizualizarea invitațiilor primite în pagina de profil.

### Modelul de date pentru invitații

```
invites/{inviteId}
  boardId, boardTitle, inviteeEmail, invitedByUid, invitedByName, invitedAt
```

**ID determinist**: `{boardId}_{email_sanificat}` — re-invitarea aceleiași persoane
suprascrie documentul existent (idempotent, fără duplicate).

**Titlul denormalizat**: stocăm titlul tablei în documentul de invitație pentru a evita
N+1 query-uri Firestore la afișarea inbox-ului.

### De ce s-a renunțat la autocomplete din Google Contacts

Scope-ul `contacts.readonly` e clasificat ca **sensibil** de Google. Orice aplicație
care îl cere declanșează ecranul "Google hasn't verified this app" pentru toți utilizatorii,
blocând practic adoptarea. Invitarea manuală prin email funcționează fără niciun scope extra.

Fișierul `contacts.ts` e păstrat pentru utilizare viitoare (după o eventuală verificare
a aplicației la Google).

### Componenta SharePanel

Înlocuiește panoul inline de share care afișa doar URL-ul. Noul panou are:

- 🔗 URL de share + buton copiere
- ✉ Câmp email invitație + buton „Invită"
- 👥 Lista persoanelor deja invitate cu buton revocare (vizibil doar pentru invitant)

`onPointerDown: stopPropagation` previne desenarea accidentală pe canvas când
interacționezi cu panoul.
