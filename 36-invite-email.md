# 36 — Fix: Invitațiile deschid clientul de email

## Problema

`inviteToBoard()` salva invitația în Firestore dar nu trimitea niciun email. Persoana invitată vedea invitația doar dacă intra în aplicație și era autentificată. Nu exista notificare externă.

## Fix

După ce invitația este salvată în Firestore, se deschide automat clientul de email al utilizatorului (`mailto:`) cu subiect și mesaj pre-compuse, incluzând link-ul tablei:

```ts
const boardUrl = getShareUrl(boardId);
const subject = encodeURIComponent(`Invitație la tabla colaborativă: ${boardTitle}`);
const body = encodeURIComponent(`...${boardUrl}...`);
window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
```

Mesajul de succes s-a schimbat din „Invitație trimisă" în „Invitație salvată! Trimite email-ul care s-a deschis." pentru a fi honest cu utilizatorul.

## De ce mailto și nu un serviciu email

- Nu necesită backend / Cloud Functions
- Nu necesită chei API externe
- Emailul este trimis din contul utilizatorului (mai multă credibilitate pentru destinatar)
- Gratuit, fără limite

## Fișiere modificate

- `src/components/SharePanel.tsx` — `handleInvite()`
