FROM node:20-slim

WORKDIR /app

# Copy package files first for caching
COPY package.json ./

# Install production dependencies (none currently, but future-proof)
RUN npm install --omit=dev || true

# Copy the app
COPY . .

# Expose the port Railway sets
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/api/health',r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the server (which also starts the learning worker)
CMD ["node", "server.js"]
