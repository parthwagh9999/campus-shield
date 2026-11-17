# ============================================================
# CampusShield University Panel — Multi-stage Docker Build
# ============================================================

# ------ Stage 1: Dependencies ------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# ------ Stage 2: Build ------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy application source
COPY tsconfig.json ./
COPY next.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Set build-time environment variables for Next.js
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# Build the Next.js application (outputs standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ------ Stage 3: Production Runtime ------
FROM node:20-alpine AS runtime

RUN apk add --no-cache dumb-init

# Run as non-root user for security
RUN addgroup -g 1001 -S campusshield && \
    adduser -S campusshield -u 1001 -G campusshield

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy the standalone output from Next.js build
COPY --from=builder --chown=campusshield:campusshield /app/.next/standalone ./
COPY --from=builder --chown=campusshield:campusshield /app/.next/static ./.next/static
COPY --from=builder --chown=campusshield:campusshield /app/public ./public

USER campusshield

# Expose the Next.js panel port
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
