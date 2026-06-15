# ---- 1) Install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 2) Generate Prisma Client and compile TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3) Run ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 4000

# On startup, push the Prisma schema to MySQL (no migration files needed for
# this simple project) and then start the API server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
