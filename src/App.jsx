import { BrowserRouter } from 'react-router-dom';
import { LangProvider } from './lib/i18n';
import AppRoutes from './routes/AppRoutes';

const App = () => (
  <LangProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  </LangProvider>
);

export default App;
