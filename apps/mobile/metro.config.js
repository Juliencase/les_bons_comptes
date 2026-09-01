// Configuration Metro — deux rôles : le support monorepo, et un contournement
// zustand nécessaire uniquement pour la cible web.
//
// ## Monorepo
//
// L'app vit dans `apps/mobile`, mais npm workspaces hisse la majorité des
// dépendances dans le `node_modules` de la racine. Metro ne regarde par défaut
// ni au-dessus de son propre dossier (`watchFolders`) ni dans un autre
// `node_modules` que celui du projet (`nodeModulesPaths`) : sans ces deux
// réglages, la résolution échoue sur tout paquet hissé.
//
// ## Contournement zustand (web uniquement)
//
// zustand publie deux builds (cf. son champ `exports`), un CommonJS et un ESM.
// L'ESM (`esm/middleware.mjs`, middleware devtools) contient `import.meta`. Or
// Expo sert le bundle web dans un <script> classique, où `import.meta` est une
// **erreur de syntaxe fatale** : le bundle entier ne se parse pas, React ne
// monte jamais, la page reste blanche sans aucun rendu.
//
// Sur natif, Metro choisit le CommonJS grâce à la condition « react-native » —
// c'est pourquoi seul le web est touché. Sur web, Metro ajoute lui-même la
// condition « import » parce que le code importe zustand en syntaxe ESM : ni
// `unstable_conditionNames` ni `unstable_conditionsByPlatform` ne permettent de
// l'en empêcher. On pointe donc explicitement vers les fichiers CommonJS de
// zustand, et pour le web seulement.
//
// Le dossier de zustand est trouvé par `require.resolve` et **non** par un
// `path.join(__dirname, 'node_modules', ...)` : en monorepo le paquet est hissé
// à la racine, un chemin en dur ne le trouverait plus et le contournement
// sauterait en silence — c'est-à-dire exactement la page blanche décrite plus
// haut, mais sans erreur visible.
//
// Si un jour zustand cesse de publier ce build (fichier absent, ou paquet
// introuvable), on retombe sur la résolution par défaut plutôt que de faire
// échouer le bundling — mais en le criant dans la console. Le symptôme, sinon,
// est une page blanche en production sans la moindre trace d'erreur.
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(monorepoRoot, 'node_modules'),
];

// `zustand/package.json` d'abord (exact), l'entrée principale en repli si le
// paquet n'exporte pas son manifeste. `null` = contournement désactivé.
function resolveZustandDir() {
  try {
    return path.dirname(require.resolve('zustand/package.json'));
  } catch {
    try {
      return path.dirname(require.resolve('zustand'));
    } catch {
      return null;
    }
  }
}

const ZUSTAND_DIR = resolveZustandDir();

// Une fois par raison : le résolveur est appelé pour chaque import de zustand,
// on ne veut pas noyer la sortie du bundler sous le même message.
const warned = new Set();
function warnWorkaroundOff(reason) {
  if (warned.has(reason)) return;
  warned.add(reason);
  console.warn(
    `[metro] contournement zustand/web désactivé (${reason}) — le bundle web ` +
      `contiendra probablement « import.meta » et ne se chargera pas.`,
  );
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isZustand =
    moduleName === 'zustand' || moduleName.startsWith('zustand/');

  if (platform === 'web' && isZustand) {
    if (!ZUSTAND_DIR) {
      warnWorkaroundOff('paquet introuvable via require.resolve');
    } else {
      const subpath =
        moduleName === 'zustand'
          ? 'index'
          : moduleName.slice('zustand/'.length);
      const filePath = path.join(ZUSTAND_DIR, `${subpath}.js`);
      if (fs.existsSync(filePath)) {
        return { type: 'sourceFile', filePath };
      }
      warnWorkaroundOff(`build CommonJS absent : ${filePath}`);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
