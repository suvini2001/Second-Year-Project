# Stage 1: build -
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json i/
RUN npm ci

copy . .

# values baked into the JavaScript at build time
ARG VITE BACKEND_URL=http://loca1host:8000
ARG VITE_BASE_PATH=/
ENV VITE BACKEND_URL=$VITE BACKEND_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH


RUN npm run build
#-------------- Stage 2: serve ---------------------
FROM nginx:1.27-a1pine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
