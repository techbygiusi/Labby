FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies. Configure resilient retries first so a transient
# registry reset (ECONNRESET / network aborted) retries instead of failing the build.
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000 \
 && npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p ./data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "const http = require('http'); const port = process.env.BACKEND_PORT || 3001; const req = http.get({ hostname: '127.0.0.1', port, path: '/api/health', timeout: 3000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('timeout', () => { req.destroy(); process.exit(1); }); req.on('error', () => process.exit(1));"

# Start application
CMD ["node", "app.js"]
