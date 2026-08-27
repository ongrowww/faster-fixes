# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl util-linux \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

FROM base AS dependencies

COPY . .
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

ARG APP_ORIGIN=https://feedback.ongrow.de

ENV NODE_ENV=production
ENV DOMAIN_NAME=feedback.ongrow.de
ENV BASE_URL=$APP_ORIGIN
ENV BETTER_AUTH_URL=$APP_ORIGIN
ENV BETTER_AUTH_SECRET=build-placeholder
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DATABASE_ADAPTER=postgres
ENV STORAGE_PROVIDER=s3
ENV STORAGE_ENDPOINT=https://nbg1.your-objectstorage.com
ENV STORAGE_REGION=eu-central
ENV STORAGE_BUCKET_NAME=build-placeholder
ENV AWS_ACCESS_KEY_ID=build-placeholder
ENV AWS_SECRET_ACCESS_KEY=build-placeholder
ENV RESEND_API_KEY=re_build_placeholder
ENV GITHUB_APP_ID=build-placeholder
ENV GITHUB_PRIVATE_KEY=build-placeholder
ENV SLACK_TOKEN_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENV LINEAR_TOKEN_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENV JIRA_TOKEN_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
ENV NEXT_PUBLIC_FF_API_ORIGIN=$APP_ORIGIN
ENV NEXT_PUBLIC_IS_CLOUD=false

RUN pnpm build

FROM base AS migrator

ENV NODE_ENV=production
ENV RUN_AS_UID=1000
ENV RUN_AS_GID=1000

LABEL org.opencontainers.image.source="https://git.ongrow.de/ongrow/faster-fixes"

COPY --from=dependencies --chown=node:node /app /app

RUN chmod 0755 /app/docker/entrypoint.sh

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["pnpm", "--dir", "packages/database", "exec", "prisma", "migrate", "deploy"]

FROM node:24-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV RUN_AS_UID=1001
ENV RUN_AS_GID=1001

LABEL org.opencontainers.image.source="https://git.ongrow.de/ongrow/faster-fixes"

WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl util-linux \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod 0755 /app/docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
