FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache bash coreutils
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.openai ./.openai
COPY --from=builder /app/scripts ./scripts
EXPOSE 3000
CMD ["npm", "run", "start"]
