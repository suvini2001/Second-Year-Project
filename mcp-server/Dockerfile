FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install only what's needed to run (no dev tools), from the lock file
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Don't run as root (same as the backend image)
USER node
EXPOSE 3001
CMD ["node", "src/index.js"]