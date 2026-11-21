import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLang } from '../../i18n';
import { followLink } from '../../services/storeService';

/** /go/:slug: a short link. The tap is counted on the server, which gives back where it leads, and the browser goes on there. */
export default function Go() {
  const { slug } = useParams();
  const { c } = useLang();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    followLink(slug)
      .then(({ url }) => live && window.location.replace(url))
      .catch(() => live && setMissing(true));
    return () => {
      live = false;
    };
  }, [slug]);

  return (
    <main className="store-me grid min-h-svh place-items-center px-6 text-center">
      {missing ? (
        <div>
          <p className="text-bone-dim">{c.store.go.missing}</p>
          <Link to="/me" className="mt-4 inline-block font-mono text-fine underline underline-offset-4">
            {c.store.nav.me} →
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-3 font-mono text-fine text-bone-dim" role="status">
          <i className="store-pulse" aria-hidden="true" /> {c.store.go.leaving}
        </p>
      )}
    </main>
  );
}
