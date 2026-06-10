# Sirhaana — Capsules AI

AI-powered product catalogue platform. Upload product images, let the AI pipeline process and enrich them, browse your brand catalogue, build custom capsule collections, and preview products in an AR scene.

## Stack

- **Next.js 16.2.6** (App Router, Turbopack)
- **React 19** + **TypeScript**
- **Tailwind CSS v4**
- Backend API — separate service, must be running on `http://localhost:3000` (or configured via env var)

---

## Prerequisites

- **Node.js v18+** (v22 recommended — matches dev environment)
- **npm v9+**
- The **Sirhaana backend service** running and accessible (see [Environment](#environment))

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/DiwakarNegi/Sirhaana-demo.git
cd Sirhaana-demo

# 2. Install dependencies
npm install
```

---

## Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This tells the frontend where the backend API is running. The default is `http://localhost:3000` if the file is omitted, but creating it explicitly is recommended.

> **Important:** The backend must be started separately before the frontend will load any data. The frontend itself runs on port **3001** (see below) to avoid conflicting with the backend on port 3000.

---

## Running the Dev Server

```bash
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

> **Why port 3001?** The backend API runs on port 3000 by default. Running the frontend on a different port prevents them from conflicting.

### Windows — Recommended: Add a Defender Exclusion

On Windows, Microsoft Defender scanning the project folder on every file-write can cause Turbopack's file watcher to spiral into a runaway process loop, eventually crashing the machine. Before running the dev server, add the project folder to the exclusion list:

1. Open **Windows Security** → **Virus & threat protection** → **Manage settings**
2. Scroll to **Exclusions** → **Add or remove exclusions**
3. Add a **Folder** exclusion pointing to the project root (e.g. `C:\Users\<you>\Desktop\Sirhaana-demo`)

If you see dozens of `node.exe` processes in Task Manager after starting the server, kill them all with:
```powershell
taskkill /F /IM node.exe /T
```
Then add the exclusion above before restarting.

---

## Building for Production

```bash
npm run build
npm run start
```

The production server starts on port 3000 by default. Run it on a different port if the backend is also on 3000:

```bash
npm run start -- --port 3001
```

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout — fonts, metadata, global styles
│   ├── page.tsx            # Main page — tab switching, floating selection bar
│   └── globals.css         # CSS variables (dark theme tokens, fonts)
│
├── components/
│   ├── Nav.tsx             # Top navigation bar
│   ├── Hero.tsx            # Hero section (Pipeline tab only)
│   ├── PipelineTab.tsx     # AI Pipeline — upload images, run processing
│   ├── BrandTab.tsx        # Brand Catalogue — browse & select products
│   ├── CustomTab.tsx       # Custom Catalogue — build capsule collections
│   └── ARTab.tsx           # AR Visualiser — preview products in a room scene
│
├── lib/
│   ├── api.ts              # All backend API calls (fetch wrappers)
│   ├── types.ts            # Shared TypeScript types (Tab, etc.)
│   └── data.ts             # Static/fallback data
│
├── public/                 # Static assets
├── next.config.ts          # Next.js config (Turbopack root pinned to project dir)
└── .env.local              # Local environment variables (not committed)
```

---

## Features

| Tab | Description |
|-----|-------------|
| **AI Pipeline** | Upload product images, choose a commerce category, and trigger AI processing to generate enriched inventory entries |
| **Brand Catalogue** | Browse all processed products in a card grid; select items for further use |
| **Custom Catalogue** | Compose and share custom capsule collections from selected products |
| **AR Visualiser** | Drop a selected product into a configurable room scene with size and opacity controls |

---

## API

All API calls go through `lib/api.ts`. The base URL is:

```
NEXT_PUBLIC_API_URL + /v1
```

Key endpoints consumed:

| Method | Path | Used by |
|--------|------|---------|
| `GET` | `/v1/inventory` | BrandTab — load product catalogue |
| `POST` | `/v1/media/urls` | PipelineTab — get S3 presigned upload URLs |
| `PUT` | S3 presigned URL | PipelineTab — upload image files |
| `POST` | `/v1/ai/process-inventory` | PipelineTab — trigger AI processing |
| `GET` | `/v1/ai/process-inventory/status` | PipelineTab — poll processing status |
| `POST` | `/v1/capsule` | CustomTab — generate a capsule |
| `GET` | `/v1/capsule/:id` | CustomTab — fetch capsule result |

---

## Troubleshooting

**Catalogue shows empty / 404 errors in console**
The backend is not running or not reachable at `NEXT_PUBLIC_API_URL`. Start the backend service first, then refresh.

**`npm run dev` crashes the laptop (Windows)**
See the [Windows Defender exclusion](#windows--recommended-add-a-defender-exclusion) section above. Also ensure no stray Next.js process is already bound to the target port (`netstat -ano | findstr :3001`).

**"Fatal process out of memory: Zone"**
Clear the Next.js cache and restart:
```bash
rm -rf .next
npm run dev -- --port 3001
```

**Fallback: disable Turbopack**
If Turbopack continues to misbehave on your machine, use the webpack bundler instead:
```bash
npm run dev -- --port 3001 --webpack
```
