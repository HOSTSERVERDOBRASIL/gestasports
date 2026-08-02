FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci

FROM deps AS build

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
COPY frontend ./frontend

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build:all

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
