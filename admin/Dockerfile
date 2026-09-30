# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_URL=http://localhost:8000
ARG VITE_BASE_PATH=/
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80