/* Generate the ROOT-X PWA icons from the brand mark (the same geometry as the
 * Logo component in src/pages/auth/Login.tsx) on the Campus Neon canvas.
 * Run: node scripts/generate-icons.mjs   (writes to public/icons + public/favicon.svg) */
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const VIOLET = '#AE67FA';
const VIOLET_SOFT = '#C9A1FF';
const AMBER = '#F49867';
const CANVAS = '#040C18';

/** The ROOT-X mark scaled to a square canvas.
 * r = outer ring radius; stroke weights follow the wordmark's proportions. */
function markSvg(size, r, ringStroke, arcStroke, crossStroke, pad = 0) {
  const c = size / 2;
  const dash = (a, b) => `stroke-dasharray="${a * r / 150} ${b * r / 150}"`;
  // arcs + crosshair are expressed in the 32-unit logo box, scaled to r (logo r=14.5)
  const s = r / 14.5;
  const p = (x, y) => `${c + (x - 16) * s} ${c + (y - 16) * s}`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="36%" r="80%">
      <stop offset="0%" stop-color="#191036"/>
      <stop offset="55%" stop-color="#0A1226"/>
      <stop offset="100%" stop-color="${CANVAS}"/>
    </radialGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${VIOLET}"/>
      <stop offset="100%" stop-color="${AMBER}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#ring)" stroke-width="${ringStroke}"/>
  <path d="M ${p(9, 9)} C ${p(13, 13)}, ${p(13, 19)}, ${p(9, 23)}" fill="none" stroke="${VIOLET_SOFT}" stroke-width="${arcStroke}" stroke-linecap="round" ${dash(2.5, 3.5)} transform="rotate(0 ${c} ${c})"/>
  <path d="M ${p(23, 9)} C ${p(19, 13)}, ${p(19, 19)}, ${p(23, 23)}" fill="none" stroke="${VIOLET_SOFT}" stroke-width="${arcStroke}" stroke-linecap="round" ${dash(2.5, 3.5)}/>
  <path d="M ${p(16, 6)} L ${p(16, 26)} M ${p(6, 16)} L ${p(26, 16)}" stroke="${AMBER}" stroke-width="${crossStroke}" stroke-linecap="round" ${dash(3, 3.4)}/>
</svg>`;
}

// any-purpose icon: mark at full presence
const icon512 = markSvg(512, 216, 20, 30, 28);
// maskable: mark inside the safe zone (central 80%)
const maskable512 = markSvg(512, 168, 18, 27, 25);
// apple touch icon: slightly smaller mark, opaque
const apple180 = markSvg(180, 68, 6.5, 9.7, 9, 0);
// favicon: mark only, transparent bg
const favicon = `<svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="none" stroke="${VIOLET}" stroke-width="1.8"/>
  <path d="M9 9 C 13 13, 13 19, 9 23" stroke="${VIOLET_SOFT}" stroke-width="2.4" fill="none" stroke-dasharray="2.5 3.5" stroke-linecap="round"/>
  <path d="M23 9 C 19 13, 19 19, 23 23" stroke="${VIOLET_SOFT}" stroke-width="2.4" fill="none" stroke-dasharray="2.5 3.5" stroke-linecap="round"/>
  <path d="M16 6 L16 26 M6 16 L26 16" stroke="${AMBER}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 3.4"/>
</svg>`;

await mkdir('public/icons', { recursive: true });
await writeFile('public/favicon.svg', favicon);

const jobs = [
  [Buffer.from(icon512), 'public/icons/icon-512.png', 512],
  [Buffer.from(icon512), 'public/icons/icon-192.png', 192],
  [Buffer.from(maskable512), 'public/icons/icon-maskable-512.png', 512],
  [Buffer.from(maskable512), 'public/icons/icon-maskable-192.png', 192],
  [Buffer.from(apple180), 'public/icons/apple-touch-icon.png', 180],
];
for (const [svg, out, size] of jobs) {
  await sharp(svg).resize(size, size).png().toFile(out);
  console.log('✓', out);
}
console.log('✓ public/favicon.svg');
