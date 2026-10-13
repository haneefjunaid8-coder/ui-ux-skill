# ROOT-X web app (Step 1 foundation)

Installable Progressive Web App for deliveries within UNIOSUN and approved student-township areas.
This is a web application only; there are no native Android or iOS projects.

## Stack
- Vite + React 19 + TypeScript
- React Router 7 (client-side routing, lazy-loaded design-system page)
- Plain CSS with design tokens (`src/styles/tokens.css`)
- vite-plugin-pwa (manifest + service worker, production builds)
- Vitest + Testing Library

## Scripts
```bash
npm install
npm run dev       # development server on port 5173
npm run build     # type-check, then production build to dist/
npm run preview   # serve the production build on port 4173
npm test          # unit and integration tests
npm run typecheck
```

## Structure
```
src/
  app/          App shell, router, PWA registration
  components/
    layout/     Container, Section, Logo, SiteHeader, SiteFooter, RootLayout
    ui/         Button, Field (text/textarea/select), Card, Badge, cx helper
    feedback/   LoadingState, EmptyState, ErrorState, NavigationProgress
  content/      Site copy and structured content (nav, highlights, steps)
  pages/        LandingPage, DesignSystemPage, NotFoundPage, RouteErrorPage
  styles/       tokens, base, layout, components, pages
  test/         Test setup and app tests
public/         Favicon, PWA icons (placeholder branding)
```

## Status
- Placeholder branding: the logo, colours and name are temporary until approved.
  Change them in `src/styles/tokens.css` and `src/components/layout/Logo.tsx`.
- Not built yet (later steps): authentication, payments, rider management, delivery tracking.
