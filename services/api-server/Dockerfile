# ============================================================
# CampusShield API Server — Multi-stage Docker Build
# ============================================================

# ------ Stage 1: Build ------
FROM node:20-alpine AS builder

# Install native build deps required by argon2
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for compilation)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# ------ Stage 2: Production Runtime ------
FROM node:20-alpine AS runtime

# argon2 needs libstdc++ at runtime
RUN apk add --no-cache dumb-init libstdc++

# Run as non-root user for security
RUN addgroup -g 1001 -S campusshield && \
    adduser -S campusshield -u 1001 -G campusshield

WORKDIR /app

# Copy package files and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from build stage
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R campusshield:campusshield /app

USER campusshield

# Expose the API server port
EXPOSE 3001

# Use dumb-init to handle PID 1 responsibilities (signal forwarding)
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
