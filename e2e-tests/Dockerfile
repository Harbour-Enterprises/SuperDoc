FROM node:latest
WORKDIR /app
COPY package.json .
# Copy the entire Vue template so locally packed tarball is available during install
COPY templates/vue/ templates/vue/
RUN npm install
RUN npx playwright install  --with-deps chromium
COPY . .
CMD bash -c 'npx playwright test --workers=4 $PLAYWRIGHT_ARGS'