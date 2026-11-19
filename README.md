# BufferClone (YouTube & Instagram MVP)

Self-hosted, unlimited-channel social media scheduler and cross-poster built with Next.js, PostgreSQL, Prisma, FFmpeg, and a background publishing worker.

## Prerequisites

- **Node.js 20+** and **pnpm**
- **Docker** (for local PostgreSQL)
- **FFmpeg / ffprobe** (for inspecting uploaded video dimensions, codecs, and duration)

## Quick Start

1. **Configure environment variables**
   ```bash
   cp .env.example .env
   openssl rand -hex 32   # Paste into ENCRYPTION_KEY in .env
   ```
   Add your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (YouTube Data API v3) and `META_APP_ID` / `META_APP_SECRET` (Instagram API with Instagram Login) to `.env`.
   For Instagram publishing, configure either **S3 / Cloudflare R2** (`S3_*` vars) or `PUBLIC_MEDIA_BASE_URL` pointing to an HTTPS tunnel.

2. **Start PostgreSQL & run migrations**
   ```bash
   docker compose up -d
   pnpm db:generate
   pnpm db:push
   ```

3. **Run the web app & scheduler worker**
   ```bash
   # Terminal 1: Web UI & API
   pnpm dev

   # Terminal 2: Background scheduler & token refresher
   pnpm dev:worker
   ```

4. **Open** `http://localhost:3000/accounts` to connect your YouTube channels and Instagram Professional accounts, then compose cross-posts at `/compose`.

## Scripts

- `pnpm test` — Run Vitest unit tests
- `pnpm typecheck` — Run TypeScript type checking
- `pnpm build` — Build production Next.js bundle
