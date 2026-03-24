FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /work

COPY package.json package-lock.json ./
RUN npm ci

COPY render.mjs ./

ENTRYPOINT ["node", "render.mjs"]
