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
// Si un jour zustand cesse de publier ce build (fichier absent), on retombe
// silencieusement sur la résolution par défaut plutôt que de casser le bundle.
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

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    ZUSTAND_DIR &&
    platform === 'web' &&
    (moduleName === 'zustand' || moduleName.startsWith('zustand/'))
  ) {
    const subpath =
      moduleName === 'zustand' ? 'index' : moduleName.slice('zustand/'.length);
    const filePath = path.join(ZUSTAND_DIR, `${subpath}.js`);
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
