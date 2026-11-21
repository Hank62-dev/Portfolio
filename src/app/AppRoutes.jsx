import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './MainLayout';
import Home from '../portfolio/pages/Home';
import ProjectDetail from '../portfolio/pages/ProjectDetail';
import NotFound from '../portfolio/pages/NotFound';
import BootLoader from '../shared/ui/BootLoader';

// three.js / R3F / markdown only load when someone opens /spacehank.
const SpaceHank = lazy(() => import('../spacehank'));

const SpaceHankFallback = () => <BootLoader />;

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
