import { describe, expect, it } from 'vitest';
import { makerFamily } from './bridge';

describe('the maker of the phone', () => {
  it('is grouped with the makers that share its way of stopping apps', () => {
    expect(makerFamily('OPPO')).toBe('oppo');
    expect(makerFamily('realme')).toBe('oppo');
    expect(makerFamily('OnePlus')).toBe('oppo');
    expect(makerFamily('Xiaomi')).toBe('xiaomi');
    expect(makerFamily('vivo')).toBe('vivo');
    expect(makerFamily('HONOR')).toBe('huawei');
    expect(makerFamily('samsung')).toBe('samsung');
  });

  it('is nothing for a maker that leaves apps be, or one not known', () => {
    expect(makerFamily('Google')).toBeNull();
    expect(makerFamily('')).toBeNull();
    expect(makerFamily()).toBeNull();
  });
});
