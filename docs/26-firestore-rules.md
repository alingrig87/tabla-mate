# Commit 26 — Firestore Security Rules

## 🇬🇧 English

### Problem

Two symptoms pointed to the same root cause:

1. **Boards not saving** — boards created from ProfilePage appeared locally but
   were not retrievable after a page reload (content lost, board absent from list).
2. **Collaborative mode broken** — users with a shared link could not draw;
   their strokes were silently rejected.

Root cause: **Firestore security rules were too restrictive** (default test-mode
rules expire after 30 days, after which all reads and writes are denied).

### What Was Implemented

| File              | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `firestore.rules` | Firestore security rules for the app           |
| `firebase.json`   | Firebase CLI config pointing to the rules file |

### The Rules

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Board items — anyone can read/write (collaborative, no login required)
    match /boards/{boardId}/items/{itemId} {
      allow read, write: if true;
    }

    // Board metadata — anyone can read/create; only auth users can update/delete
    match /boards/{boardId} {
      allow read:   if true;
      allow create: if true;
      allow update: if request.auth != null;
      allow delete: if request.auth != null
                    && resource.data.createdBy == request.auth.uid;
    }

    // Invites — authenticated users only
    match /invites/{inviteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Rule Design Decisions

#### `boards/.../items` — `allow write: if true`

Collaborative drawing is intentionally open: anyone who has the board URL can
draw. This is a core feature, not a bug. No authentication is required.

#### `boards/{boardId}` — split create / update / delete

- **create: if true** — anonymous users can create boards (the share button
  in the toolbar works without login).
- **update: if auth** — only authenticated users can rename a board.
- **delete: if auth && createdBy == uid** — only the owner can delete.

#### `invites` — authenticated only

Invites contain email addresses and board titles. Only logged-in users should
be able to read or send invitations.

### How to Deploy Rules

**Option A — Firebase Console (no CLI needed):**

1. Go to [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/tabla-mate-be1c7/firestore/rules)
2. Paste the content of `firestore.rules`
3. Click **Publish**

**Option B — Firebase CLI:**

```bash
firebase login
firebase use tabla-mate-be1c7
firebase deploy --only firestore:rules
```

### Why Rules Expire in Test Mode

When a new Firestore database is created, Firebase offers two modes:

- **Test mode** — `allow read, write: if request.time < timestamp.date(YYYY, MM, DD)`
  (auto-expires after 30 days — intended for prototyping only)
- **Production mode** — `allow read, write: if false` (deny everything until
  you write real rules)

Test mode is convenient to start with but **must be replaced** before going live.
The rules in this commit are the production rules for tabla-mate.

---

## 🇷🇴 Română

### Problema

Două simptome, aceeași cauză:

1. **Tablele nu se salvau** — tablele create din ProfilePage existau local dar
   dispăreau la reload (conținut pierdut, tabla absentă din listă).
2. **Modul colaborativ nu funcționa** — utilizatorii cu link-ul nu puteau desena;
   scrierile lor erau respinse silențios de Firestore.

Cauza: **regulile de securitate Firestore erau prea restrictive** — regulile
test-mode expiră după 30 de zile, după care toate citirile și scrierile sunt
blocate.

### Ce s-a implementat

| Fișier            | Scop                                                     |
| ----------------- | -------------------------------------------------------- |
| `firestore.rules` | Regulile de securitate Firestore pentru aplicație        |
| `firebase.json`   | Configurație Firebase CLI care indică fișierul de reguli |

### Decizii de design

#### `boards/.../items` — `allow write: if true`

Desenarea colaborativă este intenționat deschisă: oricine are URL-ul tablei poate
desena, fără login. Aceasta este o funcționalitate de bază, nu un bug.

#### `boards/{boardId}` — creare / actualizare / ștergere separate

- **create: if true** — utilizatorii anonimi pot crea table (butonul 🔗 din toolbar
  funcționează fără cont).
- **update: if auth** — doar utilizatorii autentificați pot redenumi o tablă.
- **delete: if auth && createdBy == uid** — doar proprietarul poate șterge.

#### `invites` — doar autentificați

Invitațiile conțin adrese email. Doar utilizatorii logați pot trimite sau citi invitații.

### De ce expiră regulile în test mode

La crearea unui proiect Firestore, Firebase oferă două moduri:

- **Test mode** — permite toate read/write pentru 30 de zile (pentru prototipuri)
- **Production mode** — blochează totul (trebuie scrise reguli manuale)

Test mode este convenabil la început, dar **trebuie înlocuit** înainte de lansare.
Regulile din acest commit sunt regulile de producție pentru tabla-mate.

### Cum se deploy-uiesc regulile

**Varianta A — Firebase Console (fără CLI):**

1. Firebase Console → Firestore → Rules
2. Lipești conținutul din `firestore.rules`
3. Click **Publish**

**Varianta B — Firebase CLI:**

```bash
firebase login
firebase use tabla-mate-be1c7
firebase deploy --only firestore:rules
```
