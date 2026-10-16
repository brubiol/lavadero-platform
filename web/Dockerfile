# ── Build stage ──────────────────────────────────────────────────
# Builder runs natively on the CI machine; the static bundle is architecture-independent.
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
WORKDIR /app

COPY package*.json .
RUN npm ci

COPY . .
RUN npm run build

# ── Serve stage ──────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
