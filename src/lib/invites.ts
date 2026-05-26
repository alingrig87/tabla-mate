/**
 * invites.ts — Firestore invite CRUD for collaborative boards.
 *
 * Data model:
 *   invites/{inviteId}
 *     boardId        — the board being shared
 *     boardTitle     — human-readable name (denormalised for inbox display)
 *     inviteeEmail   — lowercase email of the invited person
 *     invitedByUid   — Firebase UID of the inviter
 *     invitedByName  — display name of the inviter (denormalised)
 *     invitedAt      — server timestamp
 *
 * Queries use single-field where() so no composite index is needed.
 */

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

export interface InviteRecord {
  id: string;
  boardId: string;
  boardTitle: string;
  inviteeEmail: string;
  invitedByUid: string;
  invitedByName: string;
  invitedAt: Date;
}

// Invite someone to a board. Idempotent: same boardId+email overwrites.
export async function inviteToBoard(
  boardId: string,
  boardTitle: string,
  inviteeEmail: string,
  invitedByUid: string,
  invitedByName: string
): Promise<void> {
  // Use deterministic doc id so re-inviting the same person is idempotent.
  const inviteId = `${boardId}_${inviteeEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  await setDoc(doc(db, 'invites', inviteId), {
    boardId,
    boardTitle,
    inviteeEmail: inviteeEmail.toLowerCase(),
    invitedByUid,
    invitedByName,
    invitedAt: serverTimestamp(),
  });
}

// Fetch all pending invites for a given email address (the inbox).
export async function getInvitesForUser(email: string): Promise<InviteRecord[]> {
  const q = query(collection(db, 'invites'), where('inviteeEmail', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    boardId: d.data().boardId as string,
    boardTitle: (d.data().boardTitle as string) || `Tablă ${d.data().boardId as string}`,
    inviteeEmail: d.data().inviteeEmail as string,
    invitedByUid: d.data().invitedByUid as string,
    invitedByName: (d.data().invitedByName as string) || 'Cineva',
    invitedAt: (d.data().invitedAt?.toDate() as Date) ?? new Date(),
  }));
}

// Fetch all invites sent for a specific board.
export async function getInvitesForBoard(boardId: string): Promise<InviteRecord[]> {
  const q = query(collection(db, 'invites'), where('boardId', '==', boardId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({
      id: d.id,
      boardId: d.data().boardId as string,
      boardTitle: (d.data().boardTitle as string) || `Tablă ${d.data().boardId as string}`,
      inviteeEmail: d.data().inviteeEmail as string,
      invitedByUid: d.data().invitedByUid as string,
      invitedByName: (d.data().invitedByName as string) || 'Cineva',
      invitedAt: (d.data().invitedAt?.toDate() as Date) ?? new Date(),
    }))
    .sort((a, b) => b.invitedAt.getTime() - a.invitedAt.getTime());
}

// Remove an invite (dismiss from inbox or revoke).
export async function removeInvite(inviteId: string): Promise<void> {
  await deleteDoc(doc(db, 'invites', inviteId));
}
