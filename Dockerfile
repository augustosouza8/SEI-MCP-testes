FROM mcr.microsoft.com/playwright:v1.58.0-jammy

WORKDIR /app
ENV NODE_ENV=production

# pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install deps (including vendored sei-playwright)
COPY package.json pnpm-lock.yaml ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile

# Build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# Render provides PORT; server reads process.env.PORT
EXPOSE 10000

CMD ["pnpm", "start:http"]

