import { BrowserRouter } from 'react-router-dom';
import { LangProvider } from './lib/i18n';
import { ThemeProvider } from './lib/theme';
import AppRoutes from './routes/AppRoutes';
import SmoothScroll from './motion/SmoothScroll';
import UpdateToast from './components/common/UpdateToast';

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
