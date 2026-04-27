# syntax=docker/dockerfile:1.6
#
# EU Climate Policy Navigator — production container
# ---------------------------------------------------
# Single image that runs the full Next.js app (SSR + API routes) with no
# Vercel dependency. Three stages keep the final image small (~180 MB):
#
#   1. deps      — install all npm deps (including dev) in a warm cache
#   2. builder   — run `next build` with output:'standalone'
#   3. runner    — copy only the standalone bundle + static assets
#
# Build:   docker build -t methodhub-app .
# Run:     docker run --rm -p 3000:3000 --env-file .env.local methodhub-app
#
# For the EEA-style self-hosted deployment see docs/DEPLOYMENT-EEA.md.

# ----- 1. deps --------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
# Install without running postinstall (it writes into /public which we copy
# fresh in the builder stage).
RUN npm ci --ignore-scripts

# ----- 2. builder -----------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run postinstall now that /public exists in the build context: this copies
# pdfjs-dist's worker into /public/pdf.worker.min.mjs.
RUN node -e "require('fs').copyFileSync('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/pdf.worker.min.mjs')"
# Build-time env — Supabase URL + anon key are baked into the client bundle.
# Provide via --build-arg or a build-time .env.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----- 3. runner ------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Non-root user — matches the EEA baseline for Docker/Podman workloads.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs
# The Next 14 standalone output contains a minimal server.js + only the
# production dependencies the runtime actually imports.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
