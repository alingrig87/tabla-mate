# Commit 27 — Select & Move Tool

## 🇬🇧 English

### What Was Added

A **selection tool** that lets users pick any drawn item and drag it to a new position — without needing to erase and redraw it. It works in both local and collaborative modes.

### New Toolbar Button

The cursor-arrow icon appears in the toolbar between **Shapes** and **Pan**. It can be clicked or (soon) activated with the `S` key.

### How It Works

| Gesture                | Effect                                                |
| ---------------------- | ----------------------------------------------------- |
| Click on an item       | Selects it — dashed blue bounding box appears         |
| Click on empty space   | Deselects                                             |
| Drag a selected item   | Moves it live (real-time preview)                     |
| Release                | Commits the move to undo history + syncs to Firestore |
| `Escape`               | Deselects current item                                |
| Switch to another tool | Clears selection automatically                        |

### Hit-Testing

Selection uses the **exact same geometry hit-test** as the smart eraser (`hitTest()`):

- **Pen strokes** — distance to each segment of the polyline
- **Lines** — distance to the segment
- **Rects** — distance to each of the 4 edges
- **Circles/Ellipses** — ellipse border distance
- **Text** — approximate bounding box
- **Geometric shapes** — bounding box
- **Images** — AABB

Tolerance is scaled to current zoom level so it feels consistent at all zoom levels.

### Moving — Live Preview without Re-renders

During a drag, `itemsRef.current` is mutated directly (same pattern as the smart eraser) to avoid triggering React state updates on every pointer-move frame. The final position is committed via `setItems()` only on `pointerUp`, which creates one undo entry.

### Firestore Sync

When a move is committed and a board ID is set, `updateItemInBoard()` is called to overwrite the item's coordinate fields in Firestore. Other collaborative users will see the item jump to the new position instantly.

> **Note:** Images (`kind: 'image'`) are not synced to Firestore (they exceed the 1 MB doc limit), so moving a pasted image only takes effect locally.

### Selection Highlight

The bounding box is drawn in `redrawAll()` as a **dashed blue rectangle** with filled corner handles. The visual width is `1.5 / scale` world units so the dashes remain the same size on screen regardless of zoom level.

A module-level `_lastSelectionBox` variable ensures the box is preserved when images async-load and trigger a redraw via their `onLoad` callback.

### New Helpers

| Function                               | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `getBoundingBox(item, pad)`            | AABB for any `DrawItem` type        |
| `moveItem(item, dx, dy)`               | Returns a new translated `DrawItem` |
| `updateItemInBoard(boardId, id, data)` | Partial Firestore `updateDoc`       |

### Files Changed

| File                             | Change                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `src/components/CanvasBoard.tsx` | New tool type, icon, pointer handlers, selection state, `redrawAll` extension |
| `src/lib/boardSync.ts`           | Added `updateItemInBoard`                                                     |

---

## 🇷🇴 Română

### Ce s-a adăugat

Un **instrument de selecție** cu care utilizatorul poate alege orice element desenat și îl poate muta prin drag-and-drop, fără să fie nevoie să șteargă și să redeseneze.

### Buton în toolbar

Pictograma săgeată (cursor) apare în toolbar între **Shapes** și **Pan**. Se poate activa prin click sau prin tasta `S`.

### Cum funcționează

| Gestică                    | Efect                                                           |
| -------------------------- | --------------------------------------------------------------- |
| Click pe un element        | Îl selectează — apare un dreptunghi albastru punctat            |
| Click pe spațiu gol        | Deselectează                                                    |
| Drag pe elementul selectat | Îl mută în timp real                                            |
| Eliberare                  | Confirmă mutarea în istoricul undo + sincronizează în Firestore |
| `Escape`                   | Deselectează                                                    |
| Schimbare instrument       | Deselectează automat                                            |

### Sincronizare Firestore

La finalul unui drag, `updateItemInBoard()` actualizează câmpurile de coordonate ale elementului în Firestore, iar ceilalți utilizatori colaborativi văd imediat noua poziție.

### Highlight selecție

Dreptunghiul de selecție se desenează în `redrawAll()` cu linie albastră punctată și markere colțuri. Lățimea vizuală este constantă (`1.5 / scale`) indiferent de nivelul de zoom.
