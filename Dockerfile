FROM node:20.10-alpine AS base

FROM base as deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

FROM base as builder
WORKDIR /app
ARG VERSION
RUN test -n "$VERSION" || (echo "VERSION build-arg is required" && false)
ENV NEXT_PUBLIC_VERSION=$VERSION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn prisma generate && yarn build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
RUN yarn global add prisma@5.8.1

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
