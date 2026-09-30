#backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 1) copy only the package files firstCOPY package
COPY package.json package-lock.json ./

# 2) install exact versions, production only
RUN npm ci --omit=dev && npm cache clean --force

# 3) now copy the rest of the code
COPY . .

ENV NODE_ENV=production 

# 4) drop root : the node image ships a user called "node"
USER node

EXPOSE 8000

#5)Docker pings your health route every 30s

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:8000/api/health || exit 1

CMD ["node","server.js"]

