# Tenure in one container: the API serves the built web app.
# Node 26 runs the TypeScript source directly, so only the web app is built.

# ---- manifests: every package.json and the lockfile, nothing else ----
# The installs below copy only these, so a source edit reuses them; only a package.json or lockfile change re-runs
# npm ci. The globs match the workspaces in package.json, so a new package needs no edit here.
FROM node:26-bookworm-slim AS manifests
WORKDIR /src
COPY package.json package-lock.json ./
COPY apps apps
COPY packages packages
RUN mkdir /out \
 && cp package.json package-lock.json /out/ \
 && for f in apps/*/package.json packages/*/package.json; do \
      mkdir -p "/out/${f%/package.json}" && cp "$f" "/out/$f"; \
    done

# ---- build: full install, then build the web app ----
FROM node:26-bookworm-slim AS build
WORKDIR /app
# Only used if better-sqlite3 has no prebuilt binary for this platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY --from=manifests /out ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build -w @tenure/web

# ---- deps: the API's production dependencies only (and those of the workspace packages it uses) ----
FROM node:26-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY --from=manifests /out ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace @tenure/api

# ---- runtime ----
FROM node:26-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5175 \
    TENURE_SERVE_CLIENT=1 \
    TENURE_DB=/data/tenure.db
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN mkdir -p /data && chown node:node /data && chmod +x scripts/docker-entrypoint.sh
USER node
EXPOSE 5175
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5175)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["scripts/docker-entrypoint.sh"]
