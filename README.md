#  Portfolio Cá Nhân

Portfolio cá nhân được xây dựng với **React + Vite**, thiết kế dark theme hiện đại với accent màu lime.

##  Tính năng

-  Dark theme với palette lime/cyan/purple
-  Typing effect ở Hero section
-  Skills visualization với radar chart + animated bars
-  Projects với filter theo category + modal detail
-  Experience timeline interactive
-  Contact form
-  Testimonials
-  Custom cursor (desktop)
-  Scroll reveal animations
-  Fully responsive
-  Custom hooks: useTypingEffect, useScrollAnimation, useDarkMode

##  Cài đặt & Chạy

```bash
# Cài dependencies
npm install

# Chạy development
npm run dev

# Build production
npm run build

# Preview build
npm run preview
```

##  Cấu trúc

```
src/
├── assets/          # Ảnh, icon, font
├── components/      # UI components dùng chung
│   ├── common/      # Button, Navbar, Footer, SectionTitle
│   ├── ui/          # Card, Modal, Badge
│   └── animations/
├── sections/        # Từng section portfolio
│   ├── Hero/
│   ├── About/
│   ├── Skills/
│   ├── Projects/
│   ├── Experience/
│   ├── Contact/
│   └── Testimonials/
├── pages/           # Route pages
├── layouts/         # MainLayout
├── routes/          # AppRoutes
├── hooks/           # Custom hooks
├── data/            # Static data
├── services/        # API calls
├── styles/          # Global CSS
└── utils/           # Helpers, constants
```

##  Tuỳ chỉnh

Sửa thông tin cá nhân trong:
- `src/data/socials.js` — Thông tin cá nhân, experience, education
- `src/data/projects.js` — Danh sách projects
- `src/data/skills.js` — Skills và tech stack
- `src/styles/variables.css` — Design tokens (màu sắc, font...)

##  Deploy

```bash
# Build
npm run build

# Deploy lên Vercel
vercel --prod

# Hoặc Netlify
netlify deploy --prod --dir=dist
```
