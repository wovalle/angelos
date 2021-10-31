FROM node:16-alpine as builder

WORKDIR /usr/src/app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build application
COPY tsconfig*.json ./
COPY src src
RUN yarn build


FROM node:16-alpine
ENV NODE_ENV=production
VOLUME ["/var/run/docker.sock"]

RUN apk add --no-cache tini
WORKDIR /usr/src/app

RUN chown node:node .
USER node

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY --from=builder /usr/src/app/dist/ dist/

ENTRYPOINT [ "/sbin/tini","--", "node", "dist" ]
