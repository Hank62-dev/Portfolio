# Architecture

One repository, three programs:

| Program | Where | Runs on |
| --- | --- | --- |
| **Portfolio** (the public site, `/`) | `src/portfolio/` | Vercel, as a static site |
| **SpaceHank** (the private workspace, `/spacehank`, an installable PWA) | `src/spacehank/` | the same Vercel build, loaded only when `/spacehank` opens |
| **Realtime server** (sign-in, sync, AI helpers, push, calendar, sockets) | `server/` | Render (`npm run spacehank:server`) |

`.integrations/hank62-rag/` is a separate Python service (Hank RAG) with its own README; nothing here imports it.

## The tree

```
src/
├─ app/          start-up and what every page has: main.jsx, App.jsx (providers), AppRoutes.jsx, MainLayout.jsx, UpdateToast.jsx
├─ shared/       used by both apps, imports neither
│  ├─ ui/        the design system (Button, Card, Dialog, Field, Menu, Toast…, Logo) and its few words (words.js)
│  ├─ i18n/      the one i18next and the one language choice (see "Languages")
│  ├─ lib/       format (clsx…), theme, appUpdate + changelog (the update notice), date (dayKey), math (clamp)
│  ├─ hooks/     useDebounce (search boxes, 400 ms), useMediaQuery, useMotion
│  ├─ styles/    index.css: the Tailwind entry and every design token
│  └─ profile.js the owner's public facts (the site and the workspace both show them)
├─ portfolio/    the public site
│  ├─ pages/ sections/ scene/ (three.js) motion/ (GSAP, Lenis)
│  ├─ components/  Navbar, Footer, LangToggle, SectionTitle, Marquee…
│  ├─ data/      copy.js (every text, EN and VI), projects.js
│  ├─ hooks/ lib/ services/ (GitHub, the site's only network code)
│  └─ i18n.jsx   LangProvider: the language as React state, and the copy
├─ spacehank/    the workspace (index.jsx is its entry, loaded lazily)
│  ├─ app/       Workspace.jsx (the shell that picks the tab), demo/ (the guest's sample data)
│  ├─ layout/    the frame: Sidebar, Topbar, MobileNav, CommandPalette (+ commands, nlcommands), Fab, LoginScreen…
│  ├─ features/  one folder per tab or capability, named by what it is (diary, notes, music, paint, podcast, today…)
│  │             <Name>View.jsx is the tab; beside it its parts, model.js (plain functions, tested) and store.js (state)
│  ├─ ui/        small pieces several features share: Page (heading, Segmented), Markdown, AppIcon, useSlider
│  └─ core/      the plumbing: store.js (createStore/useStore), storage.js (IndexedDB), sync/, api/, realtime/,
│                i18n/ (tr() and the workspace's tables), demo/ (guest mode), navigation.js (the tabs), modules.js, motion/, hooks/
├─ assets/       music shipped with the app, sounds, the logo
└─ test/         tests about the whole: architecture, and the characterization tests (see "Tests")

server/
├─ index.mjs     starts it (reads .env, opens the database)
├─ app.mjs       builds the services and puts the route groups together, then the HTTP and WebSocket server
├─ config.mjs    every setting, from environment variables
├─ http/         reading and answering: http (JSON, cookies, errors), limits (rate limits), safeFetch (SSRF-safe fetch)
├─ services/     the work: auth, ai, sync, push, gcal, calendar, podcasts, discord, hub, tasks, agents, battle, ragToken, database
└─ routes/       the HTTP routes by group (system, auth, push, ai, sync, creator, rag, podcasts, calendar)
```

## Who may import whom

Lower layers never import higher ones. `src/test/architecture.test.js` checks every import (relative and `@/`) on each run:
no circle, no missing file or asset, no layer crossed the wrong way.

```
shared   <   portfolio            <   app
shared   <   spacehank/core  <  spacehank/ui  <  spacehank/features  <  spacehank/layout  <  spacehank/app  <  app
server/http  <  server/services  <  server/routes  <  server/app.mjs
```

- A feature may use another feature (no circle), never `layout/` or `app/`.
- The server shares a few plain files with the workspace (the battleship rules, the Vietnamese texts, the reminder rules)
  and never a screen. Plain Node loads them (`server/load.test.mjs`), so their imports name their files in full (`.js`).
- Tests may reach whatever they check.

## Conventions

- Folders are lower case. A file whose main export is a component is `PascalCase.jsx`; a file of several small components
  is lower case (`parts.jsx`, `ui.jsx`). Hooks are `useThing.js`. Plain logic is `model.js`, state is `store.js`.
- Tests sit beside what they test, as `*.test.js` (`*.test.mjs` on the server).
- Within a feature, imports are relative. Across areas, relative or `@/…` (`@` is `src/`).
- Every text on a SpaceHank screen goes through `tr('…')`, written once in the language it was first written in.
- What a device remembers (localStorage, IndexedDB) keeps its key for ever: `hank62.*`, `spacehank.*`, `lang`, the stores
  in `core/storage.js`. Renaming one loses what people have kept.

## Languages

One i18next (`shared/i18n/i18n.js`) and one choice: `lang` in localStorage, else the browser's language
(`shared/i18n/language.js`). Each part adds its texts as a namespace when it loads, so the public site does not carry the
workspace's tables:

| Namespace | Whose | Read with |
| --- | --- | --- |
| `spacehank` | the workspace's tables (`spacehank/core/i18n/locale/`), keyed by the text itself | `tr('Text', …args)`, `{0}` filled in order |
| `translation` | Hank RAG's keyed texts (`rag.*`, `chat.*`) | react-i18next's `useTranslation()` |
| `shared` | the design system's few words | `word('Close')` |

There is no falling back to another language: a text with no entry is shown as written. The portfolio's `copy.js` is a
page of content per language that also holds formatters, so `LangProvider` reads it as it is and switches i18next with it.
The workspace reloads when its language changes; the site switches in place.

## Tests

`npm test` (Vitest) runs the app's and the server's tests together. Beyond each module's own:

- `src/test/architecture.test.js`: the layers above.
- `server/routes.characterization.test.mjs`: every route and what it answers without a session (401 where it must),
  another origin refused, a session let through.
- `src/test/screens.characterization.test.jsx`: every workspace screen and portfolio page still opens, with the same
  `data-*` parts and first heading. `RECORD_SCREENS=1` writes the picture again, for a change meant to change a screen.
- `src/test/i18n.characterization.test.js`: every text in both languages, as hashes. `RECORD_I18N=1` prints them.

Before a deploy: `npm run lint && npm test && npm run build` (the build fails when the main chunk passes the 1 MiB precache limit).

## Updates

Every commit to `main` that changes the app adds an entry at the top of `public/changelog.json`
(`{ id, version, date, vi, en }`) and bumps `version` in `package.json` to match: a feature moves the middle number, a fix
the last. The update notice reads that file to say what a new version brings. A change nobody using the app would
notice (a refactor, tests, docs) is marked `"internal": true`: it keeps its version but is never shown.
