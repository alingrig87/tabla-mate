/**
 * boardSync.ts — Firestore real-time sync for collaborative boards.
 *
 * Data model:
 *   boards/{boardId}               — board metadata (createdBy, createdAt)
 *   boards/{boardId}/items/{id}    — one DrawItem per document
 *
 * Each item document stores the DrawItem fields plus:
 *   authorId   — uid of the user who drew it (or 'anon')
 *   createdAt  — server timestamp for ordering
 *
 * Image/PDF items (kind:'image') are intentionally NOT synced because their
 * base64 dataURL can easily exceed Firestore's 1 MB per-document limit.
 * They stay local-only when in collaborative mode.
 */

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

// A Firestore item as returned by the listener.
// Contains all DrawItem fields plus the Firestore document id and authorId.
export interface RemoteItem {
  id: string;
  authorId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Subscribe to real-time item changes for a board.
// Items are ordered by server timestamp (insertion order).
export function subscribeToBoardItems(
  boardId: string,
  onUpdate: (items: RemoteItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'boards', boardId, 'items'), orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snap) => {
    const items: RemoteItem[] = [];
    snap.forEach((d) => {
      // Strip server-only metadata fields before passing to the canvas
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt: _ts, ...rest } = d.data();
      items.push({ id: d.id, ...rest } as RemoteItem);
    });
    onUpdate(items);
  });
}

// Write a single DrawItem to Firestore.
// The item must already have an `id` (used as the Firestore document id).
export async function addItemToBoard(
  boardId: string,
  itemId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
  authorId: string
): Promise<void> {
  const ref = doc(db, 'boards', boardId, 'items', itemId);
  await setDoc(ref, { ...data, authorId, createdAt: serverTimestamp() });
}

// Delete a single item from Firestore.
// deleteDoc on a non-existent doc is silently ignored.
export async function removeItemFromBoard(boardId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'boards', boardId, 'items', itemId));
}

// Create the board metadata document.
export async function createBoard(boardId: string, createdBy: string): Promise<void> {
  const ref = doc(db, 'boards', boardId);
  await setDoc(ref, { createdBy, createdAt: serverTimestamp() });
}
