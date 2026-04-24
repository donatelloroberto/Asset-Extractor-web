# Stremio Add-ons (Asset-Extractor)

## Overview

A full-stack Stremio add-on server that provides 8 content providers converted from Cloudstream 3 extensions. Features a React dashboard for monitoring and managing the add-ons, with full Vercel deployment support.

## Architecture

### Tech Stack
- **Backend**: Node.js + Express (TypeScript) with tsx for development
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui components
- **Build**: esbuild (server) + Vite (client)
- **Cache**: node-cache (in-memory, per provider)
- **Scraping**: Cheerio + Axios

### Project Structure
```
├── server/
│   ├── index.ts          # Dev/prod server entry (starts listening)
│   ├── app.ts            # Express app factory (used by Vercel too)
│   ├── logger.ts         # Shared logging utility
│   ├── routes.ts         # All Express route registrations
│   ├── static.ts         # Static file serving (production)
│   ├── vite.ts           # Vite dev middleware
│   ├── storage.ts        # Storage layer (currently MemStorage stub)
│   ├── stremio/          # GXtapes provider
│   ├── nurgay/           # Nurgay provider
│   ├── fxggxt/           # Fxggxt provider
│   ├── justthegays/      # JustTheGays provider
│   ├── besthdgayporn/    # BestHDgayporn provider
│   ├── boyfriendtv/      # BoyfriendTV provider
│   ├── gaycock4u/        # Gaycock4U provider
│   └── gaystream/        # GayStream provider
├── client/src/
│   ├── App.tsx
│   ├── pages/dashboard.tsx
│   └── components/ui/    # shadcn/ui components
├── api/
│   └── index.ts          # Vercel serverless function entry
├── shared/
│   └── schema.ts         # Shared types (StremioMeta, StremioStream, etc.)
├── script/build.ts       # Production build script (esbuild + vite)
├── vercel.json           # Vercel deployment config
└── vite.config.ts        # Vite config (Replit plugins conditional)
```

### Provider Architecture
Each provider folder contains:
- `manifest.ts` — Stremio manifest + catalog map
- `provider.ts` — Catalog/meta/stream fetching logic
- `extractors.ts` — Video host URL extraction
- `ids.ts` — ID encoding/decoding (base64 URLs)

## Stremio API Endpoints

Each provider exposes:
- `GET /[provider]/manifest.json` — Stremio manifest
- `GET /[provider]/catalog/:type/:id.json` — Catalog list
- `GET /[provider]/catalog/:type/:id/:extra.json` — Catalog with skip/search
- `GET /[provider]/meta/:type/:id.json` — Video metadata
- `GET /[provider]/stream/:type/:id.json` — Stream URLs

The root manifest (`/manifest.json`) aggregates all providers via the GXtapes add-on.

### Proxy Endpoint
`GET /proxy/stream?url=<encoded>&referer=<encoded>` — Bypasses referer/user-agent restrictions for certain video hosts.

## Dashboard & Web API
- `GET /api/status` — Server status, uptime, cache stats, all add-on info
- `GET /api/catalogs` — All catalogs grouped by provider
- `GET /api/catalog/:id` — Browse specific catalog
- `GET /api/meta/:id` — Fetch metadata
- `GET /api/search?q=<query>&limit=<n>&providers=<csv>` — Cross-provider search (all 8 providers in parallel)
- `GET /api/stream-check?url=<url>&referer=<ref>` — Stream health check (HEAD probe, returns status/content-type)
- `POST /api/cache/clear` — Clear all caches

## Provider Registry (`server/provider-registry.ts`)
Centralised registry of all 8 providers. Eliminates repetitive per-provider routing — `routes.ts` uses this to dispatch catalog/meta/stream requests by ID prefix automatically.

## Stream Ranking (`server/stremio/stream-ranker.ts`)
All stream responses are sorted by quality score (4K > 1080p > 720p > 480p) before being returned to the client, ensuring the best source is always tried first.

## Frontend Improvements
- **Watch page**: Animated loading state with retry counter, actionable error states with retry buttons, source count badge
- **Video player**: Auto-fallback to next source on error with "Switching source…" toast notification; N key shortcut for next source; volume persisted to localStorage; "Try again from source 1" on total failure
- **Browse page**: Cross-provider search button calls `/api/search` to aggregate results from all 8 providers simultaneously

## Running

```bash
npm install
npm run dev      # Development (port 5000)
npm run build    # Production build (esbuild + vite)
npm start        # Serve production build
```

## Vercel Deployment

The project is fully configured for Vercel:

1. `vercel.json` routes all Stremio API paths to the serverless function in `api/index.ts`
2. The React frontend is built to `dist/public/` and served as static files
3. Build command: `npm run vercel-build` (runs Vite only; Vercel compiles the API function automatically)

### Deploying
```bash
vercel --prod
```
Or connect the repository to Vercel and it will auto-deploy.

### Important Notes for Vercel
- In-memory cache resets on each cold start (serverless limitation)
- The `/proxy/stream` endpoint streams video through the server — works on Vercel but adds latency
- No database is required; all data is scraped on-demand and cached in memory
- Function max duration is set to 60s in `vercel.json`

## Environment Variables
- `PORT` — Server port (default: 5000, used in local dev)
- `NODE_ENV` — `development` or `production`
- `DEBUG` — Set to `"1"` to enable verbose provider logging

## Vite Config Notes
Replit-specific plugins (`runtimeErrorOverlay`, `cartographer`, `devBanner`) are only loaded when `REPL_ID` env var is set (i.e., running inside Replit). They are skipped in Vercel builds automatically.
