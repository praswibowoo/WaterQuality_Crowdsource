FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json ./web/
RUN npm ci
COPY web/. ./web/
RUN cd web && npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
