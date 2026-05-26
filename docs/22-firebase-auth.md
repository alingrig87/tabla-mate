# Commit 22 — Firebase Auth + Google Sign-In

## 🇬🇧 English

### Requirements

Add optional Google authentication:

- Login is **not required** — the app works fully for anonymous users
- A "Login with Google" button appears in the toolbar for unauthenticated users
- Logged-in users see their avatar; clicking it opens the Profile page
- Firebase handles the OAuth flow (no custom backend needed)

### What Was Implemented

| File                          | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `src/lib/firebase.ts`         | Firebase app init + exports `auth`, `db`                     |
| `src/context/AuthContext.tsx` | React context that wraps Firebase Auth state                 |
| `src/main.tsx`                | Wrapped `<App>` with `<AuthProvider>`                        |
| `vite.config.ts`              | `manualChunks` splits Firebase into a separate cached bundle |
| `.env.local`                  | All 6 `VITE_FIREBASE_*` variables (gitignored)               |

### Key Concepts

#### Firebase project setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add a Web app → copy the config object
3. Enable Authentication → Google provider
4. Add your domain (e.g. `tablamate.ro`) to **Authorized domains**

#### Environment variables

Vite exposes variables prefixed with `VITE_` to the browser bundle.
Variables without the prefix are server-only and NOT available in the browser.

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Local: stored in `.env.local` (gitignored — never commit secrets).
Production: set via Vercel dashboard → Project → Settings → Environment Variables.

#### AuthContext pattern

Firebase's `onAuthStateChanged` is asynchronous — the user state is `null` before
Firebase resolves whether someone is logged in. The `loading` flag prevents flickering:

```typescript
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  return onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false); // only now is auth state known
  });
}, []);
```

`onAuthStateChanged` returns its own unsubscribe function — returning it from `useEffect`
means React will unsubscribe when the component unmounts (no memory leak).

#### `signInWithPopup`

Opens a Google OAuth popup. The user authenticates in the popup; Firebase exchanges the
OAuth code for a Firebase ID token automatically. No redirect needed.

```typescript
await signInWithPopup(auth, new GoogleAuthProvider());
```

#### Why no `contacts.readonly` scope

Requesting sensitive OAuth scopes like `contacts.readonly` triggers a **"Google hasn't
verified this app"** warning screen for all users until the app goes through Google's
OAuth app verification process (weeks-long review). Since manual email invite works
without any extra scope, we keep the login scope minimal (profile + email only).

#### Code splitting Firebase

Firebase is ~460 KB (gzip ~109 KB). Splitting it into a named chunk lets browsers cache
it across deployments since Firebase SDK rarely changes:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
      },
    },
  },
},
```

---

## 🇷🇴 Română

### Cerințe

Adăugăm autentificare Google opțională:

- Login **nu este obligatoriu** — aplicația funcționează complet anonim
- Un buton "Login cu Google" apare în toolbar pentru utilizatorii neautentificați
- Utilizatorii autentificați văd avatarul; click pe el deschide pagina de Profil

### Ce s-a implementat

| Fișier                        | Scop                                                  |
| ----------------------------- | ----------------------------------------------------- |
| `src/lib/firebase.ts`         | Inițializare Firebase + exportă `auth`, `db`          |
| `src/context/AuthContext.tsx` | Context React care învelește starea Firebase Auth     |
| `src/main.tsx`                | `<App>` învelit cu `<AuthProvider>`                   |
| `vite.config.ts`              | `manualChunks` separă Firebase într-un bundle propriu |
| `.env.local`                  | Cele 6 variabile `VITE_FIREBASE_*` (gitignored)       |

### Concepte explicate

#### Variabile de mediu în Vite

Vite expune în browser doar variabilele cu prefixul `VITE_`. Cele fără prefix rămân
server-side și nu ajung în bundle. Fișierul `.env.local` este ignorat de git —
**nu commite niciodată chei secrete**.

#### Pattern-ul AuthContext

`onAuthStateChanged` este asincron — starea utilizatorului e `null` până Firebase
rezolvă dacă cineva e logat. Flag-ul `loading` previne flickering-ul:

```typescript
useEffect(() => {
  return onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false);
  });
}, []);
```

Funcția returnată de `onAuthStateChanged` este un unsubscribe — returnând-o din
`useEffect`, React dezabonează automat la unmount (fără memory leak).

#### De ce nu cerem scope-ul contacts

Orice scope OAuth sensibil (ex: `contacts.readonly`) declanșează un ecran de
avertizare Google ("Google hasn't verified this app") pentru toți utilizatorii,
până când treci printr-un proces de verificare a aplicației la Google (poate dura
săptămâni). Invitarea manuală prin email funcționează fără niciun scope extra.

#### Code splitting Firebase

Firebase are ~460 KB. Separând-l într-un chunk propriu, browserul îl poate cache-ui
între deploy-uri (SDK-ul Firebase se schimbă rar față de codul aplicației).
