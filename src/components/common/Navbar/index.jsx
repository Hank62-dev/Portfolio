import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../../data/profile';
import { useLang } from '../../../lib/i18n';
import { useActiveSection } from '../../../hooks/useActiveSection';
import { clsx } from '../../../lib/format';
import { jumpTo } from '../../../lib/scroll';
import LangToggle from '../LangToggle';

// Below the `nav` breakpoint the links become a full-screen panel that fades and slides in.
// `visibility` flips last when closing so the panel stays clickable-proof while it fades out.
const PANEL_BASE =
  'max-nav:fixed max-nav:inset-x-0 max-nav:top-header max-nav:bottom-0 max-nav:flex-col max-nav:items-stretch max-nav:justify-between max-nav:gap-6 max-nav:bg-ink-0 max-nav:px-gutter max-nav:pt-6 max-nav:pb-8';
const PANEL_CLOSED =
  'max-nav:invisible max-nav:-translate-y-2 max-nav:opacity-0 max-nav:[transition:opacity_.5s_var(--ease-out-expo),translate_.5s_var(--ease-out-expo),visibility_0s_linear_.5s]';
const PANEL_OPEN =
  'max-nav:visible max-nav:translate-y-0 max-nav:opacity-100 max-nav:[transition:opacity_.5s_var(--ease-out-expo),translate_.5s_var(--ease-out-expo),visibility_0s]';

const Navbar = () => {
  const { c } = useLang();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(NAV_SECTIONS, pathname === '/');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  // On the home page, scroll in place so clicking the current hash still works.
  const go = (id) => (e) => {
    setOpen(false);
    if (pathname === '/') jumpTo(id)(e);
  };

  const solid = scrolled || open;

  return (
    <header
      // The blur lives on a pseudo-element: backdrop-filter on the header itself would make it the
      // containing block of the fixed mobile panel and collapse the panel to header height.
      className={clsx(
        'fixed inset-x-0 top-0 z-50 h-header border-b transition-colors duration-500',
        'before:absolute before:inset-0 before:-z-10 before:bg-ink-0/90 before:backdrop-blur-md before:transition-opacity before:duration-500',
        solid ? 'border-line before:opacity-100' : 'border-transparent before:opacity-0'
      )}
    >
      <div className="wrap flex h-full items-center justify-between gap-6">
        <Link to="/" className="inline-flex items-center gap-3" aria-label={c.nav.home}>
          <span className="grid h-[30px] place-items-center rounded-sm border border-line-strong px-2 font-mono text-[0.72rem] font-semibold tracking-[0.06em]">
            HGH
          </span>
          <span className="font-display text-[1.25rem] max-[1020px]:hidden">Võ Gia Huy</span>
        </Link>

        <nav
          id="primary-nav"
          className={clsx('flex items-center gap-7', PANEL_BASE, open ? PANEL_OPEN : PANEL_CLOSED)}
          aria-label="Primary"
        >
          <ul className="flex gap-1 max-nav:flex-col max-nav:gap-0">
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
                    // full-screen menu: big serif rows with a hairline
                    'max-nav:w-full max-nav:rounded-none max-nav:border-b max-nav:border-line max-nav:px-0 max-nav:py-[18px] max-nav:font-display max-nav:text-h3 max-nav:text-bone max-nav:after:hidden',
                    active === id
                      ? 'text-bone after:scale-x-100'
                      : 'text-bone-dim after:scale-x-0 hover:text-bone hover:after:scale-x-100'
                  )}
                >
                  <span
                    className={clsx(
                      'text-[0.68rem] max-nav:font-mono max-nav:text-[0.72rem]',
                      active === id ? 'text-signal' : 'text-bone-faint'
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {c.nav[id]}
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <LangToggle />
          </div>
        </nav>

        <button
          type="button"
          className="group relative -mr-2.5 hidden size-11 max-nav:block"
          aria-expanded={open}
          aria-controls="primary-nav"
          aria-label={open ? c.nav.close : c.nav.menu}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="absolute inset-x-[11px] top-[18px] h-[1.5px] bg-bone transition-transform duration-500 ease-out-expo group-aria-expanded:translate-y-[3.5px] group-aria-expanded:rotate-45" />
          <span className="absolute inset-x-[11px] top-[25px] h-[1.5px] bg-bone transition-transform duration-500 ease-out-expo group-aria-expanded:-translate-y-[3.5px] group-aria-expanded:-rotate-45" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
