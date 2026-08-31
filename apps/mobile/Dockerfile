# Image web de l'app Expo.
#
# Le contexte de build est la **racine du monorepo** (cf. `docker-compose.yml`),
# pas `apps/mobile` : le lockfile et la déclaration des workspaces vivent là-haut,
# et `npm ci` a besoin des deux pour reconstruire l'arbre de dépendances hissé.
FROM node:22-alpine AS build
WORKDIR /app

# Manifestes seuls d'abord : cette couche n'est réinvalidée que quand les
# dépendances changent, pas à chaque modification de code.
COPY package.json package-lock.json ./
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --omit=dev

COPY tsconfig.base.json ./
COPY apps/mobile apps/mobile
RUN npm run build:web -w @lbc/mobile

FROM nginx:alpine
COPY --from=build /app/apps/mobile/dist /usr/share/nginx/html
EXPOSE 80
