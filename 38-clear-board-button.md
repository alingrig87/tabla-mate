# 38 — Buton ștergere totală tablă

## Ce s-a adăugat

Buton nou în toolbar (între eraser și line) care șterge toate elementele de pe tablă după confirmare.

## Comportament

- Click pe butonul coș de gunoi → dialog de confirmare: „Ștergi tot de pe tablă? Acțiunea nu poate fi anulată."
- La confirmare → `commit([])` → tabla devine goală
- Shortcut tastatură: `Delete`
- Dacă tabla e deja goală → nimic nu se întâmplă (fără dialog inutil)
- În modul colaborativ → șterge toate elementele și din Firestore (via `syncDiff`)

## Notă

Acțiunea NU poate fi anulată cu Ctrl+Z — `commit([])` înlocuiește starea curentă, iar undo-ul ar readuce toate elementele înapoi. Dacă vrei undo, folosești Ctrl+Z ca de obicei.

## Fișiere modificate

- `src/components/CanvasBoard.tsx` — `IconClearAll`, `handleClearAll()`, buton toolbar, shortcut `Delete`
