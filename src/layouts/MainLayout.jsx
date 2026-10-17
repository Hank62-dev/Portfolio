import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../lib/i18n';
import { useReveal } from '../hooks/useReveal';
import Navbar from '../components/common/Navbar';
import ScrollProgress from '../components/common/ScrollProgress';
import Footer from '../components/common/Footer';

/** Route changes should land at the top, or at the #hash target if there is one. */
const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section exists after a route change.
      const id = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
      return () => cancelAnimationFrame(id);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);

  return null;
};

const MainLayout = ({ children }) => {
  const { c } = useLang();
  const { pathname } = useLocation();
  useReveal();

  return (
    <>
      <ScrollManager />
      <ScrollProgress />
      <a
        href="#main"
        className="fixed top-2 left-2 z-[100] -translate-y-[200%] bg-bone px-3.5 py-2.5 font-mono text-fine text-ink-0 focus:translate-y-0"
      >
        {c.skip}
      </a>
      <Navbar />
      <main id="main">
        {/* keyed by route so each page plays its entrance when you navigate */}
        <div key={pathname} className="page-in">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MainLayout;
