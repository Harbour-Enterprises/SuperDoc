FROM node:latest
WORKDIR /app
# Copy only the main package.json first for better layer caching
COPY package.json .
RUN npm install
RUN npx playwright install  --with-deps chromium
# Copy the Vue template after npm install to avoid cache invalidation
COPY templates/vue/ templates/vue/
COPY . .
CMD bash -c 'npx playwright test $PLAYWRIGHT_ARGS --workers=4'