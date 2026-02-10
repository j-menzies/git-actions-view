# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend + bundled frontend
FROM node:22-alpine AS production

LABEL org.opencontainers.image.source="https://github.com/j-menzies/git-actions-view"
LABEL org.opencontainers.image.description="GitActionsView - Chronological GitHub Actions run log"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/
COPY --from=frontend-build /app/frontend/dist ./public/
RUN mkdir -p /app/data
EXPOSE 9000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
