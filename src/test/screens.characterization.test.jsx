import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it, vi } from 'vitest';

// A picture of every screen as it was before the code was moved around: each one still opens, and still draws the same parts.
// The "parts" of a screen are the names of its data-* attributes (they mark its sections and controls), which do not change
// with the date or the time, plus its first heading. Moving a file must leave all of it as it is.
//
// RECORD_SCREENS=1 npx vitest run src/test/screens.characterization.test.jsx writes the picture again, from the code as it is now:
// only for a change that is meant to change a screen, never during a refactor.
//
// The screens are drawn on the server (no browser here). Two things only a server needs: a store read has to say what it
// reads on the server too (the app's own reads leave that out, which a browser never asks for), and the screens that read
// the address need a router round them.

vi.mock('react', async (load) => {
  const React = await load();
  const useSyncExternalStore = (subscribe, get, server) => React.useSyncExternalStore(subscribe, get, server ?? get);
  return { ...React, useSyncExternalStore, default: { ...React, useSyncExternalStore } };
});

const parts = (html) => [...new Set([...html.matchAll(/\sdata-([a-z0-9-]+)=/g)].map((m) => m[1]))].sort();
const heading = (html) => html.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '').trim() ?? null;
const draw = (element, path = '/') => renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);

const SCREENS = {
  Calendar: () => import('@/features/spacehank/calendar/CalendarView'),
  Creator: () => import('@/features/spacehank/creator/CreatorView'),
  Constellation: () => import('@/features/spacehank/views/ConstellationView'),
  Dashboard: () => import('@/features/spacehank/views/DashboardView'),
  Diary: () => import('@/features/spacehank/views/DiaryView'),
  Documents: () => import('@/features/spacehank/views/DocumentsView'),
  Floor: () => import('@/features/spacehank/views/FloorView'),
  Games: () => import('@/features/spacehank/views/GamesView'),
  Habits: () => import('@/features/spacehank/views/HabitsView'),
  Memory: () => import('@/features/spacehank/views/MemoryView'),
  Memos: () => import('@/features/spacehank/views/MemosView'),
  Mission: () => import('@/features/spacehank/views/MissionView'),
  MusicPhone: () => import('@/features/spacehank/views/MusicPhone'),
  Music: () => import('@/features/spacehank/views/MusicView'),
  Notes: () => import('@/features/spacehank/views/NotesView'),
  Paint: () => import('@/features/spacehank/views/PaintView'),
  Podcast: () => import('@/features/spacehank/views/PodcastView'),
  Pulse: () => import('@/features/spacehank/views/PulseView'),
  Rag: () => import('@/features/spacehank/views/RagView'),
  Shell: () => import('@/features/spacehank/views/ShellView'),
  Studio: () => import('@/features/spacehank/views/StudioView'),
  Study: () => import('@/features/spacehank/views/StudyView'),
  Wallet: () => import('@/features/spacehank/views/WalletView'),
};

const PAGES = ['/', '/projects/smart-center', '/no-such-page'];

// one fixed moment (a Tuesday morning), so a greeting or a date on a screen is the same on every run
vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date('2026-11-10T09:30:00'));

const RECORD = Boolean(globalThis.process?.env.RECORD_SCREENS);
const FILE = new URL('./screens.characterization.json', import.meta.url);

describe('every screen, as it was before the refactor', async () => {
  const expected = RECORD ? { screens: {}, pages: {} } : (await import('./screens.characterization.json')).default;
  const check = (group, key, seen) => {
    if (RECORD) expected[group][key] = seen;
    else expect(seen).toEqual(expected[group][key]);
  };
  afterAll(() => {
    if (RECORD) writeFileSync(FILE, `${JSON.stringify(expected, null, 2)}
`);
  });

  for (const [name, load] of Object.entries(SCREENS)) {
    it(`${name} opens with the same parts`, async () => {
      const Screen = (await load()).default;
      const html = draw(<Screen onNotify={() => {}} onNavigate={() => {}} agents={[]} events={[]} />);
      check('screens', name, { parts: parts(html), heading: heading(html) });
    });
  }

  for (const path of PAGES) {
    it(`the portfolio page ${path} opens with the same parts`, async () => {
      const [{ default: AppRoutes }, { LangProvider }, { ThemeProvider }] = await Promise.all([import('@/app/AppRoutes'), import('@/portfolio/i18n'), import('@/shared/lib/theme')]);
      const html = draw(
        <LangProvider>
          <ThemeProvider>
            <AppRoutes />
          </ThemeProvider>
        </LangProvider>,
        path
      );
      check('pages', path, { parts: parts(html), heading: heading(html) });
    });
  }
});
