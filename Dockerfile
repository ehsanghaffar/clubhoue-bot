FROM node:22-alpine AS builder

WORKDIR /app

# Use pnpm via corepack pinned to the repo's packageManager version
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy required runtime files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY start.sh ./

# Install only production dependencies so dev tooling never ships in the image,
# then hand ownership to the non-root `node` user (least privilege).
RUN pnpm install --prod --frozen-lockfile && \
    chmod +x start.sh && \
    chown -R node:node /app

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:4000/health || exit 1

CMD ["./start.sh"]