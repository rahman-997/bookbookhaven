import { readFile } from 'node:fs/promises';

const [globals, accessibility] = await Promise.all([
  readFile(new URL('../frontend/app/globals.css', import.meta.url), 'utf8'),
  readFile(new URL('../frontend/app/accessibility.css', import.meta.url), 'utf8')
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const skipLinkDefinitions = [globals, accessibility]
  .flatMap((source) => source.match(/\.skip-link\s*\{/g) ?? [])
  .length;

assert(!globals.includes('feTurbulence'), 'globals.css must not reintroduce SVG turbulence noise');
assert(!globals.includes('mix-blend-mode: soft-light'), 'globals.css must not reintroduce the full-screen soft-light noise layer');
assert(!/body::after\s*\{/.test(globals), 'globals.css must keep the removed full-screen body::after texture out');
assert(skipLinkDefinitions === 1, `expected exactly one .skip-link definition, found ${skipLinkDefinitions}`);
assert(!globals.includes('prefers-reduced-motion'), 'reduced-motion rules belong in accessibility.css only');
assert(accessibility.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion fallback is missing');
assert(accessibility.includes('@media (prefers-contrast: more)'), 'increased-contrast fallback is missing');
assert(accessibility.includes('@media (forced-colors: active)'), 'forced-colors fallback is missing');
assert(accessibility.includes('body::before'), 'forced-colors mode must suppress decorative page texture');
assert(accessibility.includes('.book-cover__grid'), 'forced-colors mode must suppress decorative book-cover grids');

console.log('[bookhaven-css] accessibility/performance regression checks passed');
