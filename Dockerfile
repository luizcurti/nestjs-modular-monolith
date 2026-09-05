FROM node:24-alpine

LABEL BOILERPLATE="QSO"

# Install curl for health check and security updates
RUN apk update && apk upgrade && apk add --no-cache curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

RUN mkdir -p /usr/app
WORKDIR /usr/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Change ownership to nodejs user
RUN chown -R nextjs:nodejs /usr/app
USER nextjs

EXPOSE 3000

# Health check using curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/v1/credit || exit 1

CMD [ "npm", "run", "start:prod" ]