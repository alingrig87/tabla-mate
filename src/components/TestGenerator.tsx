import { useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import problemsData from '../../public/problems/problems.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Problem {
  id: string;
  imgFile: string;
  year: number;
  variant: string;
  section: 'I' | 'II' | 'III';
  prob_nr: number;
  type: 'mc' | 'open';
}

// Cast JSON import — TypeScript infers the JSON type but we want the stricter
// Problem interface (section as 'I'|'II'|'III' instead of string, etc.)
const ALL: Problem[] = problemsData as Problem[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fisher-Yates shuffle — unbiased, O(n).
// naive sort(() => Math.random() - 0.5) is biased because comparison-based
// sorts call the comparator fewer times than n! permutations require.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]; // copy — never mutate the input
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; // ES6 destructuring swap
  }
  return a;
}

// Pick n random items from arr (or all of them if n > arr.length)
function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

const SECTION_LABELS: Record<string, string> = {
  I: 'Subiectul I',
  II: 'Subiectul al II-lea',
  III: 'Subiectul al III-lea',
};

// Deduplicate years from the data — Set removes duplicates, sort gives stable order
const YEARS = [...new Set(ALL.map((p) => p.year))].sort();

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

// Two-screen UI: config → test
type Mode = 'config' | 'test';

export default function TestGenerator({ onBack }: Props): JSX.Element {
  // Year filter — starts with all years selected
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set(YEARS));
  // How many problems to pick per section
  const [counts, setCounts] = useState({ I: 6, II: 6, III: 5 });

  const [mode, setMode] = useState<Mode>('config');
  const [testProblems, setTestProblems] = useState<{ section: string; problems: Problem[] }[]>([]);

  // Filtered pool — recomputed only when selectedYears changes (useMemo)
  const pool = useMemo(() => ALL.filter((p) => selectedYears.has(p.year)), [selectedYears]);

  // Per-section available counts — derived from pool, shown next to each count selector
  const available = useMemo(
    () => ({
      I: pool.filter((p) => p.section === 'I').length,
      II: pool.filter((p) => p.section === 'II').length,
      III: pool.filter((p) => p.section === 'III').length,
    }),
    [pool]
  );

  // Generate test: pick random problems from each section, sort by prob_nr
  const generate = useCallback(() => {
    const sections: { section: string; problems: Problem[] }[] = [];
    for (const sec of ['I', 'II', 'III'] as const) {
      const candidates = pool.filter((p) => p.section === sec);
      const picked = pick(candidates, Math.min(counts[sec], candidates.length));
      picked.sort((a, b) => a.prob_nr - b.prob_nr); // stable visual order
      sections.push({ section: sec, problems: picked });
    }
    setTestProblems(sections);
    setMode('test');
  }, [pool, counts]); // re-created only when pool or counts changes

  // Toggle a year on/off — at least one year must remain selected
  const toggleYear = (y: number) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) {
        if (next.size > 1) next.delete(y); // prevent deselecting all
      } else {
        next.add(y);
      }
      return next;
    });
  };

  // ── Config screen ────────────────────────────────────────────────────────────
  if (mode === 'config') {
    return (
      <div style={s.root}>
        <header style={s.header}>
          <button onClick={onBack} style={s.backBtn}>
            ← Înapoi
          </button>
          <span style={s.title}>🎲 Generator Test Random</span>
        </header>

        <div style={s.configBody}>
          {/* Year filter — multi-select chips */}
          <section style={s.card}>
            <h3 style={s.cardTitle}>Ani de examen</h3>
            <div style={s.yearGrid}>
              {YEARS.map((y) => (
                <button
                  key={y}
                  style={{
                    ...s.yearChip,
                    ...(selectedYears.has(y) ? s.yearChipOn : s.yearChipOff),
                  }}
                  onClick={() => toggleYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </section>

          {/* Per-section count selector */}
          <section style={s.card}>
            <h3 style={s.cardTitle}>Număr de probleme per secțiune</h3>
            <div style={s.countsGrid}>
              {(['I', 'II', 'III'] as const).map((sec) => (
                <div key={sec} style={s.countRow}>
                  <span style={s.countLabel}>{SECTION_LABELS[sec]}</span>
                  <div style={s.countBtns}>
                    {[1, 2, 3, 4, 5, 6]
                      .filter((n) => sec !== 'III' || n <= 5) // S.III has max 5 problems
                      .map((n) => (
                        <button
                          key={n}
                          style={{
                            ...s.countChip,
                            ...(counts[sec] === n ? s.countChipOn : s.countChipOff),
                          }}
                          onClick={() => setCounts((c) => ({ ...c, [sec]: n }))}
                          disabled={n > available[sec]} // can't request more than available
                          title={n > available[sec] ? `Doar ${available[sec]} disponibile` : ''}
                        >
                          {n}
                        </button>
                      ))}
                  </div>
                  <span style={s.availLabel}>{available[sec]} disponibile</span>
                </div>
              ))}
            </div>
          </section>

          {/* Generate CTA */}
          <button style={s.generateBtn} onClick={generate}>
            🎲 Generează Test
          </button>

          <p style={s.hint}>
            Se vor alege aleator {counts.I + counts.II + counts.III} probleme din {pool.length}{' '}
            disponibile ({[...selectedYears].sort().join(', ')}).
          </p>
        </div>
      </div>
    );
  }

  // ── Test screen ──────────────────────────────────────────────────────────────
  const totalProblems = testProblems.reduce((sum, g) => sum + g.problems.length, 0);

  return (
    <div style={s.root}>
      <header style={s.header}>
        <button onClick={() => setMode('config')} style={s.backBtn}>
          ← Config
        </button>
        <span style={s.title}>Test Random · {totalProblems} probleme</span>
        <button onClick={generate} style={s.regenBtn}>
          🔀 Regenerează
        </button>
      </header>

      <div style={s.testBody}>
        {testProblems.map(({ section, problems }) => (
          <div key={section} style={s.sectionBlock}>
            {/* Section header — always visible */}
            <div style={s.sectionHeader}>
              <span style={s.sectionTitle}>{SECTION_LABELS[section]}</span>
              <span style={s.sectionMeta}>
                {problems.length} probleme · {section === 'III' ? 'open-end' : 'grilă'}
              </span>
            </div>

            {/* Problems — collapsible cards */}
            <div style={s.problemsGrid}>
              {problems.map((prob) => (
                <ProblemCard key={prob.id} prob={prob} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ProblemCard ──────────────────────────────────────────────────────────────
// Each problem is collapsed by default — click to expand and see the image.
// loading="lazy" defers image loading until the card is in the viewport.

function ProblemCard({ prob }: { prob: Problem }) {
  const [open, setOpen] = useState(false);
  const meta = `${prob.year} · Var. ${prob.variant} · S.${prob.section} nr.${prob.prob_nr}`;

  return (
    <div style={{ ...pc.card, ...(open ? pc.cardOpen : {}) }}>
      {/* Toggle button shows metadata and expand/collapse chevron */}
      <button style={pc.toggle} onClick={() => setOpen((v) => !v)}>
        <span style={pc.meta}>{meta}</span>
        <span style={pc.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {/* Image is only rendered (and loaded) when the card is open */}
      {open && (
        <div style={pc.imgWrap}>
          <img
            src={`/problems/${prob.imgFile}`}
            alt={meta}
            style={pc.img}
            loading="lazy" // browser defers loading until card enters viewport
          />
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    background: '#0f1117',
    color: '#e2e8f0',
    fontFamily: 'Inter, system-ui, sans-serif',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    background: '#16181f',
    borderBottom: '1px solid #2d3148',
    flexShrink: 0,
  },
  backBtn: {
    background: '#2d3148',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 6,
    padding: '5px 12px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  regenBtn: {
    marginLeft: 'auto',
    background: '#3730a3',
    color: '#c7d2fe',
    border: 'none',
    borderRadius: 8,
    padding: '7px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: 700,
    color: '#7c85ff',
  },
  configBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 'clamp(14px, 4vw, 24px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    alignItems: 'stretch',
    maxWidth: 700,
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    background: '#16181f',
    borderRadius: 12,
    padding: '18px 20px',
    border: '1px solid #2d3148',
  },
  cardTitle: {
    margin: '0 0 14px',
    fontSize: 13,
    fontWeight: 700,
    color: '#7c85ff',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  yearGrid: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  yearChip: {
    padding: '6px 16px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  yearChipOn: { background: '#3730a3', color: '#c7d2fe' },
  yearChipOff: { background: '#252840', color: '#718096' },
  countsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  countRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  countLabel: {
    width: '100%',
    fontSize: 13,
    color: '#a0aec0',
    fontWeight: 600,
  },
  countBtns: {
    display: 'flex',
    gap: 5,
  },
  countChip: {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    transition: 'all 0.15s',
  },
  countChipOn: { background: '#3730a3', color: '#c7d2fe' },
  countChipOff: { background: '#252840', color: '#718096' },
  availLabel: {
    fontSize: 11,
    color: '#4a5568',
    marginLeft: 8,
  },
  generateBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 24px',
    cursor: 'pointer',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 20px rgba(79,70,229,0.4)',
  },
  hint: {
    fontSize: 12,
    color: '#4a5568',
    textAlign: 'center',
    margin: 0,
  },
  testBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionBlock: {
    background: '#16181f',
    borderRadius: 12,
    border: '1px solid #2d3148',
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 18px',
    borderBottom: '1px solid #2d3148',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#c7d2fe',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#4a5568',
    marginLeft: 4,
  },
  problemsGrid: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
};

const pc: Record<string, CSSProperties> = {
  card: {
    background: '#0f1117',
    borderRadius: 8,
    border: '1px solid #2d3148',
    overflow: 'hidden',
  },
  cardOpen: {
    border: '1px solid #4f46e5',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: '10px 14px',
    cursor: 'pointer',
    gap: 8,
  },
  meta: {
    flex: 1,
    textAlign: 'left',
    fontSize: 13,
    color: '#a0aec0',
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
  },
  chevron: {
    color: '#4a5568',
    fontSize: 10,
  },
  imgWrap: {
    padding: '0 12px 12px',
  },
  img: {
    width: '100%',
    borderRadius: 6,
    display: 'block',
    border: '1px solid #e2e8f0',
    background: '#fff',
  },
};
