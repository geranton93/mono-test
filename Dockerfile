FROM node:20-alpine3.19 AS base
WORKDIR /app

FROM base AS build
RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*
COPY . .
RUN npm ci
RUN npm run build

FROM base AS development
COPY --from=build ./app/ ./
CMD [ "npm", "run", "start:dev" ]

FROM base AS deployment
COPY --from=build ./app/dist ./dist
COPY --from=build ./app/package*.json ./
RUN npm ci --omit=dev
CMD [ "node", "./dist/main.js" ]
