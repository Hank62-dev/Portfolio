// Weather for the morning briefing, from Open-Meteo (free, no key). Pure helpers; the fetch lives in the view.

// WMO weather codes grouped into the few conditions the briefing talks about.
const GROUPS = [
  { codes: [0], id: 'clear' },
  { codes: [1, 2], id: 'partly' },
  { codes: [3], id: 'cloudy' },
  { codes: [45, 48], id: 'fog' },
  { codes: [51, 53, 55, 56, 57], id: 'drizzle' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], id: 'rain' },
  { codes: [71, 73, 75, 77, 85, 86], id: 'snow' },
  { codes: [95, 96, 99], id: 'storm' },
];

export const conditionOf = (code) => GROUPS.find((group) => group.codes.includes(code))?.id ?? 'cloudy';

export const CONDITION_TEXT = {
  en: { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Foggy', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorms' },
  vi: { clear: 'Trời quang', partly: 'Ít mây', cloudy: 'Nhiều mây', fog: 'Sương mù', drizzle: 'Mưa phùn', rain: 'Mưa', snow: 'Tuyết', storm: 'Dông' },
};

export const forecastUrl = ({ latitude, longitude }) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
  '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=auto&forecast_days=1';

const round = (n) => (Number.isFinite(n) ? Math.round(n) : null);

/** Open-Meteo's response reduced to what the card shows; null if the shape is not what we expect. */
export const parseForecast = (data) => {
  const current = data?.current;
  const daily = data?.daily;
  if (!current || !daily || !Array.isArray(daily.temperature_2m_max)) return null;
  return {
    condition: conditionOf(current.weather_code),
    temperature: round(current.temperature_2m),
    feelsLike: round(current.apparent_temperature),
    wind: round(current.wind_speed_10m),
    high: round(daily.temperature_2m_max[0]),
    low: round(daily.temperature_2m_min?.[0]),
    rainChance: round(daily.precipitation_probability_max?.[0]),
  };
};

/** A one-line summary, also given to the AI as a fact. */
export const summarize = (forecast, language = 'en') => {
  if (!forecast) return '';
  const text = CONDITION_TEXT[language]?.[forecast.condition] ?? CONDITION_TEXT.en[forecast.condition];
  const rain = forecast.rainChance == null ? '' : language === 'vi' ? `, khả năng mưa ${forecast.rainChance}%` : `, ${forecast.rainChance}% chance of rain`;
  return `${text}, ${forecast.temperature}°C (${forecast.low}–${forecast.high}°C)${rain}`;
};
