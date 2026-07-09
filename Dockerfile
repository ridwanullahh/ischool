# iSchool Production Dockerfile
# Multi-stage build for optimal image size

# ═══════════════════════════════════════════════════════
# Stage 1: Build
# ═══════════════════════════════════════════════════════
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ═══════════════════════════════════════════════════════
# Stage 2: Runtime
# ═══════════════════════════════════════════════════════
FROM node:22-slim AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create directories for persistent data
RUN mkdir -p /app/data /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4321
ENV HOST=0.0.0.0

# Expose port
EXPOSE 4321

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the application
CMD ["node", "./dist/server/entry.mjs"]
