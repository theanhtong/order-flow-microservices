FROM node:20-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json nest-cli.json ./
COPY apps ./apps
COPY libs ./libs
RUN npm run build:order

FROM node:20-alpine AS production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV ORDER_SERVICE_PORT=3001
EXPOSE 3001

CMD ["node", "dist/apps/order-service/main.js"]
