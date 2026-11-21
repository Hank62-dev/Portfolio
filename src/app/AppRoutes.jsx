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

// the storefront's pages (what visitors can pay for, the link-in-bio page, short links) load only when visited
const Shop = lazy(() => import('../portfolio/pages/Store/Shop'));
const Book = lazy(() => import('../portfolio/pages/Store/Book'));
const Join = lazy(() => import('../portfolio/pages/Store/Join'));
const Kit = lazy(() => import('../portfolio/pages/Store/Kit'));
const Me = lazy(() => import('../portfolio/pages/Store/Me'));
const Pay = lazy(() => import('../portfolio/pages/Store/Pay'));
const Go = lazy(() => import('../portfolio/pages/Store/Go'));
const StorePage = ({ page: Page }) => (
  <Suspense fallback={<div className="min-h-svh" />}>
    <Page />
  </Suspense>
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
      <Route path="/shop" element={<StorePage page={Shop} />} />
      <Route path="/book" element={<StorePage page={Book} />} />
      <Route path="/join" element={<StorePage page={Join} />} />
      <Route path="/kit" element={<StorePage page={Kit} />} />
      <Route path="/me" element={<StorePage page={Me} />} />
      <Route path="/pay/:id" element={<StorePage page={Pay} />} />
      <Route path="/go/:slug" element={<StorePage page={Go} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MainLayout>
);

export default AppRoutes;
