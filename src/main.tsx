import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource/noto-sans-bengali/400.css';
import '@fontsource/noto-sans-bengali/600.css';
import '@fontsource/noto-sans-bengali/700.css';
import './index.css';
import { LangProvider } from './i18n';
import { ToastProvider } from './components/Toast';
import { AppShell, ErrorBoundary } from './components/AppShell';
import { ProgramProvider } from './state/ProgramContext';
import Landing from './pages/Landing';
import NotFound from './pages/NotFound';

const Program = lazy(() => import('./pages/Program'));
const HouseholdPage = lazy(() => import('./pages/Household'));
const Stickers = lazy(() => import('./pages/Stickers'));
const Lab = lazy(() => import('./pages/Lab'));
const Card = lazy(() => import('./pages/Card'));
const Methods = lazy(() => import('./pages/Methods'));

function PageFallback() {
  return <div className="mx-auto max-w-[1200px] px-6 py-16" aria-busy="true"><div className="h-8 w-56 animate-pulse rounded bg-paper-2" /></div>;
}

function ProgramLayout() {
  return <ProgramProvider><Outlet /></ProgramProvider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/card" element={<ErrorBoundary><Card /></ErrorBoundary>} />
              <Route path="/program/stickers" element={<ProgramLayout />}>
                <Route index element={<ErrorBoundary><Stickers /></ErrorBoundary>} />
              </Route>
              <Route element={<AppShell />}>
                <Route index element={<Landing />} />
                <Route path="/program" element={<ProgramLayout />}>
                  <Route index element={<Program />} />
                  <Route path="h/:id" element={<HouseholdPage />} />
                </Route>
                <Route path="/lab" element={<Lab />} />
                <Route path="/methods" element={<Methods />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </LangProvider>
  </StrictMode>,
);
