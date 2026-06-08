FROM node:20-alpine AS builder
WORKDIR /app
COPY api/package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema=./prisma/schema.prisma
COPY api/. .
RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "dist/index.js"]
