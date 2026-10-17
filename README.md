# Võ Gia Huy — Portfolio

Personal portfolio of [Hank62-dev](https://github.com/Hank62-dev). React 18 + Vite + React Router, styled with Tailwind CSS 4 (no UI library, no CSS files besides one).
English and Vietnamese, switchable in the navbar.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build locally
```

Deploys as a static site (Vercel). `vercel.json` rewrites unknown paths to `index.html`, so deep links such as `/projects/smart-center` work.

## Editing content

All content is data; no component needs touching for routine updates.

| To change…                         | Edit                                   |
| ---------------------------------- | -------------------------------------- |
| Profile facts, socials, email      | `src/data/profile.js`                  |
| Projects, lab items, archive rows  | `src/data/projects.js`                 |
| Headlines and interface text (EN/VI) | `src/data/copy.js`                   |
| Colours, type scale, spacing, breakpoints, keyframes | `src/styles/index.css` (`@theme`) |

A project is `{ slug, tier, name, year, kind, tagline, summary, role?, decisions[], layers, links[], cover }`.
`tier` is `featured` (home list + case page), `lab` (Lab section + case page) or `archive` (table row).
`layers` (`interface` / `service` / `data` / `delivery`) feeds the **Stack** section, which is generated, never hand-written —
a technology only appears if a project lists it. Fields are optional where it makes sense (`role`, `decisions`, `cover`);
leave out what you cannot verify. Old numeric ids (`/projects/1`) still resolve.

## Structure

```
src/
├── components/
│   ├── common/    Navbar, Footer, Button, SectionTitle, LangToggle, ScrollProgress
│   └── ui/        Tag, ProjectMark, Marquee, CountUp
├── data/          profile, projects, copy                             (content, no JSX)
├── hooks/         useGithub, useReveal, useActiveSection, usePageMeta, useMotion (pointer effects)
├── layouts/       MainLayout (skip link, scroll management)
├── lib/           i18n context, formatting, contribution maths, scroll helper
├── pages/         Home, ProjectDetail, NotFound
├── routes/        AppRoutes
├── sections/      Hero, Work, Stack, Lab, About, Activity, Contact    (one folder per home section)
├── services/      githubService                                       (the only network code)
└── styles/        index.css (Tailwind entry: @theme tokens, custom variants/utilities, reveal + reduced-motion rules)
```

## GitHub data

`services/githubService.js` reads the public GitHub REST API and the third-party
[github-contributions-api](https://github-contributions-api.jogruber.de) once per visit, validates and trims the payloads,
and caches the snapshot in `localStorage` for one hour (unauthenticated GitHub limit: 60 requests/hour/IP).
If a source fails the page shows only what it has — it never fills in numbers.

## Notes

- `unused-assets/` holds images from the previous version that the site no longer references
  (a SmartCenter banner containing invented statistics, a stock ad, older portraits). Delete when no longer needed.
- Social preview image: `public/og.png` (1200×630). Canonical URL and sitemap assume `https://portfolio-vgh.vercel.app`.

## Styling

Everything is Tailwind utility classes in the JSX; there are no CSS Modules. `src/styles/index.css` holds:

- **`@theme`** — the design tokens as utilities: `bg-ink-1`, `text-bone-dim`, `text-signal`, `font-display`, `text-h2`, `px-gutter`, `py-section`, `ease-out-expo`, `animate-marquee` …
- **Breakpoints** — `xs 560`, `sm 640`, `md 760`, `nav 860` (where the menu collapses), `lg 1000`, `xl 1100`. Note `md` is 760, not Tailwind's default 768.
- **Custom variants** — `in:` (inside a scroll-revealed element), `unrevealed:` (JS running, not yet revealed), `fine:` (a real mouse).
- **Custom utilities** — `wrap`, `mono`, `serif-accent`, `line-mask`, `enter`, `page-in`.
- The few rules that need the `html.js` class or runtime state (`[data-reveal]`) and the `prefers-reduced-motion` block.
