import { socials } from '../../../data/profile';
import { useLang } from '../../../lib/i18n';

const linkCls = 'py-1.5 transition-colors duration-200 hover:text-signal';

const Footer = () => {
  const { c } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line py-10 font-mono text-fine text-bone-dim">
      <div className="wrap flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <div>
          <p className="text-bone">© {year} Võ Gia Huy</p>
          <p className="mt-1">{c.footer.built}</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#top"
          className={linkCls}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0 });
          }}
        >
          {c.footer.top} ↑
        </a>
      </div>
    </footer>
  );
};

export default Footer;
