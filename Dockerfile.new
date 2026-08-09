FROM node:22-alpine AS builder

WORKDIR /app

# Use pnpm via corepack and install using the lockfile for reproducible installs
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

# Enable corepack and activate pnpm for runtime to allow start.sh to use pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy required runtime files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY start.sh ./

RUN chmod +x start.sh

EXPOSE 4000

CMD ["./start.sh"]
