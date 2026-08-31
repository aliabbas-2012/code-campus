# Build stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tini

# Copy built application and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
