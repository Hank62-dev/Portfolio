import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Home, Maximize2, Minimize2, X } from 'lucide-react';
import { deriveStack, LAYERS, projectHref, projects as allProjects } from '../../data/projects';
import Button from '../../design-system/Button';
import { qualityTier, readEnvironment } from '../../lib/capabilities';
import { clsx } from '../../lib/format';
import { useLang } from '../../lib/i18n';
import SectionTitle from '../../components/common/SectionTitle';
import { profile } from '../../data/profile';

// The wings of the exhibition, in the order a visitor meets them.
const WINGS = ['team', 'personal', 'studies'];

/** Which wing a project belongs to: made with others, a product of my own, or practice and experiments. */
const wingOf = (p) => {
  const kind = p.kind.en;
  if (kind.startsWith('Team project')) return 'team';
  if (kind.startsWith('Full-stack ·') || kind.startsWith('AI ·')) return 'personal';
  return 'studies';
};

/** Every project, grouped by wing (the order within a wing is the order in the data). */
const exhibitionProjects = () => {
  const tagged = allProjects.map((p) => ({ p, wing: wingOf(p) }));
  return WINGS.flatMap((wing) => tagged.filter((x) => x.wing === wing));
};

const topTech = (p) => [...p.layers.interface, ...p.layers.service, ...p.layers.data, ...p.layers.delivery];

// Dragging the on-screen pad holds a key down, the same as the keyboard would.
const PAD_KEYS = { forward: 'KeyW', back: 'KeyS', left: 'ArrowLeft', right: 'ArrowRight' };

/**
 * A walk-through of every project, in VR or on screen: a plaza with the living stack on a plinth, opening into
 * a long gallery. Team projects come first, then personal ones, then studies and experiments. You walk with
 * W A S D (or the on-screen arrows, or a headset's stick). Everything heavy (three.js, the XR library, the
 * scene) is loaded only when the section nears the viewport, or when someone asks for it if they have asked
 * for less motion or less data.
 */
