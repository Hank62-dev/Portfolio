import { useEffect, useState } from 'react';
import { calendarBetween } from '../api/owner';
import { spacehankConfig } from '../config';
import { demoSchedule } from '../model/demo';
import { forecastUrl, parseForecast } from '../model/weather';
import { tr } from '../lang';

const CACHE_KEY = 'hank62.weather';
const CACHE_MS = 15 * 60 * 1000;

const readCache = () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
    return cached && Date.now() - cached.at < CACHE_MS ? cached.forecast : null;
  } catch {
    return null;
  }
};

const writeCache = (forecast) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), forecast }));
  } catch {
    /* storage is blocked: the weather is simply fetched again next time */
  }
};

/** Today's weather and calendar. A guest gets the real weather and a made-up schedule; the owner gets their own. */
export function useBriefing({ owner }) {
  const [weather, setWeather] = useState(() => readCache());
  const [events, setEvents] = useState(null);
  const [calendarConfigured, setCalendarConfigured] = useState(!owner);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (weather) return undefined;
    let live = true;
    fetch(forecastUrl(spacehankConfig.home))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('weather'))))
      .then((data) => {
        const forecast = parseForecast(data);
        if (!live || !forecast) return;
        writeCache(forecast);
        setWeather(forecast);
      })
      .catch(() => live && setProblem(tr('The weather could not be loaded.')));
    return () => {
      live = false;
    };
  }, [weather]);

  useEffect(() => {
    let live = true;
    if (!owner) {
      setEvents(demoSchedule());
      return undefined;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    calendarBetween(start, end)
      .then((data) => {
        if (!live) return;
        setCalendarConfigured(data.configured);
        setEvents(data.events);
      })
      .catch(() => live && setEvents([]));
    return () => {
      live = false;
    };
  }, [owner]);

  return { weather, events, calendarConfigured, problem };
}
