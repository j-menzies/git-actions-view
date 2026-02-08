# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production backend + bundled frontend
FROM node:22-alpine AS production
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/
COPY --from=frontend-build /app/frontend/dist ./public/
RUN mkdir -p /app/data
EXPOSE 9000
ENV NODE_ENV=production
CMD ["node", "src/index.js"]
