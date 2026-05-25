import { useState, Suspense, lazy } from 'react';
import CanvasBoard from './components/CanvasBoard';

// React.lazy: FormulaPage (~284 KB) is loaded on demand, not on initial page load.
// The bundle for CanvasBoard stays small — formulas are only fetched when the user
// navigates to that page.
const FormulaPage = lazy(() => import('./components/FormulaPage'));

// Discriminated union type — all possible page names.
// TypeScript exhaustively checks every branch against this type.
type Page = 'board' | 'formulas';

export default function App(): JSX.Element {
  // useState<Page> acts as a client-side router.
  // No URL changes — purely in-memory navigation.
  const [page, setPage] = useState<Page>('board');

  if (page === 'formulas')
    return (
      // Suspense shows a fallback while the lazy chunk loads.
      // The fallback matches FormulaPage's dark indigo theme so the
      // transition from loading → loaded looks seamless.
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: '#0b0d14',
              color: '#818cf8',
              fontSize: 16,
              gap: 12,
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                border: '2px solid #818cf8',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
            Se încarcă formulele…
          </div>
        }
      >
        <FormulaPage onBack={() => setPage('board')} />
      </Suspense>
    );

  // Default page: the whiteboard canvas
  return <CanvasBoard onOpenFormulas={() => setPage('formulas')} />;
}
