ARG APP_NAME=order-service

FROM node:20-alpine AS builder
ARG APP_NAME
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
RUN npx nest build ${APP_NAME}

FROM node:20-alpine AS production
ARG APP_NAME
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV APP_NAME=${APP_NAME}

CMD ["sh", "-c", "if [ -f dist/apps/$APP_NAME/apps/$APP_NAME/src/main.js ]; then node dist/apps/$APP_NAME/apps/$APP_NAME/src/main.js; else node dist/apps/$APP_NAME/main.js; fi"]
