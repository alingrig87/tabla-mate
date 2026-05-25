# Commit 18 — Exam Problems Image Database

## 🇬🇧 English

### Requirements

The test generator (commit 19) and problems gallery (commit 20) need a catalogue of
individual exam problems:

- Each problem is stored as a **cropped PNG image** of the problem text
- A **JSON metadata file** describes every problem: year, variant, section, problem number, type
- The data must support filtering by year, section, and variant
- Problem images must be accessible as static URLs (no import() needed)
- 180 problems total: 6 papers × 3 sections × 6 problems each = 108, plus extras

### What Was Added

**`public/problems/problems.json`** — flat array of 180 entries:

```json
[
  {
    "id": "en8_2022_var01_s1_01",
    "imgFile": "en8_2022_var01_s1_01.png",
    "year": 2022,
    "variant": "var01",
    "section": "I",
    "prob_nr": 1,
    "type": "mc"
  },
  ...
]
```

**`public/problems/*.png`** — 180 cropped problem images.

TypeScript type for a single problem entry (used by commits 19 and 20):

```typescript
interface Problem {
  id: string; // unique key — matches filename without extension
  imgFile: string; // just the filename, e.g. "en8_2022_var01_s1_01.png"
  year: number; // 2022 | 2023 | 2024 | 2025
  variant: string; // "var01" | "var02" | "var05" | "var07" | "model" | "simulare"
  section: string; // "I" | "II" | "III"
  prob_nr: number; // 1–6
  type: string; // "mc" (multiple choice) | "open" (open-ended)
}
```

Fetching at runtime (used by both consumer components):

```typescript
const problems: Problem[] = await fetch('/problems/problems.json').then((r) => r.json());
// or at build time:
import PROBLEMS from '../../public/problems/problems.json';
```

---

### Concepts Explained

#### JSON as a flat database

`problems.json` is an array of 180 plain objects. It acts as an in-browser database:

```typescript
// "Query" by year and section — pure array operations
const pool = PROBLEMS.filter((p) => p.year === 2024 && p.section === 'I');

// Group by variant
const byVariant = new Map<string, Problem[]>();
PROBLEMS.forEach((p) => {
  const list = byVariant.get(p.variant) ?? [];
  list.push(p);
  byVariant.set(p.variant, list);
});
```

**Trade-offs vs a real database (SQLite, PostgreSQL):**

| Feature          | JSON flat file            | SQLite / server DB          |
| ---------------- | ------------------------- | --------------------------- |
| Setup            | Zero — just a file        | Requires server or bundling |
| Query language   | JS array methods          | SQL                         |
| Joins / indexing | Manual                    | Built-in                    |
| Write operations | Not supported (read-only) | Full CRUD                   |
| Bundle size      | ~14 KB (180 records)      | SQLite WASM: ~800 KB        |
| Use case         | Static data, client-only  | Dynamic data, multi-user    |

For this app — 180 static records, read-only, single user — a JSON file is the right
tool. No server required.

#### File naming convention — encoding metadata in filenames

```
en8_2024_var02_s1_03.png
│    │      │     │   │
│    │      │     │   └── problem number (01–06)
│    │      │     └────── section (s1/s2/s3 → I/II/III)
│    │      └──────────── variant (var01, var02, model, simulare…)
│    └─────────────────── year (2022–2025)
└──────────────────────── exam type (EN VIII)
```

The filename is the unique ID of each problem. This pattern serves two purposes:

1. **Sorting**: alphabetical sort of filenames produces the correct logical order
   (year → variant → section → problem number)
2. **Self-documentation**: reading the filename reveals the full context of the problem
   without looking up the JSON

The JSON `imgFile` field stores only the filename, not the full path. The full URL is
assembled at use time: `/problems/${p.imgFile}`.

#### PNG vs JPEG for text images

Problem images contain mathematical text, diagrams with thin lines, and printed
characters. For this type of content:

