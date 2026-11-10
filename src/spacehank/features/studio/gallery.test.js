import { describe, expect, it } from 'vitest';
import { composePrompt } from './gallery';

describe('composePrompt', () => {
  it('joins the idea, look and shape, and leaves the brand out unless asked', () => {
    expect(composePrompt({ text: ' a lighthouse ', style: 'photo', shape: 'wide', brand: false, brandText: 'BRAND' })).toBe(
      'a lighthouse. cinematic photograph, natural light, 35mm, subtle grain. wide 16:9 composition'
    );
  });

  it('adds the brand direction last when it is on', () => {
    const prompt = composePrompt({ text: 'a desk', style: 'icon', shape: 'square', brand: true, brandText: 'BRAND' });
    expect(prompt.endsWith('. BRAND')).toBe(true);
  });

  it('ignores an unknown style or shape rather than printing "undefined"', () => {
    expect(composePrompt({ text: 'a desk', style: 'nope', shape: '', brand: false, brandText: '' })).toBe('a desk');
  });
});
