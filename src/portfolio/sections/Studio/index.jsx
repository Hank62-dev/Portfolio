import { Link } from 'react-router-dom';
import { useLang } from '../../i18n';
import SectionTitle from '../../components/SectionTitle';
import { doorsFrom, useStoreData } from '../../hooks/useStoreDoors';

/**
 * The way into the storefront from the home page: every door the shop has open (products, a call, the membership, the media
 * kit, the tip jar, the links) as a row to follow, the way the menu lists the sections; what is not open yet says it is coming.
 * The server unreachable: the section is not there.
 */
export default function Studio() {
  const { c } = useLang();
  const doors = doorsFrom(useStoreData(), c, { all: true });
  if (!doors.length) return null; // the server cannot be reached
  const t = c.store.studio;
  return (
    <section id="studio" className="relative py-section" aria-labelledby="studio-title">
      <div className="wrap">
        <SectionTitle id="studio-title" index="✦" label={t.label} title={t.title} lede={t.lede} />
        <ul className="studio-doors">
          {doors.map((d, i) => (
            <li key={d.id} style={{ '--i': i }}>
              {d.soon ? (
                <span className="studio-door is-soon">
                  <span className="studio-door-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="studio-door-name">{d.label}</span>
                  <span className="studio-door-note">{d.note}</span>
                  <span className="studio-door-arrow" aria-hidden="true" />
                </span>
              ) : (
                <Link to={d.to} className="studio-door" data-cursor="go">
                  <span className="studio-door-no">{String(i + 1).padStart(2, '0')}</span>
                  <span className="studio-door-name">{d.label}</span>
                  <span className="studio-door-note">{d.note}</span>
                  <span className="studio-door-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
