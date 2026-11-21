import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, Coffee, Gem, Megaphone, ShoppingBag } from 'lucide-react';
import { useLang } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { profile as siteProfile } from '../../../shared/profile';
import { StoreState, useStorefront } from './shared';

/**
 * /me: the link-in-bio page for TikTok, Instagram and the rest: who it is, the links (each through /go, so every tap is
 * counted), and the doors to the shop, a call, the membership and the media kit. Made for a phone, on its own without the site.
 */
export default function Me() {
  const { c } = useLang();
  const { data, error } = useStorefront();
  const name = data?.profile?.name || siteProfile.name;
  usePageMeta({ title: name, description: data?.profile?.bio || name });

  const doors = data
    ? [
        data.products.length > 0 && { to: '/shop', label: c.store.nav.shop, icon: ShoppingBag },
        data.booking && { to: '/book', label: data.booking.title || c.store.nav.book, icon: CalendarClock },
        data.tiers.length > 0 && { to: '/join', label: c.store.nav.join, icon: Gem },
        (data.kit.headline || data.kit.stats.length > 0) && { to: '/kit', label: c.store.nav.kit, icon: Megaphone },
        data.tips && { to: '/shop#tip-title', label: c.store.me.tip, icon: Coffee },
      ].filter(Boolean)
    : [];

  return (
    <main className="store-me">
      <div className="store-me-glow" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-[460px] flex-col items-center px-5 pt-14 pb-16">
        <div className="store-me-avatar">
          <img src={data?.profile?.avatar || siteProfile.portrait} alt="" />
        </div>
        <h1 className="mt-5 text-center font-display text-[2rem] leading-tight">{name}</h1>
        {data?.profile?.bio && <p className="mt-2 max-w-[34ch] text-center text-bone-dim">{data.profile.bio}</p>}

        {!data ? (
          <div className="mt-10">
            <StoreState error={error} />
          </div>
        ) : (
          <>
            {doors.length > 0 && (
              <ul className="mt-8 grid w-full grid-cols-2 gap-2.5">
                {doors.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <Link to={to} className="store-me-door">
                      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-6 flex w-full flex-col gap-3">
              {data.links.map((l, i) => (
                <li key={l.id} style={{ '--i': i }} className="store-me-row">
                  <Link to={`/go/${l.id}`} className="store-me-link">
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  {l.kind === 'affiliate' && <small className="mt-1 block px-4 text-[0.7rem] text-bone-faint">{c.store.me.affiliate}</small>}
                </li>
              ))}
            </ul>
          </>
        )}
        <Link to="/" className="mt-12 font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase hover:text-bone">
          {c.store.me.portfolio} ↗
        </Link>
      </div>
    </main>
  );
}
