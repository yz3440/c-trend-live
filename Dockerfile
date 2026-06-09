FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=optional skips node-syphon (macOS-only native addon, not needed by the
# web server); its postinstall can't run on alpine anyway (no curl/unzip).
RUN npm ci --omit=optional
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional
COPY server.js ./
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server.js"]
