import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, Minimize2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectHref, projects as allProjects } from '../../data/projects';
import { qualityTier, readEnvironment } from '../../lib/capabilities';
import { clsx } from '../../../shared/lib/format';
import { useLang } from '../../i18n';
import SectionTitle from '../../components/SectionTitle';
import { clampRail, nearest } from '../../scene/exhibit/layout';

const VrGallery = lazy(() => import('./VrGallery'));

// The order works are hung in: team projects first, then personal ones, then studies (as in the walkable gallery).
const RANK = (p) => (p.kind.en.startsWith('Team project') ? 0 : p.kind.en.startsWith('Full-stack ·') || p.kind.en.startsWith('AI ·') ? 1 : 2);
const topTech = (p) => [...p.layers.interface, ...p.layers.service, ...p.layers.data, ...p.layers.delivery];
const pad = (n) => String(n).padStart(2, '0');

/**
 * The exhibition: a white gallery that curves away, every project hung on its wall as a framed work with a label. The camera
 * drifts along the first works until the visitor steps in; then the wheel, a drag or the arrow keys walk the curve, and choosing a
 * work brings the camera square in front of it and its wall text, which leads on to the case study. Three.js loads only when the section nears the screen. A
 * headset can still walk the older gallery in VR.
 */
export default function Immersive() {
  const { c, t } = useLang();
  const navigate = useNavigate();
  const text = c.immersive;
  const box = useRef(null);
  const rail = useRef({ t: 0 });
  const drag = useRef(null);
  const [env, setEnv] = useState(null);
  const [visible, setVisible] = useState(false);
  const [mod, setMod] = useState(null);
  const [ready, setReady] = useState(false);
  const [inside, setInside] = useState(false);
  const [focus, setFocus] = useState(-1);
  const [near, setNear] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [vr, setVr] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);

  const source = useMemo(() => [...allProjects].sort((a, b) => RANK(a) - RANK(b)), []);
  const works = useMemo(() => source.map((p) => ({ slug: p.slug, name: p.name, year: p.year, kind: t(p.kind), cover: p.cover, tagline: t(p.tagline), tech: topTech(p).slice(0, 6) })), [source, t]);
  const count = works.length;
  const words = useMemo(() => ({ kicker: text.exhibit.kicker(count), title: text.exhibit.wallTitle, line: text.exhibit.wallLine }), [text, count]);
  const labels = useMemo(() => ({ no: text.exhibit.no, open: text.open }), [text]);

  useEffect(() => {
    setEnv(readEnvironment());
    navigator.xr?.isSessionSupported?.('immersive-vr').then((ok) => setVr(Boolean(ok))).catch(() => {});
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const canDraw = Boolean(env?.webgl);
  const quiet = Boolean(env && (env.reducedMotion || env.saveData));
  const shouldLoad = canDraw && (inside || (visible && !quiet));

  useEffect(() => {
    if (!shouldLoad || mod) return undefined;
    let live = true;
    import('../../scene/exhibit/ExhibitScene').then((loaded) => live && setMod(loaded));
    return () => {
      live = false;
    };
  }, [shouldLoad, mod]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // walking the curve: the rail moves, and the work nearest to it is the one the bar names
  const move = useCallback(
    (delta) => {
      rail.current.t = clampRail(rail.current.t + delta, count);
      setNear(nearest(rail.current.t, count));
    },
    [count]
  );
  const goTo = useCallback(
    (i) => {
      const index = (i + count) % count;
      rail.current.t = index;
      setNear(index);
      setFocus(index);
    },
    [count]
  );

  const enter = () => {
    rail.current.t = Math.round(rail.current.shown ?? 0);
    setNear(nearest(rail.current.t, count));
    setInside(true);
    box.current?.focus({ preventScroll: true });
  };
  const leave = useCallback(() => {
    setFocus(-1);
    setInside(false);
    if (document.fullscreenElement) document.exitFullscreen?.();
  }, []);

  // the wheel walks the gallery only once the visitor has stepped in (the page scrolls as usual before that)
  useEffect(() => {
    const el = box.current;
    if (!el || !inside) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (focus >= 0) setFocus(-1);
      move((Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 0.0024);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [inside, focus, move]);

  const onKeyDown = (e) => {
    if (!inside) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      goTo(focus >= 0 ? focus + 1 : near + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(focus >= 0 ? focus - 1 : near - 1);
    } else if (e.key === 'Enter') {
      if (focus < 0) setFocus(near);
      else open(focus);
    }
    else if (e.key === 'Escape') {
      if (focus >= 0) setFocus(-1);
      else if (!document.fullscreenElement) leave();
    }
  };

  const onPointerDown = (e) => {
    if (!inside || e.button > 0) return;
    drag.current = { x: e.clientX, moved: 0 };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.moved += Math.abs(dx);
    if (d.moved > 6) {
      if (focus >= 0) setFocus(-1);
      move(-dx * 0.0065);
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const pick = (i) => {
    if (!inside) enter();
    rail.current.t = i;
    setNear(i);
    setFocus(i);
  };

  const open = (i) => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    navigate(projectHref(source[i]));
  };

  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());
  const shownIndex = focus >= 0 ? focus : near;

  return (
    <section id="immersive" className="relative py-section" aria-labelledby="immersive-title">
      <div className="wrap">
        <SectionTitle id="immersive-title" index="04" label={text.label} title={text.exhibit.title} lede={text.exhibit.lede} />

        {vrOpen ? (
          <Suspense fallback={<p className="font-mono text-fine text-bone-dim">{text.loading}</p>}>
            <VrGallery />
            <button type="button" onClick={() => setVrOpen(false)} className="mt-3 font-mono text-fine text-bone-dim underline underline-offset-4 hover:text-bone">
              {text.exhibit.backToHall}
            </button>
          </Suspense>
        ) : (
          <>
            {/* The hall is always light, in either site theme: a white gallery is a place, not a page. */}
            <div
              ref={box}
              tabIndex={inside ? 0 : -1}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              data-lenis-prevent={inside ? '' : undefined}
              className={clsx('exhibit relative overflow-hidden rounded-card outline-none select-none focus-visible:ring-2 focus-visible:ring-signal', fullscreen ? 'h-svh rounded-none' : 'aspect-[4/5] sm:aspect-[16/9]', inside && 'is-inside')}
              role="group"
              aria-label={text.hall}
              data-exhibit
            >
              <img src="/images/vr-gallery.jpg" alt="" width="1440" height="810" loading="lazy" className={clsx('absolute inset-0 size-full object-cover transition-opacity duration-1000', ready ? 'opacity-0' : 'opacity-100')} />
              {mod && (
                <div className={clsx('absolute inset-0 transition-opacity duration-1000', ready ? 'opacity-100' : 'opacity-0')}>
                  <mod.default works={works} rail={rail} focus={focus} onPick={pick} onOpen={open} drift={!inside && !quiet} words={words} labels={labels} quality={env ? qualityTier(env) : 'low'} active={visible && !document.hidden} onReady={() => setReady(true)} />
                </div>
              )}
              {shouldLoad && !ready && (
                <p className="absolute top-4 left-4 font-mono text-fine text-[#5b574f]" role="status">
                  {text.loading}
                </p>
              )}

              {!inside ? (
                <div className="exhibit-title">
                  <small>{text.exhibit.kicker(count)}</small>
                  <h3>{text.exhibit.wallTitle}</h3>
                  <button type="button" onClick={enter} disabled={!canDraw} className="exhibit-enter" data-cursor="enter">
                    {text.exhibit.enter}
                  </button>
                  {!canDraw && env && <p className="mt-2 font-mono text-[0.7rem] text-[#5b574f]">{text.noWebgl}</p>}
                </div>
              ) : (
                <>
                  <p className="exhibit-hint">{text.exhibit.hint}</p>
                  <div className="exhibit-bar">
                    <button type="button" onClick={() => goTo(shownIndex - 1)} aria-label={text.prev} className="exhibit-round">
                      <ArrowLeft size={16} aria-hidden="true" />
                    </button>
                    <span className="exhibit-count" aria-live="polite">
                      <b>{pad(shownIndex + 1)}</b> / {pad(count)}
                      <em>{works[shownIndex]?.name}</em>
                    </span>
                    <button type="button" onClick={() => goTo(shownIndex + 1)} aria-label={text.next} className="exhibit-round">
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    <span className="flex-1" />
                    {focus >= 0 && (
                      <button type="button" onClick={() => open(focus)} className="exhibit-pill exhibit-open" key={focus} aria-label={text.open}>
                        <span className="exhibit-open-label">{text.open}</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </button>
                    )}
                    {vr && (
                      <button type="button" onClick={() => setVrOpen(true)} className="exhibit-pill">
                        {text.enterVr}
                      </button>
                    )}
                    <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? text.exitFullscreen : text.fullscreen} className="exhibit-round">
                      {fullscreen ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={leave} aria-label={text.exit} className="exhibit-round">
                      <X size={15} aria-hidden="true" />
                    </button>
                  </div>
                </>
              )}

            </div>
            {vr && !inside && (
              <button type="button" onClick={() => setVrOpen(true)} className="mt-4 font-mono text-fine text-bone-dim underline underline-offset-4 hover:text-bone">
                {text.exhibit.vrOffer}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
