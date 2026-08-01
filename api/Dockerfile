FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY prisma ./prisma
RUN npm ci
COPY api/. ./api/
RUN cd api && npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache libssl3 openssl
WORKDIR /app
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/api/package.json ./api/
COPY --from=builder /app/api/node_modules ./api/node_modules
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "api/dist/index.js"]
