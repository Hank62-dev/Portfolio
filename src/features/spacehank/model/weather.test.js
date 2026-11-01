import { describe, expect, it } from 'vitest';
import { conditionOf, forecastUrl, parseForecast, summarize } from './weather';

const sample = {
  current: { temperature_2m: 31.4, apparent_temperature: 37.2, weather_code: 80, wind_speed_10m: 9.6 },
  daily: { temperature_2m_max: [34.1], temperature_2m_min: [26.2], precipitation_probability_max: [70] },
};

describe('weather', () => {
  it('groups WMO codes into conditions and treats unknown codes as cloudy', () => {
    expect(conditionOf(0)).toBe('clear');
    expect(conditionOf(2)).toBe('partly');
    expect(conditionOf(63)).toBe('rain');
    expect(conditionOf(95)).toBe('storm');
    expect(conditionOf(1234)).toBe('cloudy');
  });

  it('reduces the response to whole numbers', () => {
    expect(parseForecast(sample)).toEqual({ condition: 'rain', temperature: 31, feelsLike: 37, wind: 10, high: 34, low: 26, rainChance: 70 });
  });

  it('returns null for a response of the wrong shape', () => {
    expect(parseForecast(null)).toBeNull();
    expect(parseForecast({ current: {}, daily: {} })).toBeNull();
  });

  it('summarises in English and Vietnamese', () => {
    expect(summarize(parseForecast(sample), 'en')).toBe('Rain, 31°C (26–34°C), 70% chance of rain');
    expect(summarize(parseForecast(sample), 'vi')).toBe('Mưa, 31°C (26–34°C), khả năng mưa 70%');
    expect(summarize(null)).toBe('');
  });

  it('builds the request for one day at a place', () => {
    const url = forecastUrl({ latitude: 10.8, longitude: 106.6 });
    expect(url).toContain('latitude=10.8');
    expect(url).toContain('longitude=106.6');
    expect(url).toContain('forecast_days=1');
  });
});
