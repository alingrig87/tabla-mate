# Commit 02 — Code Quality Tooling: ESLint, Prettier, Husky, Commitlint

## 🇬🇧 English

### Requirements

A professional codebase needs automated tools that:
- Catch programming errors and bad patterns before they reach production (ESLint)
- Keep code style consistent regardless of who writes it or which editor they use (Prettier)
- Enforce these checks automatically before every commit (Husky + lint-staged)
- Ensure every commit message follows a standard format that enables changelogs (Commitlint)

### What Was Implemented

| File | Tool | Purpose |
|------|------|---------|
| `.eslintrc.cjs` | ESLint | Static code analysis — catches bugs and bad patterns |
| `.prettierrc` | Prettier | Code formatter — consistent style |
| `.editorconfig` | EditorConfig | Cross-editor settings (indent, line endings) |
| `commitlint.config.cjs` | Commitlint | Validates commit message format |
| `.husky/pre-commit` | Husky | Runs `lint-staged` before each commit |
| `.husky/commit-msg` | Husky | Runs `commitlint` to validate commit message |

### Concepts Explained

#### ESLint — Static Analysis
ESLint reads your code as a syntax tree (AST) and applies rules to detect problems **before
runtime**. The config in `.eslintrc.cjs`:

```javascript
extends: [
  'eslint:recommended',            // Core JS rules (no-unused-vars, no-undef, etc.)
  'plugin:react/recommended',      // React-specific rules (hooks, JSX)
  'plugin:react-hooks/recommended',// Warns if hooks rules are violated
  'plugin:@typescript-eslint/recommended', // TypeScript-specific rules
  'prettier',                      // Disables style rules that conflict with Prettier
]
```

The `'prettier'` extension at the end disables all ESLint formatting rules, so ESLint handles
**logic errors** and Prettier handles **formatting** — they don't step on each other.

`'react/react-in-jsx-scope': 'off'` — React 17+ no longer requires `import React` in every
file (the new JSX transform handles it automatically). This rule is turned off to match.

#### Prettier — Code Formatter
Prettier reformats code to a consistent style. Unlike ESLint, it doesn't care about logic —
only about formatting (line length, quotes, commas). Key `.prettierrc` options:

```json
"printWidth": 100     // wrap lines at 100 characters
"singleQuote": true   // 'single quotes' instead of "double quotes"
"trailingComma": "es2" // trailing comma in arrays/objects (safer git diffs)
"arrowParens": "always" // always: (x) => x  instead of x => x
```

**Formatter vs Linter:**
- ESLint: "this code has a bug / bad pattern" → you fix it
- Prettier: "this code isn't formatted consistently" → it fixes it automatically

#### Husky — Git Hooks
Git hooks are scripts that run at specific points in the git workflow. Husky makes it easy to
manage them in your repo without manual `chmod` commands.

```
git commit  →  pre-commit hook runs  →  if it fails, commit is aborted
            →  commit-msg hook runs  →  if it fails, commit is aborted
            →  commit succeeds
```

`.husky/pre-commit` runs `lint-staged` which only lints **staged files** (faster than linting
everything):
```sh
npx lint-staged
```

`.husky/commit-msg` runs `commitlint` to validate the commit message:
```sh
npx --no -- commitlint --edit "$1"
# $1 is the path to the file containing the commit message
```

#### lint-staged — Only Lint What Changed
Defined in `package.json`, lint-staged runs tools only on files that are **staged for commit**:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.json":     ["prettier --write"],
  "*.md":       ["prettier --write"]
}
```

This means: if you only changed one TypeScript file, only that file gets linted — not the
entire codebase. Much faster.

#### Commitlint — Conventional Commits
Commitlint enforces the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(<scope>): <description>

Examples:
feat: add PDF import  
fix: correct text tool position after zoom
chore: update dependencies
docs: add API documentation
refactor: extract shape drawing helpers
```

**Types:** `feat` (new feature), `fix` (bug fix), `chore` (tooling/maintenance), `docs`
(documentation), `refactor` (code change without feature/fix), `test` (tests), `style` (formatting).

