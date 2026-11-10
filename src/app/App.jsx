import { BrowserRouter } from 'react-router-dom';
import { LangProvider } from '../portfolio/i18n';
import { ThemeProvider } from '../shared/lib/theme';
import AppRoutes from './AppRoutes';
import SmoothScroll from '../portfolio/motion/SmoothScroll';
import UpdateToast from './UpdateToast';

const App = () => (
  <LangProvider>
    <SmoothScroll />
    <UpdateToast />
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  </LangProvider>
);

export default App;
