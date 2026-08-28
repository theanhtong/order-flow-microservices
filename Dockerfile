ARG APP_NAME=order-service

FROM node:20-slim AS production
ARG APP_NAME
ENV SERVICE_NAME=${APP_NAME}

WORKDIR /usr/src/app
COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist

CMD ["sh", "-c", "node dist/apps/${SERVICE_NAME}/apps/${SERVICE_NAME}/src/main.js"]
