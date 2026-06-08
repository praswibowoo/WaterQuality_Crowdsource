FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema=./prisma/schema.prisma
COPY api/. ./api/
RUN cd api && npx tsc

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/package.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "dist/index.js"]
