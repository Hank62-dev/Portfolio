import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../../shared/profile';
import { useLang } from '../../i18n';
import { useActiveSection } from '../../hooks/useActiveSection';
import { clsx } from '../../../shared/lib/format';
import { jumpTo } from '../../lib/scroll';
import { lenisRef } from '../../motion/SmoothScroll';
import LangToggle from '../LangToggle';
import Menu from '../Menu';
import SoundToggle from '../SoundToggle';
import Logo from '../../../shared/ui/Logo';

const Navbar = () => {
  const { c } = useLang();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [origin, setOrigin] = useState(null);
  const menuButton = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const active = useActiveSection(NAV_SECTIONS, pathname === '/');

  // Scrolling down tucks the bar away to give the page room; scrolling up brings it back.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (Math.abs(y - last) > 6) setTucked(y > last && y > 420);
      last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    document.documentElement.dataset.menu = 'open'; // the theme pull cord hides while the menu covers the page
    lenisRef.current?.stop();
    return () => {
      delete document.documentElement.dataset.menu;
      document.body.style.overflow = '';
      lenisRef.current?.start();
    };
  }, [open]);

  // On the home page, scroll in place so clicking the current hash still works.
  const go = (id) => (e) => {
    setOpen(false);
    // The open menu froze the page (Lenis stopped, body locked), and a frozen Lenis ignores scrollTo: let go first.
    document.body.style.overflow = '';
    lenisRef.current?.start();
    if (pathname === '/') jumpTo(id)(e);
  };

  const solid = scrolled || open;

  return (
    <header
      // The blur lives on a pseudo-element: backdrop-filter on the header itself would make it the
      // containing block of the fixed mobile panel and collapse the panel to header height.
      className={clsx(
        'fixed inset-x-0 top-0 z-50 h-header border-b transition-[colors,translate] duration-500',
        tucked && !open && '-translate-y-full',
        'before:absolute before:inset-0 before:-z-10 before:bg-ink-0/90 before:backdrop-blur-md before:transition-opacity before:duration-500',
        solid ? 'border-line before:opacity-100' : 'border-transparent before:opacity-0'
      )}
    >
      <div className="wrap flex h-full items-center justify-between gap-6">
        <Link to="/" className="inline-flex items-center gap-3" aria-label={c.nav.home}>
          <Logo className="size-9 rounded-md" />
          <span className="font-display text-[1.25rem] max-[1020px]:hidden">Võ Gia Huy</span>
        </Link>

        <nav className="flex items-center gap-6 max-lg:hidden" aria-label="Sections">
          <ul className="flex gap-1">
            {NAV_SECTIONS.map((id, i) => (
              <li key={id}>
                <Link
                  to={`/#${id}`}
                  onClick={go(id)}
                  aria-current={active === id ? 'location' : undefined}
                  className={clsx(
                    'group relative inline-flex items-baseline gap-2 rounded-sm px-3 py-2 font-mono text-fine transition-colors duration-200',
                    // underline draws in on hover and stays on the section being read
                    'after:absolute after:inset-x-3 after:bottom-0.5 after:h-px after:origin-left after:bg-signal after:transition-transform after:duration-500 after:ease-out-expo',
                    active === id
                      ? 'text-bone after:scale-x-100'
                      : 'text-bone-dim after:scale-x-0 hover:text-bone hover:after:scale-x-100'
                  )}
                >
                  <span className={clsx('text-[0.68rem]', active === id ? 'text-signal' : 'text-bone-faint')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {/* two copies of the label: on hover the first rolls out and the second rolls in */}
                  <span className="relative inline-block overflow-hidden align-bottom">
                    <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full">
                      {c.nav[id]}
                    </span>
                    <span
                      className="absolute inset-0 block translate-y-full text-signal transition-transform duration-500 ease-out-expo group-hover:translate-y-0"
                      aria-hidden="true"
                    >
                      {c.nav[id]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <LangToggle />
        </nav>

        <div className="flex items-center gap-2">
          <SoundToggle />
          <button
            ref={menuButton}
            type="button"
            className="group relative -mr-1 inline-flex h-10 items-center gap-3 overflow-hidden rounded-full border border-line-strong px-4 font-mono text-fine text-bone transition-colors duration-300 hover:border-bone"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-haspopup="dialog"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
              setOpen(true);
            }}
          >
            <span className="relative inline-block overflow-hidden">
              <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full">{c.nav.menu}</span>
              <span className="absolute inset-0 block translate-y-full text-signal transition-transform duration-500 ease-out-expo group-hover:translate-y-0" aria-hidden="true">
                {c.nav.menu}
              </span>
            </span>
            <span className="grid gap-[4px]" aria-hidden="true">
              <span className="block h-[1.5px] w-4 bg-current transition-transform duration-500 ease-out-expo group-hover:scale-x-75" />
              <span className="block h-[1.5px] w-4 origin-right bg-current transition-transform duration-500 ease-out-expo group-hover:scale-x-50" />
            </span>
          </button>
        </div>
      </div>
      <Menu open={open} onClose={close} origin={origin} active={active} onGo={go} returnFocus={menuButton} />
    </header>
  );
};

export default Navbar;
