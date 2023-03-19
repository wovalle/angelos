FROM node:18-alpine as builder

WORKDIR /usr/src/app

# Install dependencies
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Build application
COPY tsconfig*.json ./
COPY src src
RUN pnpm build


FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /usr/src/app
RUN npm install -g pnpm

# TODO(v3): make configurable (or maybe multiple images?)
ADD https://github.com/just-containers/s6-overlay/releases/download/v2.2.0.1/s6-overlay-amd64-installer /tmp/
ADD https://github.com/cloudflare/cloudflared/releases/download/2021.11.0/cloudflared-linux-amd64 /tmp/

RUN chmod +x /tmp/s6-overlay-amd64-installer && /tmp/s6-overlay-amd64-installer /
RUN ls -la /tmp && chmod +x /tmp/cloudflared-linux-amd64 && mv /tmp/cloudflared-linux-amd64 /usr/local/bin/cloudflared

COPY package*.json pnpm-lock.yaml ./
RUN pnpm install

COPY --from=builder /usr/src/app/dist/ dist/

COPY rootfs /

ENTRYPOINT ["/init"]

