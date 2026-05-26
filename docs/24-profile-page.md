# Commit 24 — Profile Page + Board Management

## 🇬🇧 English

### Requirements

Logged-in users need a dedicated page to manage their boards:

- See all boards they've created (title, date)
- Rename a board inline (click title → editable input)
- Delete a board permanently
- Create a new board and navigate straight into it
- View received invitations and accept/decline them

### What Was Implemented

| File                             | Purpose                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `src/components/ProfilePage.tsx` | Full profile + boards + invites UI                                                  |
| `src/lib/boardSync.ts`           | `getBoardsByUser`, `deleteBoard`, `updateBoardTitle`, `createBoard`, `getBoardMeta` |
| `src/App.tsx`                    | Added `'profile'` page + lazy-loaded `ProfilePage`                                  |

### Board CRUD in Firestore

#### `getBoardsByUser(userId)`

Uses a single-field `where('createdBy', '==', userId)` query — no composite index needed.
Results are sorted in-memory by `createdAt` descending (newest first).

```typescript
const q = query(collection(db, 'boards'), where('createdBy', '==', userId));
const snap = await getDocs(q);
return snap.docs
  .map(d => ({ id: d.id, title: d.data().title, createdAt: d.data().createdAt?.toDate(), ... }))
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

#### `deleteBoard(boardId)`

Firestore does **not** cascade deletes. Deleting `boards/{id}` does NOT delete
`boards/{id}/items/*`. Solution: use a `writeBatch` to delete all items first,
then the board document atomically:

```typescript
const itemsSnap = await getDocs(collection(db, 'boards', boardId, 'items'));
const batch = writeBatch(db);
itemsSnap.forEach((d) => batch.delete(d.ref));
batch.delete(doc(db, 'boards', boardId));
await batch.commit();
```

Firestore batches support up to **500 operations**. For boards with more items,
multiple batches would be needed (not implemented — unlikely edge case for this app).

#### Optimistic rename

The title is updated in local state immediately for instant UI feedback, then the
Firestore write happens asynchronously. If Firestore fails, an error banner appears
but the local state is already updated (acceptable trade-off for UX):

```typescript
setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, title: trimmed } : b)));
await updateBoardTitle(id, trimmed); // async, might fail
```

### Inline Rename Pattern

Click on the board title → it becomes a text `<input>`:

- `autoFocus` focuses it immediately
- `onBlur` saves when the user clicks away
- `Enter` key saves, `Escape` cancels

```tsx
{
  editingId === board.id ? (
    <input
      autoFocus
      value={editTitle}
      onBlur={() => handleRename(board.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleRename(board.id);
        if (e.key === 'Escape') setEditingId(null);
      }}
    />
  ) : (
    <button onClick={() => startEdit(board)}>{board.title}</button>
  );
}
```

### Lazy Loading

`ProfilePage` is only loaded when the user navigates to it using `React.lazy`:

```typescript
const ProfilePage = lazy(() => import('./components/ProfilePage'));
```

This keeps the initial JS bundle small — the profile code is only downloaded
on first visit.

---

## 🇷🇴 Română

### Cerințe

Utilizatorii autentificați au nevoie de o pagină de profil pentru gestionarea tablelor.

### Ce s-a implementat

| Fișier                           | Scop                                   |
| -------------------------------- | -------------------------------------- |
| `src/components/ProfilePage.tsx` | UI complet: profil + table + invitații |
| `src/lib/boardSync.ts`           | CRUD table în Firestore                |

### Ștergere tablă cu writeBatch

Firestore **nu cascadează ștergerile**. Ștergând `boards/{id}`, subcollecția
`boards/{id}/items/*` rămâne. Soluție: `writeBatch` care șterge toate item-urile
și documentul tablei într-o singură tranzacție atomică.

Un batch Firestore suportă maxim **500 operații**. Pentru table foarte mari
ar fi nevoie de mai multe batch-uri — neimplementat deocamdată.

### Redenumire optimistă

Titlul se actualizează imediat în state-ul local (fără să aștepte Firestore),
oferind feedback instant. Dacă write-ul Firestore eșuează, se afișează un banner
de eroare. Trade-off acceptabil pentru UX.

### Lazy loading

`ProfilePage` se descarcă doar la prima navigare spre ea. Bundle-ul inițial rămâne mic.