Why this matters:
- Enables automatic **changelog generation** (`npm run release`)
- Makes `git log` readable and searchable
- Communicates intent clearly to teammates and future-you
- Required by many companies as a standard

#### `.editorconfig` — Cross-Editor Consistency
EditorConfig is understood by VS Code, IntelliJ, Vim, Emacs, Sublime, and more. It ensures
everyone on the team uses the same indentation and line endings:

```ini
indent_style = space   # spaces, not tabs
indent_size = 2        # 2 spaces per indent level
end_of_line = lf       # Unix line endings (LF), not Windows (CRLF)
charset = utf-8        # always UTF-8
```

Why LF (Unix) line endings? Windows uses CRLF (`\r\n`) but most servers run Linux (LF `\n`).
Using LF everywhere avoids `git diff` showing every line changed when a Windows dev commits.

---

## 🇷🇴 Română

### Cerințe

Un codebase profesional are nevoie de instrumente automate care:
- Prind erorile de programare înainte să ajungă în producție (ESLint)
- Mențin stilul de cod consistent indiferent cine îl scrie (Prettier)
- Aplică aceste verificări automat înainte de fiecare commit (Husky + lint-staged)
- Se asigură că mesajele de commit urmează un format standard (Commitlint)

### Ce s-a implementat

| Fișier | Instrument | Scop |
|--------|------------|------|
| `.eslintrc.cjs` | ESLint | Analiză statică — prinde bug-uri și pattern-uri proaste |
| `.prettierrc` | Prettier | Formatare cod — stil consistent |
| `.editorconfig` | EditorConfig | Setări cross-editor (indent, line endings) |
| `commitlint.config.cjs` | Commitlint | Validează formatul mesajului de commit |
| `.husky/pre-commit` | Husky | Rulează `lint-staged` înainte de fiecare commit |
| `.husky/commit-msg` | Husky | Rulează `commitlint` pentru validarea mesajului |

### Concepte explicate

#### ESLint — Analiză statică
ESLint citește codul tău ca un arbore de sintaxă (AST) și aplică reguli pentru a detecta
probleme **înainte de runtime**. De exemplu, detectează variabile neutilizate, hook-uri React
folosite greșit, sau cod TypeScript nesigur.

Diferența față de Prettier: ESLint se ocupă de **erori logice**, Prettier de **formatare**.
Extensia `'prettier'` dezactivează regulile de stil din ESLint pentru a evita conflicte.

#### Prettier — Formator de cod
Prettier reformatează automat codul la un stil consistent. Nu se uită la logică — doar la
aspect (lungimea liniei, ghilimele, virgule). Configurăm: `printWidth: 100`, `singleQuote: true`,
`trailingComma: "es5"` (virgulă finală în array-uri/obiecte — diff-uri git mai curate).

**Formator vs Linter:**
- ESLint: "codul are un bug / pattern rău" → tu îl repari
- Prettier: "codul nu e formatat consistent" → îl repară automat

#### Husky — Git Hooks
Git hooks sunt scripturi ce rulează în momente specifice din fluxul git. Husky le gestionează
ușor în repo:

```
git commit  →  pre-commit rulează  →  dacă eșuează, commit-ul se anulează
            →  commit-msg rulează  →  dacă eșuează, commit-ul se anulează
            →  commit reușit
```

#### Conventional Commits
Commitlint impune specificația Conventional Commits:

```
feat: adaugă import PDF
fix: corectează poziția tool-ului text după zoom
chore: actualizează dependențele
```

Tipuri: `feat` (funcție nouă), `fix` (rezolvare bug), `chore` (mentenanță), `docs`
(documentație), `refactor` (restructurare cod).

De ce contează: permite generarea automată de changelog-uri, face `git log` lizibil, și este
cerut ca standard în multe companii.

#### `.editorconfig` — Consistență cross-editor
EditorConfig este înțeles de VS Code, IntelliJ, Vim, Emacs și altele. Asigură că toată
echipa folosește același indenting și același tip de line ending.

De ce LF (Unix)? Windows folosește CRLF (`\r\n`) dar majoritatea serverelor rulează Linux (LF).
Folosind LF peste tot evităm ca `git diff` să arate că s-a schimbat fiecare linie când un
developer Windows face commit.
