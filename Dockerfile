FROM node:20-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm db:generate

COPY . .
RUN chmod +x scripts/start-prod.sh
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["./scripts/start-prod.sh"]
