// One-off script (not part of the build) : génère assets/texture/dot-grid.png,
// la trame de points du fond d'écran (charte-da.md §04). À relancer seulement
// si la trame doit changer (couleur, densité, taille).
// Usage : node scripts/generate-texture.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 2000;
const HEIGHT = 3000;
const OUT = path.join(__dirname, '..', 'assets', 'texture', 'dot-grid.png');

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1" fill="#F1E8D8" fill-opacity="0.07"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#0E1A14"/>
  <rect width="100%" height="100%" fill="url(#dots)"/>
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(OUT)
  .then((info) => console.log('written', OUT, info))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
