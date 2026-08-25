// app.config.js étend app.json : la config statique reste dans app.json,
// et on n'y superpose le `baseUrl` web que si EXPO_WEB_BASE_URL est défini
// (mis par le Dockerfile pour le déploiement derrière Traefik en /lesbonscomptes).
// Sans cette variable (dev local, EAS build), la config est identique à app.json.
const { expo } = require('./app.json');

module.exports = {
  ...expo,
  ...(process.env.EXPO_WEB_BASE_URL
    ? { experiments: { ...expo.experiments, baseUrl: process.env.EXPO_WEB_BASE_URL } }
    : {}),
};
