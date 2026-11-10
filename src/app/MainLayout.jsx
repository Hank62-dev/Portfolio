import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLang } from '../portfolio/i18n';
import { useReveal } from '../portfolio/hooks/useReveal';
import Navbar from '../portfolio/components/Navbar';
import ScrollProgress from '../portfolio/components/ScrollProgress';
import Footer from '../portfolio/components/Footer';
import 'pullcord/pullcord.css';
import { profile } from '../shared/profile';
import { useTheme } from '../shared/lib/theme';
import { scrollToTarget } from '../portfolio/lib/scroll';
import BackgroundField from '../portfolio/motion/BackgroundField';
import Cursor from '../portfolio/motion/Cursor';
import { ScrollTrigger } from '../portfolio/motion/gsap';
import Grain from '../portfolio/motion/Grain';
import Intro from '../portfolio/motion/Intro';
import RouteWipe from '../portfolio/motion/RouteWipe';

/** Route changes should land at the top, or at the #hash target if there is one. */
// The cord pulls in a physics library, so it loads after the page is up rather than with it.
const PullCord = lazy(() => import('pullcord').then((module) => ({ default: module.PullCord })));

const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Wait a frame so the new page exists, then let ScrollTrigger measure it before we scroll.
    const id = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      const target = hash ? document.getElementById(hash.slice(1)) : null;
      scrollToTarget(target ?? 0, { immediate: true });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, hash]);

  return null;
};

const MainLayout = ({ children }) => {
  const { c } = useLang();
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  useReveal();

  if (pathname === '/spacehank') {
    return <>{children}</>;
  }

  return (
    <>
      <ScrollManager />
      <BackgroundField />
      <Grain />
      <Cursor />
      <RouteWipe />
      <Intro name={profile.name} />
      {/* A rope hanging from the top edge: pull it to switch between the dark and light themes. */}
      <Suspense fallback={null}>
        <PullCord onPull={toggle} pulled={theme === 'light'} ariaLabel={c.nav.theme} />
      </Suspense>
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
