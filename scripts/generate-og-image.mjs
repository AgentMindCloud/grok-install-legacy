#!/usr/bin/env node
// One-shot generator for og-image.png (1200x630).
// Usage:  npm install --no-save @resvg/resvg-js && node scripts/generate-og-image.mjs
// The PNG is committed to the repo root; this script is idempotent.

import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, '..', 'og-image.png');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#07090d"/>
      <stop offset="1" stop-color="#0f141c"/>
    </linearGradient>
    <radialGradient id="glowGreen" cx="0.15" cy="0.15" r="0.55">
      <stop offset="0" stop-color="#4ade80" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#4ade80" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPurple" cx="0.95" cy="0.9" r="0.6">
      <stop offset="0" stop-color="#a78bfa" stop-opacity="0.36"/>
      <stop offset="1" stop-color="#a78bfa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4ade80"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glowGreen)"/>
  <rect width="1200" height="630" fill="url(#glowPurple)"/>

  <!-- subtle grid -->
  <g opacity="0.05" stroke="#4ade80" stroke-width="1">
    ${Array.from({ length: 13 }, (_, i) =>
      `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="630"/>`
    ).join('')}
    ${Array.from({ length: 8 }, (_, i) =>
      `<line x1="0" y1="${i * 90}" x2="1200" y2="${i * 90}"/>`
    ).join('')}
  </g>

  <!-- top pill: 99% pre-approved -->
  <g transform="translate(80,80)">
    <rect rx="999" ry="999" width="380" height="44" fill="rgba(74,222,128,0.08)" stroke="#4ade80" stroke-opacity="0.32" stroke-width="1"/>
    <circle cx="22" cy="22" r="5" fill="#4ade80"/>
    <text x="42" y="29" font-family="JetBrains Mono, monospace" font-size="14" fill="#9ca3af" letter-spacing="1">99% PRE-APPROVED BY GROK SAFETY</text>
  </g>

  <!-- title -->
  <text x="80" y="280" font-family="Inter, system-ui, sans-serif" font-size="84" font-weight="800" fill="#e8ecf2" letter-spacing="-2">Build a safe AI agent</text>
  <text x="80" y="370" font-family="Inter, system-ui, sans-serif" font-size="84" font-weight="800" fill="url(#title)" letter-spacing="-2">that lives on X.</text>

  <!-- tagline -->
  <text x="80" y="430" font-family="Inter, system-ui, sans-serif" font-size="26" fill="#9ca3af">Mint your agent in 60 seconds. 100% yours. Apache 2.0.</text>

  <!-- bottom row: trust pill + branding -->
  <g transform="translate(80,520)">
    <rect rx="999" ry="999" width="640" height="50" fill="rgba(74,222,128,0.08)" stroke="#4ade80" stroke-opacity="0.32" stroke-width="1"/>
    <circle cx="32" cy="25" r="11" fill="#4ade80"/>
    <text x="28" y="30" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="700" fill="#07090d">$</text>
    <text x="55" y="32" font-family="JetBrains Mono, monospace" font-size="16" fill="#e8ecf2">Free to mint  ·  Capped by you  ·  xAI credits</text>
  </g>

  <!-- right-side mark -->
  <g transform="translate(900,510)">
    <text x="0" y="0" font-family="JetBrains Mono, monospace" font-size="13" fill="#6b7280" letter-spacing="2">GROK-INSTALL · v2.14</text>
    <text x="0" y="32" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="700" fill="#e8ecf2">grok-install</text>
    <text x="0" y="62" font-family="JetBrains Mono, monospace" font-size="13" fill="#9ca3af">by @JanSol0s</text>
  </g>
</svg>`;

const resvg = new Resvg(svg, {
  background: '#07090d',
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true },
});
const pngBuffer = resvg.render().asPng();
writeFileSync(out, pngBuffer);
console.log('wrote', out, '(' + (pngBuffer.length / 1024).toFixed(1) + ' KB)');
