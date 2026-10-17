import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Home from '../pages/Home';
import ProjectDetail from '../pages/ProjectDetail';
import NotFound from '../pages/NotFound';

// `:key` accepts a slug (/projects/smart-center) or a legacy numeric id (/projects/1).
const AppRoutes = () => (
  <MainLayout>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/:key" element={<ProjectDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MainLayout>
);

export default AppRoutes;
