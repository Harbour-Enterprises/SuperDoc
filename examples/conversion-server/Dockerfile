# SuperDoc Conversion Server
# Includes LibreOffice for .doc to .docx conversion

FROM node:20-slim

# Install LibreOffice and required dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-writer \
    fonts-liberation \
    fonts-dejavu \
    fonts-freefont-ttf \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f -v

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy server code
COPY server.js ./

# Create temp directory for conversions
RUN mkdir -p /tmp/superdoc-conversions

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

# Run as non-root user for security
RUN useradd -m -s /bin/bash appuser && \
    chown -R appuser:appuser /app /tmp/superdoc-conversions
USER appuser

# Start server
CMD ["node", "server.js"]
