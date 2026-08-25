// Configuration Metro — nécessaire uniquement pour la cible web.
//
// Problème : zustand publie deux builds (cf. son champ `exports`), un CommonJS
// et un ESM. L'ESM (`esm/middleware.mjs`, middleware devtools) contient
// `import.meta`. Or Expo sert le bundle web dans un <script> classique, où
// `import.meta` est une **erreur de syntaxe fatale** : le bundle entier ne se
// parse pas, React ne monte jamais, la page reste blanche sans aucun rendu.
//
// Sur natif, Metro choisit le CommonJS grâce à la condition « react-native » —
// c'est pourquoi seul le web est touché. Sur web, Metro ajoute lui-même la
// condition « import » parce que le code importe zustand en syntaxe ESM : ni
// `unstable_conditionNames` ni `unstable_conditionsByPlatform` ne permettent de
// l'en empêcher. On pointe donc explicitement vers les fichiers CommonJS de
// zustand, et pour le web seulement.
//
// Si un jour zustand cesse de publier ce build (fichier absent), on retombe
// silencieusement sur la résolution par défaut plutôt que de casser le bundle.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const ZUSTAND_DIR = path.join(__dirname, 'node_modules', 'zustand');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subpath = moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    const filePath = path.join(ZUSTAND_DIR, `${subpath}.js`);
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
