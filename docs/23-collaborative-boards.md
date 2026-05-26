# Commit 23 — Collaborative Whiteboards (Firestore Real-Time Sync)

## 🇬🇧 English

### Requirements

Two or more users should be able to draw on the same board simultaneously:

- One user creates a board → gets a shareable URL (`?board=xxx`)
- Another user opens the URL → sees the same board, live
- Both can draw at the same time — strokes appear on the other's screen in real time
- Works for anonymous users (no login required to join)

### What Was Implemented

| File                             | Purpose                                   |
| -------------------------------- | ----------------------------------------- |
| `src/lib/boardSync.ts`           | Firestore CRUD + real-time subscription   |
| `src/components/CanvasBoard.tsx` | Sync integration, `syncDiff`, share panel |

### Firestore Data Model

```
boards/{boardId}
  createdBy: string        — Firebase UID or 'anon'
  title: string            — human-readable name
  createdAt: Timestamp     — server timestamp

boards/{boardId}/items/{itemId}
  ...DrawItem fields       — all pen/shape/text properties
  authorId: string         — UID of who drew it
  createdAt: Timestamp     — server timestamp (used for ordering)
```

Each stroke/shape is its own Firestore document. This allows granular real-time
updates (only changed documents trigger listener callbacks).

### Why Images Are NOT Synced

`ImageItem` contains a base64-encoded dataURL. A single image can easily be 1–5 MB,
but Firestore has a **1 MB per-document hard limit**. Image items stay local-only
when in collaborative mode.

### The `syncDiff` Algorithm

Rather than syncing the entire items array on every change, `syncDiff` computes the
delta between the previous and next state:

```typescript
function syncDiff(prev: DrawItem[], next: DrawItem[]) {
  const bid = boardIdRef.current;
  if (!bid) return;

  const prevIds = new Set(prev.map((i) => i.id).filter(Boolean));
  const nextIds = new Set(next.map((i) => i.id).filter(Boolean));

  // Added items → write to Firestore
  for (const item of next) {
    if (!item.id || prevIds.has(item.id)) continue;
    if (item.kind === 'image') continue; // skip base64 items
    pendingUploadIds.current.add(item.id);
    const { id, ...data } = item as DrawItem & { id: string };
    addItemToBoard(bid, id, data, authorId)
      .then(() => pendingUploadIds.current.delete(id))
      .catch(console.error);
  }

  // Removed items → delete from Firestore
  for (const item of prev) {
    if (!item.id || nextIds.has(item.id)) continue;
    removeItemFromBoard(bid, item.id).catch(console.error);
  }
}
```

This is called inside `commit()` (the function that finalises every stroke).

### Preventing Echo / Double-Render

When this client writes an item to Firestore, the `onSnapshot` listener fires almost
immediately — including for our own write. Without mitigation, the item would appear
twice (once from local state, once from Firestore).

Solution: `pendingUploadIds` — a `Set<string>` of IDs uploaded by this client but not
yet confirmed by Firestore. The listener merge logic keeps these items:

```typescript
const unsub = subscribeToBoardItems(boardId, (remoteItems) => {
  setItems((prev) => {
    const remoteIds = new Set(remoteItems.map((ri) => ri.id));

    // Keep locally-pending items that haven't arrived in the snapshot yet
    const pending = prev.filter(
      (item) => item.id && !remoteIds.has(item.id) && pendingUploadIds.current.has(item.id)
    );

    const fromRemote = remoteItems.map(
      ({ id, authorId: _a, ...data }) => ({ ...data, id }) as DrawItem
    );

    return [...fromRemote, ...pending];
  });
});
```

### Undo/Redo Disabled in Collaborative Mode

If user A undoes a stroke, `syncDiff` would delete the Firestore document — including
strokes drawn by user B. This is unintuitive (user A's undo deletes user B's work).
Solution: undo/redo buttons are hidden/disabled when `boardId` is set.

### URL Strategy

Board ID is read from `?board=xxx` on page load:

```typescript
const [boardId, setBoardId] = useState<string | null>(() =>
  new URLSearchParams(window.location.search).get('board')
);
```

When creating a board, the URL is updated without a page reload:

```typescript
const url = new URL(window.location.href);
url.searchParams.set('board', newBoardId);
window.history.pushState({}, '', url.toString());
```

This makes the shareable URL available immediately in the browser address bar.

---

## 🇷🇴 Română

### Cerințe

Doi sau mai mulți utilizatori să poată desena pe aceeași tablă simultan, în timp real.

### Modelul de date Firestore

```
boards/{boardId}          — metadate tablă (titlu, creator, dată)
boards/{boardId}/items/{id} — un document per trăsătură/formă/text
```

Fiecare trăsătură e un document Firestore separat. Asta permite update-uri granulare
— Firestore trimite callback-uri doar pentru documentele modificate.

### De ce imaginile NU se sincronizează

`ImageItem` conține un dataURL base64 care poate fi 1–5 MB. Firestore are o limită
hard de **1 MB per document**. Imaginile rămân locale când ești în mod colaborativ.

### Algoritmul `syncDiff`

În loc să sincronizeze tot array-ul la fiecare modificare, `syncDiff` calculează
diferența (delta) față de starea anterioară:

- **Adăugate** → `setDoc` în Firestore
- **Șterse** → `deleteDoc` din Firestore

### Prevenirea „echo-ului"

Când clientul curent scrie un item în Firestore, listener-ul `onSnapshot` se declanșează
aproape imediat — inclusiv pentru propriul write. Fără mitigare, item-ul ar apărea de
două ori. Soluție: `pendingUploadIds` — un Set cu ID-urile uploadate dar neconfirmate
încă de Firestore. Listener-ul le păstrează în state local până sosesc în snapshot.

### Undo/Redo dezactivat în mod colaborativ

Dacă utilizatorul A face undo, `syncDiff` ar șterge din Firestore inclusiv trăsăturile
desenate de utilizatorul B. Soluție: butoanele undo/redo sunt dezactivate când
`boardId` e setat.
