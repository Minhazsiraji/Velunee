# Velunee API — container image for cloud deploy (Render / Fly / Cloud Run).
# The mobile app talks to this over HTTPS. Build context is the monorepo root;
# node_modules / dist / .env are excluded via .dockerignore for a clean build.
FROM node:22.16.0-bookworm-slim

# pnpm comes from corepack; the exact version is pinned by
# "packageManager": "pnpm@11.11.0" in the root package.json.
RUN corepack enable
WORKDIR /app

# Copy the whole workspace, then install every dependency so the root
# toolchain (turbo, typescript, nest CLI) is present for the build step.
COPY . .
RUN pnpm install --frozen-lockfile

# Build only the API and the workspace packages it depends on
# (contracts, ai-core, auth-core, database, …) in topological order.
# The mobile app and admin site are intentionally NOT built here.
RUN pnpm --filter=@velunee/api... run build

# Render/Fly inject PORT at runtime; main.ts reads process.env.PORT and
# binds 0.0.0.0, so no port is hardcoded here.
ENV NODE_ENV=production
CMD ["node", "apps/api/dist/main.js"]
