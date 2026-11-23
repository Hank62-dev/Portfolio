import { describe, expect, it } from 'vitest';
import { makerFamily } from './bridge';
import { calendarReturn } from './useAndroid';

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

describe('the link that brings Google’s sign-in back to the app', () => {
  it('says how the sign-in went', () => {
    expect(calendarReturn('hank62://calendar?google=connected')).toBe('connected');
    expect(calendarReturn('hank62://calendar/?google=denied')).toBe('denied');
  });

  it('is nothing for another link, or an answer it does not know', () => {
    expect(calendarReturn('hank62://calendar?google=<script>')).toBeNull();
    expect(calendarReturn('https://example.com/?google=connected')).toBeNull();
    expect(calendarReturn(undefined)).toBeNull();
  });
});
