import { useState, Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import CanvasBoard from './components/CanvasBoard';

// React.lazy: heavy pages are loaded on demand, not on initial page load.
// Each becomes a separate chunk in the build output.
const FormulaPage = lazy(() => import('./components/FormulaPage'));
const SubiectePage = lazy(() => import('./components/SubiectePage'));
const TestGenerator = lazy(() => import('./components/TestGenerator'));

// Discriminated union type — all possible page names.
// TypeScript exhaustively checks every branch against this type.
type Page = 'board' | 'formulas' | 'subiecte' | 'test';

// Generic Suspense wrapper — reused for all lazy pages.
// The fallback has a dark background to match all page themes.
function PageLoader({ children }: { children: ReactNode }) {
  return (
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
          Se încarcă…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App(): JSX.Element {
  // useState<Page> acts as a client-side router.
  // No URL changes — purely in-memory navigation.
  const [page, setPage] = useState<Page>('board');

  if (page === 'formulas')
    return (
      <PageLoader>
        <FormulaPage onBack={() => setPage('board')} />
      </PageLoader>
    );

  if (page === 'subiecte')
    return (
      <PageLoader>
        <SubiectePage onBack={() => setPage('board')} onOpenTest={() => setPage('test')} />
      </PageLoader>
    );

  if (page === 'test')
    return (
      <PageLoader>
        <TestGenerator onBack={() => setPage('subiecte')} />
      </PageLoader>
    );

  // Default page: the whiteboard canvas
  return (
    <CanvasBoard
      onOpenFormulas={() => setPage('formulas')}
      onOpenSubiecte={() => setPage('subiecte')}
    />
  );
}
