FROM node:22-alpine AS builder

WORKDIR /app

# Use pnpm via corepack pinned to the repo's packageManager version
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy required runtime files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY start.sh ./

# Install only production dependencies so dev tooling never ships in the image
RUN pnpm install --prod --frozen-lockfile

RUN chmod +x start.sh

EXPOSE 4000

CMD ["./start.sh"]