FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV RAILWAY_ENVIRONMENT=true
RUN npm run build

FROM node:20-slim

WORKDIR /app
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/server.mjs server.mjs

EXPOSE 3000

CMD ["node", "server.mjs"]