| Property      | PNG (lossless)              | JPEG (lossy)                         |
| ------------- | --------------------------- | ------------------------------------ |
| Compression   | ~3× smaller than BMP        | ~10× smaller than BMP                |
| Artifacts     | None — pixel-perfect        | Blurry text at edges (DCT artifacts) |
| Best for      | Screenshots, text, line art | Photos, gradients                    |
| Alpha channel | ✓ transparency supported    | ✗ no transparency                    |

JPEG compression works by discarding high-frequency details. Mathematical notation
has many sharp black/white transitions — exactly what JPEG degrades. PNG preserves
every pixel, keeping text crisp and readable.

#### Static asset serving — `public/` directory

```
public/problems/en8_2024_var02_s1_03.png
→ accessible at: http://localhost:5173/problems/en8_2024_var02_s1_03.png
→ in build:       https://example.com/problems/en8_2024_var02_s1_03.png
```

Vite serves everything in `public/` at the root path. In `npm run build`, the entire
`public/` directory is copied verbatim to `dist/`. No transformation, no hashing.

Files in `public/` are **not** imported — they're referenced by URL strings. This is
intentional: 180 images imported via `import img from '...'` would be processed by
Vite's asset pipeline (hashed, potentially inlined as base64), adding 180 separate
module entries to the bundle. URL strings bypass the pipeline entirely.

#### `resolveJsonModule` — importing JSON as TypeScript

```typescript
// tsconfig.json
{ "compilerOptions": { "resolveJsonModule": true } }

// Usage
import PROBLEMS from '../../public/problems/problems.json';
// PROBLEMS is typed as the inferred shape of the JSON
```

With `resolveJsonModule: true`, TypeScript can `import` a `.json` file directly. The
type is inferred from the JSON structure — no manual type declaration needed. Vite
bundles the JSON into the JavaScript chunk that imports it.

**When to import vs fetch:**

- `import` at build time → JSON bundled with JS, instant access, increases bundle size
- `fetch()` at runtime → network request, async, keeps main bundle small

For 180 records (~14 KB), importing at build time is acceptable. If the database grew
to thousands of records, switching to `fetch` (with a loading state) would be better.

---

## 🇷🇴 Română

### Cerințe

Generatorul de teste (commit 19) și galeria de probleme (commit 20) au nevoie de un
catalog de probleme individuale: imagini PNG și metadata JSON.

### Ce s-a adăugat

**`public/problems/problems.json`** — 180 intrări:

```json
{
  "id": "en8_2022_var01_s1_01",
  "imgFile": "en8_2022_var01_s1_01.png",
  "year": 2022,
  "variant": "var01",
  "section": "I",
  "prob_nr": 1,
  "type": "mc"
}
```

**`public/problems/*.png`** — 180 imagini PNG cu problemele decupate.

### Concepte explicate

#### JSON ca bază de date flat

Array JSON de 180 obiecte = bază de date client-side, zero setup.
Filtrare și grupare cu metode array JS. Nu necesită server.
Potrivit pentru date statice, read-only, volum mic.

#### Convenție de denumire fișiere — metadate în nume

```
en8_2024_var02_s1_03.png
│    │      │     │   └── numărul problemei
│    │      │     └────── secțiunea
│    │      └──────────── varianta
│    └─────────────────── anul
└──────────────────────── tipul examenului
```

Sortare alfabetică = ordine logică. Numele fișierului e ID-ul unic al problemei.

#### PNG vs JPEG pentru imagini cu text

PNG = lossless → text matematec crisp, fără artefacte de compresie.
JPEG = lossy → text cu tranziții ascuțite devine neclar (artefacte DCT).

#### `public/` — URL-uri stabile

Fișierele din `public/` sunt copiate as-is în `dist/`. Nu sunt importate, sunt
accesate prin URL string (`/problems/filename.png`). 180 `import`-uri ar adăuga
180 intrări în bundle-ul Vite — URL-urile evită acest overhead.

#### `resolveJsonModule` — import JSON în TypeScript

```typescript
import PROBLEMS from '../../public/problems/problems.json';
// Tipul e dedus automat din structura JSON
```

`import` = bundled la build time (instant, mărește bundle-ul).
`fetch()` = la runtime (async, bundle-ul rămâne mic). La 14 KB, importul e acceptabil.