export default function Immersive() {
  const { c, t } = useLang();
  const text = c.immersive;
  const box = useRef(null);
  const [env, setEnv] = useState(null);
  const [visible, setVisible] = useState(false);
  const [started, setStarted] = useState(false);
  const [mod, setMod] = useState(null);
  const [walkApi, setWalkApi] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [inVR, setInVR] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [goto, setGoto] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [coarse, setCoarse] = useState(false);

  const source = useMemo(exhibitionProjects, []);
  const projects = useMemo(
    () => source.map(({ p, wing }) => ({ slug: p.slug, name: p.name, year: p.year, kind: t(p.kind), cover: p.cover, tags: topTech(p), wing })),
    [source, t]
  );
  const details = useMemo(
    () => source.map(({ p }) => ({ name: p.name, tagline: t(p.tagline), summary: t(p.summary), stack: topTech(p).slice(0, 9) })),
    [source, t]
  );
  const signs = useMemo(
    () =>
      Object.fromEntries(
        WINGS.map((wing) => {
          const n = source.filter((x) => x.wing === wing).length;
          const w = text.wings[wing];
          return [wing, { eyebrow: w.zone, title: w.name, subtitle: w.note(n) }];
        })
      ),
    [source, text]
  );
  const endNote = useMemo(() => ({ ...text.end, subtitle: `${text.end.subtitle} · ${profile.email}` }), [text]);
  const techs = useMemo(() => {
    const stack = deriveStack();
    const seen = new Set();
    return LAYERS.flatMap((layer) => stack[layer])
      .sort((a, b) => b.slugs.length - a.slugs.length)
      .filter(({ tech }) => !seen.has(tech) && seen.add(tech))
      .slice(0, 9)
      .map(({ tech }) => tech);
  }, []);

  useEffect(() => {
    setEnv(readEnvironment());
    setCoarse(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // keep the scene drawing only while the section is on screen (or while a headset is in use)
  useEffect(() => {
    const el = box.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const canDraw = Boolean(env?.webgl);
  // people who asked for less motion or less data are not given a moving scene unprompted
  const quiet = Boolean(env && (env.reducedMotion || env.saveData));
  const shouldLoad = canDraw && (started || (visible && !quiet));

  useEffect(() => {
    if (!shouldLoad || mod) return undefined;
    let live = true;
    Promise.all([import('../../scene/gallery/GalleryScene'), import('../../scene/gallery/walk')]).then(([loaded, walk]) => {
      if (!live) return;
      setMod(loaded);
      setWalkApi(walk);
    });
    return () => {
      live = false;
    };
  }, [shouldLoad, mod]);

  const store = useMemo(() => (mod ? mod.createGalleryStore() : null), [mod]);

  useEffect(() => {
    if (!store) return undefined;
    let live = true;
    const check = () =>
      navigator.xr?.isSessionSupported?.('immersive-vr').then((ok) => live && setVrSupported(Boolean(ok))).catch(() => {});
    check();
    // A headset can appear after load (it is plugged in, or the emulator on localhost finishes loading),
    // and the browser announces that with devicechange; the timed re-checks cover browsers that do not.
    navigator.xr?.addEventListener?.('devicechange', check);
    const timers = [1500, 4000].map((ms) => window.setTimeout(check, ms));
    const stop = store.subscribe((state) => setInVR(Boolean(state.session)));
    return () => {
      live = false;
      timers.forEach(window.clearTimeout);
      navigator.xr?.removeEventListener?.('devicechange', check);
      stop();
    };
  }, [store]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === box.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const count = projects.length;
  // go to a frame (or back to the plaza with -1): the camera glides there
  const go = useCallback((index) => {
    setSelected(index);
    setGoto({ index });
  }, []);
  const step = useCallback(
    (direction) => go(selected < 0 ? (direction > 0 ? 0 : count - 1) : (selected + direction + count) % count),
    [go, selected, count]
  );
  const close = useCallback(() => {
    setStarted(false);
    setSelected(-1);
    setGoto({ index: -1 });
    walkApi?.releaseAll();
    if (document.fullscreenElement) document.exitFullscreen?.();
  }, [walkApi]);

  const begin = () => {
    setStarted(true);
    box.current?.focus({ preventScroll: true }); // so W A S D go to the exhibition straight away
  };

  const onKeyDown = (e) => {
    if (!started || !walkApi || e.ctrlKey || e.metaKey || e.altKey) return;
    if (walkApi.WALK_KEYS.includes(e.code)) {
      e.preventDefault();
      walkApi.setKey(e.code, true);
    } else if (e.code === 'KeyN') step(1);
    else if (e.code === 'KeyP') step(-1);
    else if (e.code === 'Home' || e.code === 'KeyH') go(-1);
    else if (e.code === 'Escape' && !document.fullscreenElement) close();
  };
  const onKeyUp = (e) => {
    if (walkApi?.WALK_KEYS.includes(e.code)) walkApi.setKey(e.code, false);
  };
  const onBlur = (e) => {
    if (!box.current?.contains(e.relatedTarget)) walkApi?.releaseAll();
  };

  const enterVR = async () => {
    setStarted(true);
    try {
      await store?.enterVR();
    } catch {
      /* the visitor declined, or the headset refused: the exhibition is still there on screen */
    }
  };
  const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());

  const padProps = (key) => ({
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      walkApi?.setKey(PAD_KEYS[key], true);
    },
    onPointerUp: () => walkApi?.setKey(PAD_KEYS[key], false),
    onPointerCancel: () => walkApi?.setKey(PAD_KEYS[key], false),
    onContextMenu: (e) => e.preventDefault(),
  });

  const current = selected >= 0 ? source[selected] : null;
  const status = !env
    ? ''
    : !canDraw
      ? text.noWebgl
      : inVR
        ? text.inVr
        : vrSupported
          ? text.vrReady
          : text.vrNone;
  const caption = current ? text.status(selected + 1, count, current.p.name, text.wings[current.wing].name) : selected === -1 ? text.atHub : text.walking;

  return (
    <section id="immersive" className="relative py-section" aria-labelledby="immersive-title">
      <div className="wrap">
        <SectionTitle id="immersive-title" index="04" label={text.label} title={text.title} lede={text.lede} />

        {/* The exhibition is always dark, in either site theme: it is a place, not a page. */}
        <div
          ref={box}
          tabIndex={started ? 0 : -1}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
          className={clsx(
            'dark-island relative overflow-hidden rounded-card border border-line-strong bg-ink-0 outline-none focus-visible:ring-2 focus-visible:ring-signal',
            fullscreen ? 'h-svh' : 'aspect-[4/5] sm:aspect-[16/9]'
          )}
          role="group"
          aria-label={text.hall}
        >
          <img
            src="/images/vr-gallery.jpg"
            alt=""
            width="1440"
            height="810"
            loading="lazy"
            className={clsx('absolute inset-0 size-full object-cover transition-opacity duration-700', sceneReady ? 'opacity-0' : 'opacity-100')}
          />
          {mod && store && (
            <div className={clsx('absolute inset-0 transition-opacity duration-700', sceneReady ? 'opacity-100' : 'opacity-0')}>
              <mod.default
                store={store}
                projects={projects}
                details={details}
                layerNames={c.stack.layers}
                techs={techs}
                signs={signs}
                endNote={endNote}
                selected={selected}
                goto={goto}
                onSelect={(i) => {
                  begin();
                  go(i);
                }}
                onNear={setSelected}
                interactive={started}
                autoPan={!started && !quiet}
                hint={inVR ? text.boardHint : text.boardHintWeb}
                quality={env ? qualityTier(env) : 'low'}
                active={inVR || (visible && !document.hidden)}
                onReady={() => setSceneReady(true)}
              />
            </div>
          )}

          {shouldLoad && !sceneReady && (
            <p className="absolute top-4 left-4 font-mono text-fine text-bone-dim" role="status">
              {text.loading}
            </p>
          )}

          {!started && (
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-3 bg-gradient-to-t from-ink-0/95 via-ink-0/60 to-transparent p-5 pt-20 sm:p-7 sm:pt-24">
              <Button icon="→" data-cursor="enter" onClick={begin} disabled={!canDraw}>
                {text.explore}
              </Button>
              {vrSupported && (
                <Button variant="ghost" data-cursor="VR" onClick={enterVR} disabled={!store}>
                  {text.enterVr}
                </Button>
              )}
            </div>
          )}

          {started && (
            <>
              <p className="pointer-events-none absolute top-4 left-4 max-w-[60ch] rounded-sm bg-ink-0/70 px-3 py-1.5 font-mono text-[0.72rem] text-bone-dim backdrop-blur">
                {coarse ? text.hintTouch : text.hint}
              </p>

              {coarse && (
                <div className="absolute right-4 bottom-24 grid touch-none select-none grid-cols-3 gap-1.5 sm:bottom-28" data-pad>
                  <span />
                  <Button variant="secondary" size="icon" aria-label={text.forward} {...padProps('forward')}>
                    <ArrowUp size={18} aria-hidden="true" />
                  </Button>
                  <span />
                  <Button variant="secondary" size="icon" aria-label={text.turnLeft} {...padProps('left')}>
                    <ArrowLeft size={18} aria-hidden="true" />
                  </Button>
                  <Button variant="secondary" size="icon" aria-label={text.back} {...padProps('back')}>
                    <ArrowDown size={18} aria-hidden="true" />
                  </Button>
                  <Button variant="secondary" size="icon" aria-label={text.turnRight} {...padProps('right')}>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Button>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-ink-0/95 via-ink-0/60 to-transparent p-4 pt-14 sm:p-5 sm:pt-16">
                <Button variant="secondary" size="icon" aria-label={text.prev} onClick={() => step(-1)}>
                  <ChevronLeft size={18} aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="icon" aria-label={text.next} onClick={() => step(1)}>
                  <ChevronRight size={18} aria-hidden="true" />
                </Button>
                <Button variant="secondary" size="icon" aria-label={text.center} onClick={() => go(-1)}>
                  <Home size={16} aria-hidden="true" />
                </Button>
                <p className="min-w-[12ch] flex-1 px-2 font-mono text-fine text-bone" aria-live="polite" data-caption>
                  {caption}
                </p>
                {current && (
                  <Button size="sm" to={projectHref(current.p)}>
                    {text.open}
                  </Button>
                )}
                {vrSupported && (
                  <Button variant="ghost" size="sm" onClick={enterVR} disabled={!store}>
                    {text.enterVr}
                  </Button>
                )}
                <Button variant="secondary" size="icon" aria-label={fullscreen ? text.exitFullscreen : text.fullscreen} onClick={toggleFullscreen}>
                  {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                </Button>
                <Button variant="secondary" size="icon" aria-label={text.exit} onClick={close}>
                  <X size={16} aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 max-w-[80ch] font-mono text-fine text-bone-faint" role="status" aria-live="polite" data-vr={inVR ? 'active' : vrSupported ? 'ready' : 'none'}>
          {status}
        </p>
      </div>
    </section>
  );
}
