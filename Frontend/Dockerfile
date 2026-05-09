FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV RAILWAY_ENVIRONMENT=true
RUN npm run build

FROM node:20-slim

WORKDIR /app
COPY --from=build /app/.output .output
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json

EXPOSE 3000

CMD ["sh", "-c", "if [ -f .output/server/index.mjs ]; then node .output/server/index.mjs; elif [ -d dist ]; then npx serve dist/client -l ${PORT:-3000}; fi"]
