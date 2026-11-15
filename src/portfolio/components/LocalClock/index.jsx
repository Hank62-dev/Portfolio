import { useEffect, useState } from 'react';

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Ho Chi Minh City time, ticking every second. */
const LocalClock = () => {
  const [now, setNow] = useState(() => TIME.format(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(TIME.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <time className="tabular-nums">{now}</time>;
};

export default LocalClock;
