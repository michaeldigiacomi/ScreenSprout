# ScreenSprout Web App

The frontend web application for ScreenSprout - a parental control and screen time management solution.

## Tech Stack

- **Framework:** React 19
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3
- **UI Components:** Custom components (Badge, Button, Card, Input)
- **State Management:** TanStack React Query (server state) + React Context (theme, auth)
- **Routing:** React Router 7
- **HTTP Client:** Axios with CSRF interceptor
- **Charts:** Recharts
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Backend API URL (proxied to localhost:3000 in dev) |

### Installation

```bash
npm install
```

### Development

```bash
npm run dev          # Start dev server at http://localhost:5173
npm run host         # Dev server accessible on LAN
```

The dev server proxies `/api` requests to `http://localhost:3000` (the backend API).

### Building

```bash
npm run build        # Production build (generates health.json first)
npm run preview      # Preview production build locally
```

### Testing

```bash
npm test             # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:coverage # Vitest with coverage
npm run test:ci      # Vitest CI mode (JUnit output)
npm run test:e2e     # Playwright E2E tests (5 browsers)
npm run test:visual  # Playwright visual regression tests
```

### Linting

```bash
npm run lint          # Run ESLint
npm run lint:fix     # ESLint auto-fix
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/           # Design system primitives (Badge, Button, Card, Input)
├── context/          # React context providers (ThemeContext)
├── hooks/            # Custom React Query hooks (useChildren, useDevices, etc.)
├── lib/              # Utilities (api.js, csrf.js, analytics.js)
├── layouts/          # Layout components (DashboardLayout)
└── pages/            # Route-level page components
```

## Deployment

Docker image is built via GitHub Actions and pushed to `ghcr.io/screensprout/web`. Deploys to the `screensprout` K8s namespace via Traefik ingress at `app.screensprout.digitaladrenalin.net`.

See `k8s/` directory for Kubernetes manifests and `k8s/README.md` for deployment details.

## Related Repositories

- [ScreenSprout API](https://github.com/DiGiacomi-Shared/screen-sprout-api) - Backend API server
- [ScreenSprout Mobile](https://github.com/DiGiacomi-Shared/screen-sprout-mobile) - Android companion app
- [ScreenSprout Desktop](https://github.com/DiGiacomi-Shared/screen-sprout-desktop) - Windows/Linux daemon
- [ScreenSprout Docs](https://github.com/DiGiacomi-Shared/screen-sprout-docs) - Documentation