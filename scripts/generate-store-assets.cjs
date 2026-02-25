// scripts/generate-store-assets.cjs
'use strict';

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT  = path.join(ROOT, 'store-assets');
fs.mkdirSync(OUT, { recursive: true });

async function png(svgStr, filename) {
  await sharp(Buffer.from(svgStr)).png().toFile(path.join(OUT, filename));
  console.log('  ✓', filename);
}

/* ── ODU zigzag symbol path ─────────────────────────────────────────────── */
function zig(cx, cy, span, amp, n = 4) {
  const sx   = cx - span;
  const step = (span * 2) / n;
  let d = `M ${sx} ${cy}`;
  for (let i = 0; i < n; i++) {
    d += ` L ${sx + i * step + step / 2} ${cy - amp} L ${sx + (i + 1) * step} ${cy}`;
  }
  for (let i = n; i > 0; i--) {
    d += ` L ${sx + i * step - step / 2} ${cy + amp} L ${sx + (i - 1) * step} ${cy}`;
  }
  return d + ' Z';
}

function logo(cx, cy, r, ring = '#0f172a', fill = '#ffffff', wave = '#0f172a') {
  const ir = r * 0.68;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${ring}"/>
    <circle cx="${cx}" cy="${cy}" r="${ir}" fill="${fill}"/>
    <path d="${zig(cx, cy, ir * 0.93, ir * 0.38)}" fill="${wave}"/>`;
}

/* ── keyboard key ───────────────────────────────────────────────────────── */
function key(x, y, w, h, label, hi = false, fs) {
  const size = fs || Math.round(h * 0.38);
  const bg   = hi ? '#10b981' : '#1e293b';
  const tc   = hi ? '#ffffff' : '#94a3b8';
  const fw   = hi ? 700 : 400;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${bg}" stroke="#334155" stroke-width="1.5"/>
    <text x="${x + w / 2}" y="${y + h / 2 + size * 0.38}" text-anchor="middle"
      font-family="sans-serif" font-size="${size}" font-weight="${fw}" fill="${tc}">${label}</text>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   1. App Icon  512 × 512
══════════════════════════════════════════════════════════════════════════ */
async function makeIcon() {
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#10b981"/>
  ${logo(256, 256, 238)}
</svg>`;
  await png(svg, 'icon-512.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   2. Feature Graphic  1024 × 500
══════════════════════════════════════════════════════════════════════════ */
async function makeFeature() {
  const svg = `<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#052e16"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- Accent stripe -->
  <rect x="54" y="138" width="5" height="224" rx="3" fill="#10b981"/>

  <!-- App name -->
  <text x="82" y="220" font-family="sans-serif" font-weight="700" font-size="80" fill="#ffffff">ODU</text>
  <text x="82" y="298" font-family="sans-serif" font-weight="700" font-size="56" fill="#10b981">Yoruba Writer</text>
  <text x="82" y="348" font-family="sans-serif" font-size="24" fill="#94a3b8">Type Yoruba with perfect diacritics</text>
  <text x="82" y="402" font-family="sans-serif" font-size="30" fill="#34d399" letter-spacing="8">à á ẹ ọ ṣ è é</text>

  <!-- ODU logo — right, ghost style -->
  <circle cx="812" cy="250" r="196" fill="#10b981" opacity="0.05"/>
  ${logo(812, 250, 152, '#1e293b', '#152a1e', '#10b981')}
</svg>`;
  await png(svg, 'feature-graphic-1024x500.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   3. Phone Screenshot  1080 × 1920  —  Diacritic Keyboard
══════════════════════════════════════════════════════════════════════════ */
async function makePhone() {
  const W = 1080, H = 1920;
  const PAD = 32, GAP = 10, KH = 98;

  // special diacritic keys
  const specials = ['à', 'á', 'â', 'è', 'é', 'ê', 'ẹ', 'ọ', 'ṣ', 'ò', 'ó'];
  function specRow(y) {
    const n = specials.length;
    const kw = (W - PAD * 2 - GAP * (n - 1)) / n;
    return specials.map((ch, i) =>
      key(PAD + i * (kw + GAP), y, kw, KH * 0.86, ch, true, 26)
    ).join('');
  }

  // standard keyboard rows
  const ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m'],
  ];
  function stdRow(labels, y, indent = 0) {
    const n  = labels.length;
    const kw = (W - PAD * 2 - indent - GAP * (n - 1)) / n;
    return labels.map((lbl, i) =>
      key(PAD + indent / 2 + i * (kw + GAP), y, kw, KH, lbl, false, 34)
    ).join('');
  }

  const SPEC_Y = 1010;
  const KB_Y   = 1130;
  const ROW_H  = 118;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0f172a"/>

  <!-- Status bar -->
  <rect width="${W}" height="80" fill="#0f172a"/>
  <text x="52" y="54" font-family="sans-serif" font-size="30" fill="#64748b">9:41</text>
  <text x="${W - 52}" y="54" text-anchor="end" font-family="sans-serif" font-size="26" fill="#64748b">●●● ▼</text>

  <!-- Header -->
  <rect y="80" width="${W}" height="120" fill="#1e293b"/>
  <rect y="80" width="${W}" height="1" fill="#334155"/>
  <rect y="199" width="${W}" height="1" fill="#334155"/>
  <text x="${W / 2}" y="156" text-anchor="middle" font-family="sans-serif"
    font-weight="700" font-size="46" fill="#ffffff">ODU Yoruba Writer</text>

  <!-- Diacritic mode badge -->
  <rect x="${W / 2 - 230}" y="214" width="460" height="62" rx="31"
    fill="#10b981" opacity="0.12" stroke="#10b981" stroke-width="1.5"/>
  <text x="${W / 2}" y="253" text-anchor="middle" font-family="sans-serif"
    font-weight="700" font-size="28" fill="#10b981">✦  DIACRITIC MODE ACTIVE</text>

  <!-- Text display area -->
  <rect x="${PAD}" y="296" width="${W - PAD * 2}" height="688" rx="18" fill="#1e293b"/>
  <text x="${PAD + 36}" y="394" font-family="sans-serif" font-size="56" fill="#ffffff">Ẹ kú àárọ̀</text>
  <text x="${PAD + 36}" y="452" font-family="sans-serif" font-size="28" fill="#475569">Good morning</text>
  <text x="${PAD + 36}" y="548" font-family="sans-serif" font-size="56" fill="#ffffff">Ẹ káàbọ̀</text>
  <text x="${PAD + 36}" y="606" font-family="sans-serif" font-size="28" fill="#475569">Welcome</text>
  <text x="${PAD + 36}" y="702" font-family="sans-serif" font-size="56" fill="#ffffff">Ọmọ Yorùbá</text>
  <text x="${PAD + 36}" y="760" font-family="sans-serif" font-size="28" fill="#475569">Yoruba child</text>
  <text x="${PAD + 36}" y="860" font-family="sans-serif" font-size="56" fill="#ffffff">Kò sí ìṣòro</text>
  <text x="${PAD + 36}" y="918" font-family="sans-serif" font-size="28" fill="#475569">No problem</text>
  <!-- cursor -->
  <rect x="${PAD + 36}" y="932" width="3" height="48" rx="2" fill="#10b981"/>

  <!-- Diacritic row label -->
  <text x="${PAD}" y="${SPEC_Y - 14}" font-family="sans-serif" font-size="24"
    font-weight="700" fill="#475569" letter-spacing="2">DIACRITICS</text>
  ${specRow(SPEC_Y)}

  <!-- Keyboard rows -->
  ${stdRow(ROWS[0], KB_Y)}
  ${stdRow(ROWS[1], KB_Y + ROW_H, 54)}
  ${stdRow(ROWS[2], KB_Y + ROW_H * 2, 130)}

  <!-- Space + backspace -->
  <rect x="${PAD}" y="${KB_Y + ROW_H * 3}" width="${W - PAD * 2 - 200 - GAP}" height="${KH}"
    rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="${PAD + (W - PAD * 2 - 200 - GAP) / 2}" y="${KB_Y + ROW_H * 3 + KH / 2 + 12}"
    text-anchor="middle" font-family="sans-serif" font-size="30" fill="#475569">space</text>
  <rect x="${W - PAD - 190}" y="${KB_Y + ROW_H * 3}" width="190" height="${KH}"
    rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="${W - PAD - 95}" y="${KB_Y + ROW_H * 3 + KH / 2 + 12}"
    text-anchor="middle" font-family="sans-serif" font-size="40" fill="#94a3b8">⌫</text>

  <!-- Bottom nav -->
  <rect y="${H - 120}" width="${W}" height="120" fill="#1e293b"/>
  <rect y="${H - 121}" width="${W}" height="1" fill="#334155"/>
  <text x="${W * 0.167}" y="${H - 42}" text-anchor="middle" font-family="sans-serif"
    font-size="26" fill="#10b981">⌨  Keyboard</text>
  <rect x="${W * 0.167 - 55}" y="${H - 5}" width="110" height="3" rx="2" fill="#10b981"/>
  <text x="${W * 0.500}" y="${H - 42}" text-anchor="middle" font-family="sans-serif"
    font-size="26" fill="#475569">🏆  Rankings</text>
  <text x="${W * 0.833}" y="${H - 42}" text-anchor="middle" font-family="sans-serif"
    font-size="26" fill="#475569">🌍  Map</text>
</svg>`;
  await png(svg, 'screenshot-phone-1080x1920.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   4. Tablet Screenshot  1200 × 1920  —  Leaderboard
══════════════════════════════════════════════════════════════════════════ */
async function makeTablet() {
  const W = 1200, H = 1920;

  const entries = [
    { rank: '1', medal: '#f59e0b', user: 'Adunola_YW',  loc: 'Lagos, Nigeria',   score: '1,847' },
    { rank: '2', medal: '#94a3b8', user: 'TundeLingo',  loc: 'Ibadan, Nigeria',  score: '1,302' },
    { rank: '3', medal: '#b45309', user: 'SeunOgbeni',  loc: 'London, UK',       score: '987'   },
    { rank: '4', medal: '#475569', user: 'YetundeLove', loc: 'Abuja, Nigeria',   score: '843'   },
    { rank: '5', medal: '#475569', user: 'AbiodunT',    loc: 'Atlanta, USA',     score: '721'   },
    { rank: '6', medal: '#475569', user: 'OluwafemiB',  loc: 'Toronto, Canada',  score: '618'   },
    { rank: '7', medal: '#475569', user: 'KehindeDave', loc: 'Lagos, Nigeria',   score: '552'   },
    { rank: '8', medal: '#475569', user: 'AdaezePlus',  loc: 'Paris, France',    score: '489'   },
    { rank: '9', medal: '#475569', user: 'MayowaWrite', loc: 'Berlin, Germany',  score: '401'   },
    { rank: '10', medal: '#475569', user: 'FunmiDayo', loc: 'Accra, Ghana',     score: '374'   },
  ];

  function lbRow(e, i) {
    const y     = 450 + i * 138;
    const isTop = i < 3;
    const rowBg = isTop ? '#1a2640' : '#0f1729';
    const rowBd = isTop ? '#2d4060' : '#1a2235';
    return `<rect x="44" y="${y}" width="${W - 88}" height="118" rx="14"
        fill="${rowBg}" stroke="${rowBd}" stroke-width="1.5"/>
      <text x="108" y="${y + 70}" font-family="sans-serif" font-weight="700"
        font-size="44" fill="${e.medal}">${e.rank}</text>
      <text x="196" y="${y + 50}" font-family="sans-serif" font-weight="700"
        font-size="36" fill="#ffffff">${e.user}</text>
      <text x="196" y="${y + 94}" font-family="sans-serif" font-size="26" fill="#64748b">${e.loc}</text>
      <text x="${W - 90}" y="${y + 70}" text-anchor="end" font-family="sans-serif"
        font-weight="700" font-size="36" fill="#10b981">${e.score}</text>`;
  }

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0a1220"/>

  <!-- Status bar -->
  <rect width="${W}" height="80" fill="#0f172a"/>
  <text x="52" y="54" font-family="sans-serif" font-size="30" fill="#64748b">9:41</text>
  <text x="${W - 52}" y="54" text-anchor="end" font-family="sans-serif" font-size="26" fill="#64748b">●●●</text>

  <!-- Header -->
  <rect y="80" width="${W}" height="140" fill="#0f172a"/>
  <rect y="219" width="${W}" height="1" fill="#1e293b"/>
  ${logo(88, 150, 44, '#10b981', '#0f172a', '#10b981')}
  <text x="148" y="168" font-family="sans-serif" font-weight="700"
    font-size="48" fill="#ffffff">ODU Yoruba Writer</text>

  <!-- Tab bar -->
  <rect y="220" width="${W}" height="88" fill="#0f172a"/>
  <rect y="307" width="${W}" height="2" fill="#1e293b"/>
  <text x="100" y="275" font-family="sans-serif" font-size="30" fill="#475569">⌨  Keyboard</text>
  <!-- Active tab highlight -->
  <rect x="272" y="220" width="220" height="90" fill="#0a1220"/>
  <rect x="272" y="305" width="220" height="4" fill="#10b981"/>
  <text x="382" y="275" text-anchor="middle" font-family="sans-serif"
    font-weight="700" font-size="30" fill="#10b981">🏆  Rankings</text>
  <text x="580" y="275" font-family="sans-serif" font-size="30" fill="#475569">🌍  Map</text>
  <text x="790" y="275" font-family="sans-serif" font-size="30" fill="#475569">🎯  Challenges</text>

  <!-- Section heading -->
  <text x="52" y="418" font-family="sans-serif" font-weight="700"
    font-size="42" fill="#ffffff">Global Leaderboard</text>
  <text x="${W - 52}" y="418" text-anchor="end" font-family="sans-serif"
    font-size="26" fill="#475569">sorted by contributions</text>

  <!-- Rows -->
  ${entries.map((e, i) => lbRow(e, i)).join('')}

  <!-- Footer -->
  <text x="${W / 2}" y="${H - 52}" text-anchor="middle" font-family="sans-serif"
    font-size="28" fill="#334155">Showing 10 of 2,847 contributors worldwide</text>
</svg>`;
  await png(svg, 'screenshot-tablet-1200x1920.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   5. Android XR Screenshot  1920 × 1080  —  Contributor Map
══════════════════════════════════════════════════════════════════════════ */
async function makeAndroidXR() {
  const W = 1920, H = 1080;
  const MAP_TOP = 116, MAP_BOT = H - 76;

  // Equirectangular projection helpers
  const scx = (lon) => lon * W / 360 + W / 2;
  const scy = (lat) => (90 - lat) * (MAP_BOT - MAP_TOP) / 180 + MAP_TOP;

  const DOTS = [
    // Nigeria + West Africa cluster
    [3.9, 7.4, 14], [3.0, 6.5, 9], [5.5, 7.0, 10], [4.2, 9.3, 7],
    [-1.0, 7.9, 7], [2.3, 6.4, 6], [-15.0, 11.8, 5],
    // UK / Europe
    [-0.1, 51.5, 10], [2.3, 48.9, 7], [4.9, 52.4, 6], [13.4, 52.5, 5],
    [18.1, 59.3, 4], [-3.7, 40.4, 5],
    // North America
    [-73.9, 40.7, 9], [-87.7, 41.8, 7], [-79.4, 43.7, 6], [-122.3, 37.8, 5],
    [-118.2, 34.0, 6], [-96.8, 32.8, 4],
    // Rest of world
    [139.7, 35.7, 5], [103.8, 1.3, 6], [28.0, -26.2, 6], [3.0, 36.7, 4],
    [-43.2, -22.9, 5], [37.6, 55.8, 4],
  ];

  const dotsHtml = DOTS.map(([lon, lat, r]) => {
    const cx = scx(lon).toFixed(1), cy = scy(lat).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="#10b981" opacity="0.15"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#10b981"/>`;
  }).join('\n  ');

  // Grid lines
  const latLines = Array.from({ length: 7 }, (_, i) => {
    const y = MAP_TOP + i * (MAP_BOT - MAP_TOP) / 6;
    return `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="#121f35" stroke-width="1"/>`;
  }).join('\n  ');
  const lonLines = Array.from({ length: 13 }, (_, i) => {
    const x = (i * W / 12).toFixed(0);
    return `<line x1="${x}" y1="${MAP_TOP}" x2="${x}" y2="${MAP_BOT}" stroke="#121f35" stroke-width="1"/>`;
  }).join('\n  ');

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#080f1e"/>

  <!-- Header bar -->
  <rect width="${W}" height="${MAP_TOP}" fill="#0f172a"/>
  <rect y="${MAP_TOP}" width="${W}" height="1" fill="#1e293b"/>
  ${logo(60, 58, 38, '#10b981', '#0f172a', '#10b981')}
  <text x="112" y="72" font-family="sans-serif" font-weight="700"
    font-size="44" fill="#ffffff">Global Contributor Map</text>
  <text x="${W - 52}" y="72" text-anchor="end" font-family="sans-serif"
    font-size="32" fill="#475569">ODU Yoruba Writer</text>

  <!-- Ocean -->
  <rect y="${MAP_TOP}" width="${W}" height="${MAP_BOT - MAP_TOP}" fill="#0b1a2f"/>

  <!-- Grid -->
  ${latLines}
  ${lonLines}

  <!-- Equator -->
  <line x1="0" y1="${scy(0).toFixed(1)}" x2="${W}" y2="${scy(0).toFixed(1)}"
    stroke="#1e3a5f" stroke-width="1.5" stroke-dasharray="8,6"/>

  <!-- Continent fills (approximate ellipses) -->
  <ellipse cx="${scx(20).toFixed(0)}" cy="${scy(3).toFixed(0)}" rx="155" ry="240" fill="#1a2d3f" opacity="0.85"/>
  <ellipse cx="${scx(12).toFixed(0)}" cy="${scy(53).toFixed(0)}" rx="125" ry="95" fill="#1a2d3f" opacity="0.85"/>
  <ellipse cx="${scx(-100).toFixed(0)}" cy="${scy(47).toFixed(0)}" rx="195" ry="168" fill="#1a2d3f" opacity="0.85"/>
  <ellipse cx="${scx(-58).toFixed(0)}" cy="${scy(-14).toFixed(0)}" rx="115" ry="162" fill="#1a2d3f" opacity="0.85"/>
  <ellipse cx="${scx(88).toFixed(0)}" cy="${scy(43).toFixed(0)}" rx="310" ry="156" fill="#1a2d3f" opacity="0.85"/>
  <ellipse cx="${scx(134).toFixed(0)}" cy="${scy(-24).toFixed(0)}" rx="118" ry="82" fill="#1a2d3f" opacity="0.85"/>

  <!-- Contributor dots -->
  ${dotsHtml}

  <!-- Nigeria highlight ring -->
  <circle cx="${scx(3.9).toFixed(1)}" cy="${scy(7.4).toFixed(1)}" r="46"
    fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="6,4" opacity="0.6"/>
  <text x="${scx(3.9) + 54}" y="${scy(7.4) - 10}" font-family="sans-serif"
    font-size="20" fill="#10b981" opacity="0.8">Nigeria cluster</text>

  <!-- Stats bar -->
  <rect y="${MAP_BOT}" width="${W}" height="${H - MAP_BOT}" fill="#0f172a"/>
  <rect y="${MAP_BOT}" width="${W}" height="1" fill="#1e293b"/>
  <text x="72" y="${MAP_BOT + 50}" font-family="sans-serif" font-weight="700"
    font-size="34" fill="#10b981">2,847</text>
  <text x="170" y="${MAP_BOT + 50}" font-family="sans-serif" font-size="28" fill="#64748b">contributions</text>
  <text x="480" y="${MAP_BOT + 50}" font-family="sans-serif" font-weight="700"
    font-size="34" fill="#10b981">47</text>
  <text x="532" y="${MAP_BOT + 50}" font-family="sans-serif" font-size="28" fill="#64748b">countries</text>
  <text x="790" y="${MAP_BOT + 50}" font-family="sans-serif" font-weight="700"
    font-size="34" fill="#10b981">312</text>
  <text x="850" y="${MAP_BOT + 50}" font-family="sans-serif" font-size="28" fill="#64748b">contributors</text>
  <!-- Legend -->
  <circle cx="${W - 380}" cy="${MAP_BOT + 38}" r="9" fill="#10b981"/>
  <text x="${W - 363}" y="${MAP_BOT + 50}" font-family="sans-serif" font-size="26" fill="#64748b">regular</text>
  <circle cx="${W - 196}" cy="${MAP_BOT + 38}" r="9" fill="#a855f7"/>
  <text x="${W - 179}" y="${MAP_BOT + 50}" font-family="sans-serif" font-size="26" fill="#64748b">museum</text>
</svg>`;
  await png(svg, 'screenshot-androidxr-1920x1080.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   6. Chromebook Screenshot  1366 × 768  —  Writing Panel + Keyboard
══════════════════════════════════════════════════════════════════════════ */
async function makeChromebook() {
  const W = 1366, H = 768;
  const SPLIT = 560;    // left panel width
  const KX    = SPLIT + 1;
  const KW    = W - KX; // = 805
  const PAD   = 16;
  const GAP   = 8;
  const KH    = 64;

  const specials = ['à', 'á', 'â', 'è', 'é', 'ê', 'ẹ', 'ọ', 'ṣ'];
  function specRow(y) {
    const n  = specials.length;
    const kw = (KW - PAD * 2 - GAP * (n - 1)) / n;
    return specials.map((ch, i) =>
      key(KX + PAD + i * (kw + GAP), y, kw, KH, ch, true, 24)
    ).join('');
  }

  const ROWS = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['z','x','c','v','b','n','m'],
  ];
  function krow(labels, y, indent = 0) {
    const n  = labels.length;
    const kw = (KW - PAD * 2 - indent - GAP * (n - 1)) / n;
    return labels.map((lbl, i) =>
      key(KX + PAD + indent / 2 + i * (kw + GAP), y, kw, KH, lbl, false, 22)
    ).join('');
  }

  const SPEC_Y = 92;
  const KB_Y   = 172;
  const ROW_H  = 80;

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#0f172a"/>

  <!-- Left panel: text editor -->
  <rect width="${SPLIT}" height="${H}" fill="#1a2436"/>
  <rect x="${SPLIT}" y="0" width="1" height="${H}" fill="#334155"/>

  <!-- Left header -->
  <rect width="${SPLIT}" height="68" fill="#0f172a"/>
  <rect y="68" width="${SPLIT}" height="1" fill="#334155"/>
  ${logo(34, 34, 24, '#10b981', '#0f172a', '#10b981')}
  <text x="68" y="44" font-family="sans-serif" font-weight="700" font-size="26" fill="#ffffff">ODU Yoruba Writer</text>

  <!-- Writing area content -->
  <text x="28" y="106" font-family="sans-serif" font-size="16"
    font-weight="700" fill="#334155" letter-spacing="3">— WRITING AREA —</text>
  <text x="28" y="174" font-family="sans-serif" font-size="38" fill="#ffffff">Ẹ kú àárọ̀</text>
  <text x="28" y="220" font-family="sans-serif" font-size="38" fill="#ffffff">Báwo ni o wà?</text>
  <text x="28" y="266" font-family="sans-serif" font-size="38" fill="#ffffff">Ọmọ Yorùbá ni mi</text>
  <text x="28" y="312" font-family="sans-serif" font-size="38" fill="#ffffff">Ẹ káàbọ̀ sí ìlú wa</text>
  <text x="28" y="358" font-family="sans-serif" font-size="38" fill="#ffffff">Kò sí ìṣòro kankan</text>
  <!-- cursor -->
  <rect x="28" y="370" width="3" height="36" rx="1" fill="#10b981"/>

  <!-- Word count footer -->
  <rect y="${H - 44}" width="${SPLIT}" height="44" fill="#0f172a"/>
  <rect y="${H - 45}" width="${SPLIT}" height="1" fill="#334155"/>
  <text x="22" y="${H - 16}" font-family="sans-serif" font-size="18" fill="#475569">5 lines · 87 chars · Diacritic mode on</text>

  <!-- Right panel header -->
  <rect x="${KX}" width="${KW}" height="68" fill="#0f172a"/>
  <rect x="${KX}" y="68" width="${KW}" height="1" fill="#334155"/>
  <rect x="${KX + PAD}" y="16" width="216" height="38" rx="19"
    fill="#10b981" opacity="0.13" stroke="#10b981" stroke-width="1.2"/>
  <text x="${KX + PAD + 108}" y="41" text-anchor="middle" font-family="sans-serif"
    font-weight="700" font-size="19" fill="#10b981">✦  DIACRITIC MODE</text>
  <text x="${W - PAD}" y="44" text-anchor="end" font-family="sans-serif"
    font-size="18" fill="#475569">Shift+Shift to toggle</text>

  <!-- Diacritic row -->
  ${specRow(SPEC_Y)}

  <!-- Keyboard -->
  ${krow(ROWS[0], KB_Y)}
  ${krow(ROWS[1], KB_Y + ROW_H, 44)}
  ${krow(ROWS[2], KB_Y + ROW_H * 2, 112)}

  <!-- Space + Backspace -->
  <rect x="${KX + PAD}" y="${KB_Y + ROW_H * 3}" width="${KW - PAD * 2 - 172 - GAP}" height="${KH}"
    rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="${KX + PAD + (KW - PAD * 2 - 172 - GAP) / 2}" y="${KB_Y + ROW_H * 3 + KH / 2 + 9}"
    text-anchor="middle" font-family="sans-serif" font-size="20" fill="#475569">space</text>
  <rect x="${W - PAD - 164}" y="${KB_Y + ROW_H * 3}" width="164" height="${KH}"
    rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
  <text x="${W - PAD - 82}" y="${KB_Y + ROW_H * 3 + KH / 2 + 9}"
    text-anchor="middle" font-family="sans-serif" font-size="28" fill="#94a3b8">⌫</text>

  <!-- Quick reference card -->
  <rect x="${KX + PAD}" y="${KB_Y + ROW_H * 3 + KH + 14}" width="${KW - PAD * 2}"
    height="${H - (KB_Y + ROW_H * 3 + KH + 28)}" rx="10" fill="#0a1220" stroke="#1e293b" stroke-width="1.5"/>
  <text x="${KX + PAD + 18}" y="${KB_Y + ROW_H * 3 + KH + 46}" font-family="sans-serif"
    font-weight="700" font-size="17" fill="#475569" letter-spacing="2">QUICK REFERENCE</text>
  <text x="${KX + PAD + 18}" y="${KB_Y + ROW_H * 3 + KH + 76}" font-family="sans-serif"
    font-size="19" fill="#94a3b8">à á â  →  a with low · high · mid tone</text>
  <text x="${KX + PAD + 18}" y="${KB_Y + ROW_H * 3 + KH + 104}" font-family="sans-serif"
    font-size="19" fill="#94a3b8">ẹ ọ ṣ  →  open-e, open-o, sh sound</text>
  <text x="${KX + PAD + 18}" y="${KB_Y + ROW_H * 3 + KH + 132}" font-family="sans-serif"
    font-size="19" fill="#10b981">Tab  →  cycle next diacritic variant</text>
</svg>`;
  await png(svg, 'screenshot-chromebook-1366x768.png');
}

/* ══════════════════════════════════════════════════════════════════════════
   Text assets
══════════════════════════════════════════════════════════════════════════ */
function makeText() {
  const short =
    `Type Yoruba with perfect tones & diacritics. Free, offline-ready.`;

  const full = `\
ODU Yoruba Writer is a professional diacritic keyboard and language tool for writers, students, researchers, and anyone who wants to write fully-marked Yoruba text on their device.

★ DIACRITIC KEYBOARD
Type correctly toned Yoruba without switching keyboards. A dedicated Diacritic Mode lets you insert tone marks and open vowels (à, á, â, ẹ, ọ, ṣ, è, é, ê and more) with a single tap — no copy-pasting from charts.

★ TRANSLATION CHALLENGES
Practice Yoruba by completing real translation tasks contributed by the community. Fill-the-gap and full-sentence modes help reinforce vocabulary, tone memory, and grammar.

★ GLOBAL LEADERBOARD
See how your contributions compare with language enthusiasts from around the world. Rankings update from a live community dataset shared with researchers.

★ CONTRIBUTOR MAP
Explore a world map showing where ODU contributors are located — from Lagos to London, Atlanta to Berlin. Discover Yoruba language communities wherever they live.

★ LANGUAGE PRESERVATION
Every sentence you contribute becomes part of an open Yoruba language dataset, supporting AI research and helping ensure Yoruba is well-represented in digital and natural-language systems.

★ PRIVACY-FIRST
No ads. No third-party tracking. Internet is used only for leaderboard sync and optional account creation — the keyboard works fully offline. Your data is never sold.

★ FREE & OPEN SOURCE
ODU is free to download and use. The source code is open (MIT licence) on GitHub.

WHO IS IT FOR?
• Yoruba speakers who want to write correctly toned text on their phones
• Students and learners studying Yoruba tone and orthography
• Authors writing books, articles, or content in Yoruba
• Researchers building Yoruba NLP and language datasets
• Anyone curious about West African tonal languages

Type Yoruba properly. Preserve the language. Connect with a global community.`;

  fs.writeFileSync(path.join(OUT, 'short-description.txt'), short, 'utf8');
  fs.writeFileSync(path.join(OUT, 'full-description.txt'), full, 'utf8');
  console.log('  ✓ short-description.txt  (' + short.length + ' chars)');
  console.log('  ✓ full-description.txt   (' + full.length + ' chars)');
}

/* ══════════════════════════════════════════════════════════════════════════
   Main
══════════════════════════════════════════════════════════════════════════ */
(async () => {
  console.log('\nGenerating Play Store assets → store-assets/\n');
  makeText();
  await makeIcon();
  await makeFeature();
  await makePhone();
  await makeTablet();
  await makeAndroidXR();
  await makeChromebook();
  console.log('\nAll done.\n');
})().catch(err => { console.error(err); process.exit(1); });
