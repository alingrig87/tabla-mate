/**
 * boardSync.ts — Firestore real-time sync for collaborative boards.
 *
 * Data model:
 *   boards/{boardId}               — board metadata (createdBy, title, createdAt)
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
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';

// ─── Item sync ────────────────────────────────────────────────────────────────

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
  onUpdate: (items: RemoteItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'boards', boardId, 'items'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      const items: RemoteItem[] = [];
      snap.forEach((d) => {
        // Strip server-only metadata fields before passing to the canvas
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { createdAt: _ts, ...rest } = d.data();
        items.push({ id: d.id, ...rest } as RemoteItem);
      });
      onUpdate(items);
    },
    (err) => {
      console.error('[boardSync] onSnapshot error:', err);
      onError?.(err);
    }
  );
}

// Write a single DrawItem to Firestore.
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

// Delete a single item from Firestore (no-op if doc doesn't exist).
export async function removeItemFromBoard(boardId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'boards', boardId, 'items', itemId));
}

// Partially update a single item in Firestore (used to sync a moved item).
export async function updateItemInBoard(
  boardId: string,
  itemId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId, 'items', itemId), data);
}

// ─── Board CRUD ───────────────────────────────────────────────────────────────

export interface BoardMeta {
  id: string;
  title: string;
  createdAt: Date;
  createdBy: string;
}

// Create the board metadata document.
export async function createBoard(
  boardId: string,
  createdBy: string,
  title: string
): Promise<void> {
  await setDoc(doc(db, 'boards', boardId), { createdBy, title, createdAt: serverTimestamp() });
}

// Rename a board (only the owner should call this).
export async function updateBoardTitle(boardId: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), { title });
}

// Fetch all boards created by a specific user, sorted newest first.
// Uses a single-field where() so no composite index is needed.
export async function getBoardsByUser(userId: string): Promise<BoardMeta[]> {
  const q = query(collection(db, 'boards'), where('createdBy', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({
      id: d.id,
      title: (d.data().title as string) || `Tablă ${d.id}`,
      createdAt: (d.data().createdAt?.toDate() as Date) ?? new Date(),
      createdBy: d.data().createdBy as string,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Fetch title + metadata for a single board (returns null if board doesn't exist).
export async function getBoardMeta(boardId: string): Promise<BoardMeta | null> {
  const snap = await getDoc(doc(db, 'boards', boardId));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    title: (snap.data().title as string) || `Tablă ${snap.id}`,
    createdAt: (snap.data().createdAt?.toDate() as Date) ?? new Date(),
    createdBy: snap.data().createdBy as string,
  };
}

// Delete a board and ALL its items (Firestore doesn't cascade deletes).
export async function deleteBoard(boardId: string): Promise<void> {
  const itemsSnap = await getDocs(collection(db, 'boards', boardId, 'items'));
  const batch = writeBatch(db);
  itemsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'boards', boardId));
  await batch.commit();
}
