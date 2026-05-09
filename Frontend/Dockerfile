FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV RAILWAY_ENVIRONMENT=true
RUN npm run build

FROM node:20-slim

WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist/client ./dist

EXPOSE 3000

CMD ["sh", "-c", "serve dist -s -l ${PORT:-3000}"]
