FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ENV EXPO_WEB_BASE_URL=/lesbonscomptes
RUN npx expo export -p web

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
