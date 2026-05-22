import { useState, useEffect } from 'react';
import { NAV_LINKS } from '../../../utils/constants';
import { scrollToSection } from '../../../utils/helpers';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);

      const sections = NAV_LINKS.map((l) => l.href.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (href) => {
    scrollToSection(href.replace('#', ''));
    setMenuOpen(false);
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={`${styles.nav} container`}>
        <a className={styles.logo} onClick={() => scrollToSection('hero')}>
          <span className={styles.logoMark}>{'<'}</span>
          <span>Hank</span>
          <span className={styles.logoMark}>{'/>'}</span>
        </a>

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <button
                className={`${styles.link} ${activeSection === link.href.replace('#', '') ? styles.active : ''}`}
                onClick={() => handleNav(link.href)}
              >
                {link.label}
              </button>
            </li>
          ))}
          <li>
            <button
              className={styles.cta}
              onClick={() => handleNav('#contact')}
            >
              Liên hệ
            </button>
          </li>
        </ul>

        <button
          className={`${styles.burger} ${menuOpen ? styles.open : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
