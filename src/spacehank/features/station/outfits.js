import { tr } from '../../core/i18n/lang';

// What each crew member wears on the station: the suit, its trim (belt, cuffs, helmet stripe), the backpack, and one thing
// of their own on the helmet, so they are told apart at a glance. Colours go with each one's colour in core/agents.js.

export const OUTFITS = {
  codex: { suit: '#1f3346', trim: '#62e7d3', pack: '#2a4a5e', extra: 'headphones', extraColor: '#101820', wear: tr('Navy suit, headphones') }, // engineer: deep navy, teal
  claude: { suit: '#e8dcff', trim: '#9b6bff', pack: '#c9b2ff', extra: 'scarf', extraColor: '#ff9a5c', wear: tr('Lavender suit, a warm scarf') }, // researcher: lavender, warm scarf
  nova: { suit: '#fff1dc', trim: '#ff9f3d', pack: '#ffc98a', extra: 'beanie', extraColor: '#ff8a2a', wear: tr('Cream suit, an orange beanie') }, // writer: cream, orange beanie
  pixel: { suit: '#ffd6e2', trim: '#ff5d8a', pack: '#ff9fbc', extra: 'beret', extraColor: '#c2185b', wear: tr('Pink suit, a beret') }, // designer: pink, a beret
  atlas: { suit: '#e7f0ff', trim: '#3d8bff', pack: '#9cc2ff', extra: 'goggles', extraColor: '#ffd34d', wear: tr('White and blue suit, inspector goggles') }, // QA: white and blue, inspector goggles
  rhea: { suit: '#3b1f48', trim: '#f48dca', pack: '#5d2f70', extra: 'antenna', extraColor: '#f48dca', wear: tr('Plum suit, a glowing antenna') }, // ML: plum, a glowing antenna
  gemini: { suit: '#dfeaff', trim: '#6da8ff', pack: '#a7c8ff', extra: 'twin', extraColor: '#ffe066', wear: tr('Sky suit, twin antennae') }, // two antennae, as the twins
  grok: { suit: '#1b1b1f', trim: '#f5f5f5', pack: '#3a3a42', extra: 'mohawk', extraColor: '#ff4d4d', wear: tr('Black suit, a red crest') }, // scout: black and white, a red crest
  deepseek: { suit: '#14284f', trim: '#4aa5ff', pack: '#22407a', extra: 'headlamp', extraColor: '#bfe3ff', wear: tr('Deep blue suit, a headlamp') }, // deep blue, a headlamp
  qwen: { suit: '#fff6d6', trim: '#ffb81f', pack: '#ffd978', extra: 'flower', extraColor: '#ff6fa8', wear: tr('Gold suit, a flower') }, // curator: gold, a flower
  mira: { suit: '#e9fffb', trim: '#62e7d3', pack: '#a6f3e7', extra: 'halo', extraColor: '#8ff5e5', wear: tr('White and teal suit, a halo') }, // control: white and teal, a halo
};

const PLAIN = { suit: '#e9e6df', trim: '#a8a396', pack: '#c9c4ba', extra: null, extraColor: '#fff', wear: '' };

/** The outfit for a crew member (a plain suit for anyone not listed). */
export const outfitOf = (id) => OUTFITS[id] ?? PLAIN;
