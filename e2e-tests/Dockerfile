FROM mcr.microsoft.com/playwright:v1.57.0-jammy
WORKDIR /app

# Install a minimal set of fonts so UI typography matches local dev closer
RUN apt-get update && \
    apt-get install -y --no-install-recommends fonts-liberation fonts-dejavu-core fonts-noto-core && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies (root + workspace) using the lockfile
COPY package.json package-lock.json superdoc.tgz ./
COPY templates/vue/package.json templates/vue/package.json
RUN npm ci

# Bring in the rest of the project
COPY . .

CMD bash -c 'npx playwright test $PLAYWRIGHT_ARGS --workers=4'
