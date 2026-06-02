# 37 — Fix: Error handling pentru modul colaborativ

## Problema

`subscribeToBoardItems()` nu avea callback de eroare pe `onSnapshot`. Dacă Firestore respingea conexiunea (reguli nedeployate, rețea, configurație lipsă), eroarea era silențioasă — utilizatorul vedea o tablă goală fără nicio explicație.

## Fix

### `boardSync.ts`

`subscribeToBoardItems` primește acum un parametru opțional `onError`:

```ts
export function subscribeToBoardItems(
  boardId: string,
  onUpdate: (items: RemoteItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(q, onUpdate, (err) => {
    console.error('[boardSync] onSnapshot error:', err);
    onError?.(err);
  });
}
```

### `CanvasBoard.tsx`

Se afișează un banner roșu în partea de sus a ecranului când sincronizarea eșuează, cu mesajul erorii și buton de dismiss:

```
┌──────────────────────────────────────────────┐
│ Colaborare indisponibilă: <mesaj eroare>  ×  │
└──────────────────────────────────────────────┘
```

Bannerul dispare automat la primul update reușit de la Firestore.

## Ce poate cauza eroarea

- Regulile Firestore nu au fost deployate (`firebase deploy --only firestore:rules`)
- Variabilele de mediu Firebase lipsesc din Vercel (VITE*FIREBASE*\*)
- Probleme de rețea / CORS

## Fișiere modificate

- `src/lib/boardSync.ts` — `subscribeToBoardItems()` cu error callback
- `src/components/CanvasBoard.tsx` — `syncError` state + banner UI
