import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Home from '../pages/Home';
import ProjectDetail from '../pages/ProjectDetail';
import NotFound from '../pages/NotFound';

// three.js / R3F / markdown only load when someone opens /spacehank.
const SpaceHank = lazy(() => import('../features/spacehank'));

const SpaceHankFallback = () => (
  <div className="grid min-h-screen place-items-center bg-ink-0 font-mono text-fine text-bone-dim">Loading workspace…</div>
);

// `:key` accepts a slug (/projects/smart-center) or a legacy numeric id (/projects/1).
const AppRoutes = () => (
  <MainLayout>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
          path="/spacehank"
          element={
            <Suspense fallback={<SpaceHankFallback />}>
              <SpaceHank />
            </Suspense>
          }
        />
      <Route path="/projects/:key" element={<ProjectDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MainLayout>
);

export default AppRoutes;
