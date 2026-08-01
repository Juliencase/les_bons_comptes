// Générateur d'icônes de l'app — dessin vectoriel (SVG) rasterisé en PNG via sharp.
// Thème : compteur de jeu de société → deux pions (meeples) dorés + pastille de score.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BG_DARK = '#0f2027';
const BG_DARK2 = '#1d3d49';
const GOLD = '#e0a92e';
const GOLD_SOFT = '#f5d67f';
const GOLD_DARK = '#a9761b';
const INK = '#0f2027';

// Silhouette de meeple (pion) centrée sur (0,0) pour la tête ; corps dessous.
// Tête = cercle séparé ; corps = un tracé symétrique (bras écartés + jambes avec encoche).
function meeple(cx, cy, scale, fill, stroke) {
  const body = `
    M -34 -96
    C -60 -92 -78 -70 -96 -40
    C -120 -8 -150 20 -168 34
    C -178 42 -172 58 -160 56
    C -120 50 -96 40 -84 24
    C -92 70 -96 96 -96 118
    C -96 134 -84 140 -70 140
    L -20 140
    C -10 140 -6 132 -4 120
    L 0 96
    L 4 120
    C 6 132 10 140 20 140
    L 70 140
    C 84 140 96 134 96 118
    C 96 96 92 70 84 24
    C 96 40 120 50 160 56
    C 172 58 178 42 168 34
    C 150 20 120 -8 96 -40
    C 78 -70 60 -92 34 -96
    C 20 -80 -20 -80 -34 -96
    Z`;
  const strokeAttr = stroke
    ? `stroke="${stroke}" stroke-width="10" stroke-linejoin="round"`
    : '';
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale})">
      <path d="${body}" fill="${fill}" ${strokeAttr}/>
      <circle cx="0" cy="-150" r="72" fill="${fill}" ${strokeAttr}/>
    </g>`;
}

// Groupe "art" (pions + score), centré dans un carré 1024, sans fond.
function art(mono) {
  const backFill = mono ? '#ffffff' : GOLD_DARK;
  const frontFill = mono ? '#ffffff' : GOLD;
  const frontStroke = mono ? null : INK;
  const chip = mono
    ? `<rect x="356" y="648" width="312" height="150" rx="34" fill="none"
             stroke="#ffffff" stroke-width="14"/>
       <text x="512" y="754" font-family="Arial, Helvetica, sans-serif"
             font-size="104" font-weight="bold" fill="#ffffff"
             text-anchor="middle">+20</text>`
    : `<rect x="356" y="648" width="312" height="150" rx="34" fill="${GOLD}"/>
       <text x="512" y="754" font-family="Arial, Helvetica, sans-serif"
             font-size="104" font-weight="bold" fill="${INK}"
             text-anchor="middle">+20</text>`;
  return `
    ${meeple(430, 470, 0.9, backFill, null)}
    ${meeple(610, 440, 1.05, frontFill, frontStroke)}
    <g>${chip}</g>`;
}

function svgIcon({ bg = true, mono = false, scale = 1, withArt = true } = {}) {
  const background = bg
    ? `<defs>
         <radialGradient id="g" cx="50%" cy="42%" r="72%">
           <stop offset="0%" stop-color="${BG_DARK2}"/>
           <stop offset="100%" stop-color="${BG_DARK}"/>
         </radialGradient>
       </defs>
       <rect width="1024" height="1024" fill="url(#g)"/>`
    : '';
  const content = withArt
    ? `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
        ${art(mono)}
      </g>`
    : '';
  return `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${background}
      ${content}
    </svg>`;
}

async function render(svg, size, outPath) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log('écrit', path.relative(process.cwd(), outPath), `(${size}px)`);
}

async function main() {
  const mode = process.argv[2] || 'preview';
  const dir = path.join(__dirname, '..', 'assets');

  if (mode === 'preview') {
    const pdir = path.join(__dirname, 'preview');
    fs.mkdirSync(pdir, { recursive: true });
    await render(svgIcon({ bg: true }), 512, path.join(pdir, 'icon.png'));
    await render(svgIcon({ bg: false, scale: 0.82 }), 512, path.join(pdir, 'foreground.png'));
    await render(svgIcon({ bg: false, mono: true, scale: 0.82 }), 512, path.join(pdir, 'monochrome.png'));
    console.log('\nAperçu généré dans iconsrc/preview/');
    return;
  }

  if (mode === 'final') {
    await render(svgIcon({ bg: true }), 1024, path.join(dir, 'icon.png'));
    await render(svgIcon({ bg: false, scale: 0.82 }), 1024, path.join(dir, 'android-icon-foreground.png'));
    await render(svgIcon({ bg: true, withArt: false }), 1024, path.join(dir, 'android-icon-background.png'));
    await render(svgIcon({ bg: false, mono: true, scale: 0.82 }), 1024, path.join(dir, 'android-icon-monochrome.png'));
    await render(svgIcon({ bg: true }), 512, path.join(dir, 'splash-icon.png'));
    await render(svgIcon({ bg: true }), 48, path.join(dir, 'favicon.png'));
    console.log('\nIcônes finales écrites dans assets/');
    return;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
