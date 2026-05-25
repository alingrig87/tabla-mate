# Commit 01 — Project Setup: Vite + React + TypeScript

## 🇬🇧 English

### Requirements

We need a modern frontend project that:
- Compiles TypeScript and JSX (React components) to browser-ready JavaScript
- Starts a fast local development server with live reload
- Produces an optimized production bundle
- Has a consistent entry point that works for a Single-Page Application (SPA)

### What Was Implemented

| File | Purpose |
|------|---------|
| `package.json` | Dependency manifest + npm scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `vite.config.ts` | Vite bundler configuration |
| `index.html` | HTML entry point (Vite's approach) |
| `src/main.tsx` | React bootstrap — mounts `<App />` into the DOM |
| `src/styles/index.css` | Global CSS reset + animation keyframes |
| `.gitignore` | Files that should not be tracked by Git |

### Concepts Explained

#### Vite
Vite is a build tool that uses **ES modules natively in the browser** during development, so it
doesn't need to bundle your code first. This makes the dev server start almost instantly, even in
large projects. For production it uses Rollup under the hood.

Compare with Webpack / Create React App (CRA):
- CRA bundles **everything** before starting the server → slow cold start
- Vite serves files **on demand** → fast cold start, faster HMR (Hot Module Replacement)

```bash
npm run dev     # starts http://localhost:5173 in ~300ms
npm run build   # produces optimized dist/ folder via Rollup
```

#### TypeScript
TypeScript is JavaScript with static types. The compiler checks your code before it runs, catching
bugs like `undefined is not a function` at edit time rather than in production.

Key `tsconfig.json` options used:
```json
"strict": true          // enables all strict checks (null safety, etc.)
"target": "ES2021"      // output JavaScript version (modern browsers)
"moduleResolution": "Bundler"  // tells TS how Vite resolves imports
"jsx": "react-jsx"      // transforms JSX without needing `import React`
"resolveJsonModule": true      // allows `import data from './file.json'`
"noEmit": true          // TS only type-checks; Vite handles the actual compile
```

#### React 18 — `createRoot`
React 18 introduced a new root API:
```typescript
// Old (React 17):
ReactDOM.render(<App />, document.getElementById('root'));

// New (React 18):
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```
`createRoot` enables **concurrent features** (like `Suspense`, `useTransition`) introduced in
React 18. The `!` at the end is a TypeScript non-null assertion — we know the element exists.

#### `React.StrictMode`
StrictMode renders each component **twice** in development (not in production) to help detect
side effects. It warns about deprecated APIs and helps you find bugs early. It has **zero cost**
in production.

#### `index.html` as entry point
Vite treats `index.html` as the application entry, not a config file. The script tag
`<script type="module" src="/src/main.tsx">` tells the browser to load the app as an ES module.
This is different from Webpack/CRA where `index.html` is a template.

#### CSS Reset — `box-sizing: border-box`
By default, CSS `width` does **not** include padding and border. With `border-box`, width
**does** include them — much more predictable for layouts:
```css
/* without border-box: a 200px div with 20px padding → 240px total */
/* with border-box:    a 200px div with 20px padding → 200px total */
*, *::before, *::after { box-sizing: border-box; }
```

#### `overflow: hidden` on root
The app is a full-screen whiteboard. `overflow: hidden` prevents scroll bars from appearing when
canvas content extends beyond the viewport.

---

## 🇷🇴 Română

### Cerințe

Avem nevoie de un proiect frontend modern care:
- Compilează TypeScript și JSX (componente React) în JavaScript compatibil cu browserul
- Pornește un server de dezvoltare rapid cu reîncărcare automată
- Produce un bundle optimizat pentru producție
- Are un punct de intrare consistent pentru o aplicație Single-Page (SPA)

### Ce s-a implementat

| Fișier | Scop |
|--------|------|
| `package.json` | Lista dependențelor + comenzi npm |
| `tsconfig.json` | Configurația compilatorului TypeScript |
| `vite.config.ts` | Configurația bundler-ului Vite |
| `index.html` | Punctul de intrare HTML (abordarea Vite) |
| `src/main.tsx` | Bootstrap React — montează `<App />` în DOM |
| `src/styles/index.css` | Reset CSS global + keyframes animații |
| `.gitignore` | Fișiere care nu trebuie urmărite de Git |

### Concepte explicate

#### Vite
Vite este un instrument de build care folosește **module ES native în browser** în timpul
dezvoltării, deci nu trebuie să bundleze codul mai întâi. Serverul de dezvoltare pornește aproape
instant, chiar și în proiecte mari.

Comparație cu Webpack / Create React App (CRA):
- CRA bundlează **totul** înainte să pornească serverul → pornire lentă
- Vite servește fișierele **la cerere** → pornire rapidă, HMR rapid

#### TypeScript
TypeScript este JavaScript cu tipuri statice. Compilatorul verifică codul tău înainte să ruleze,
prindând bug-uri de tipul `undefined is not a function` la editare, nu în producție.

Opțiuni cheie din `tsconfig.json`:
```json
"strict": true          // activează toate verificările stricte (null safety, etc.)
"target": "ES2021"      // versiunea JavaScript output (browsere moderne)
"jsx": "react-jsx"      // transformă JSX fără a necesita `import React`
"resolveJsonModule": true  // permite `import data from './file.json'`
```

#### React 18 — `createRoot`
React 18 a introdus un nou API pentru root:
```typescript
// Vechi (React 17):
ReactDOM.render(<App />, document.getElementById('root'));

// Nou (React 18):
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```
`createRoot` activează **funcțiile concurente** (Suspense, useTransition) din React 18.

#### `React.StrictMode`
StrictMode randează fiecare componentă de **două ori** în development (nu în producție) pentru a
detecta efecte secundare. Nu are costuri în producție — este eliminat complet.

#### Reset CSS — `box-sizing: border-box`
Implicit, `width` în CSS **nu include** padding și border. Cu `border-box`, `width` le include:
```css
/* fără border-box: un div de 200px cu padding 20px → 240px total */
/* cu border-box:   un div de 200px cu padding 20px → 200px total */
```
Mult mai predictibil pentru layout-uri complexe.
