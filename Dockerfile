# MQLT API — NestJS runtime. Hot-patches are already merged into backend/dist.
FROM node:22-alpine

RUN apk add --no-cache tini su-exec curl openssl libc6-compat postgresql-client \
    && addgroup -g 10001 mqlt \
    && adduser -D -H -u 10001 -G mqlt mqlt \
    && mkdir -p /app

WORKDIR /app

COPY backend/package.json /app/package.json
RUN npm install --omit=dev && npm cache clean --force

COPY backend/dist /app/dist
COPY prisma /app/prisma
COPY lib /app/lib
COPY sql /app/sql
COPY docker/api-entrypoint.sh /usr/local/bin/mqlt-api-entrypoint.sh

RUN chmod +x /usr/local/bin/mqlt-api-entrypoint.sh \
    && chown -R mqlt:mqlt /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NODE_PATH=/app/node_modules

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/mqlt-api-entrypoint.sh"]
