import doomMask from './dr-doom-mask.svg';
import agamottoEye from './eye-of-agamotto.svg';

const paths = {
  palette: <><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.5-3.3 1.5 1.5 0 0 1 1.1-2.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><path d="M7 10h.01M10 6.5h.01M15 7h.01M17.5 10.5h.01"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-4-.9L3 21l1.8-5a9 9 0 0 1-.8-4.5 8.5 8.5 0 0 1 17 0Z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  folder: <path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
  bookmark: <path d="M6 3h12v18l-6-4-6 4Z"/>,
  box: <><path d="m12 3 9 5v9l-9 5-9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v9M7 5.8l10 5.4"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
  up: <path d="M12 19V5m-6 6 6-6 6 6"/>,
  sparkles: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="m21 2 .7 1.3L23 4l-1.3.7L21 6l-.7-1.3L19 4l1.3-.7Z"/></>,
  settings: <><path d="m9 3-.5 2-2 .9-1.8-.6-2 3.4L4 10v3l-1.3 1.3 2 3.4 1.8-.6 2 .9.5 3h5l.5-3 2-.9 1.8.6 2-3.4L20 13v-3l1.3-1.3-2-3.4-1.8.6-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon: <path d="M20.5 13A9 9 0 0 1 11 3a9 9 0 1 0 9.5 10Z"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M3 16v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4"/></>,
  paperclip: <path d="m9 17 8-8a3 3 0 0 0-4-4L4 14a5 5 0 0 0 7 7l9-9a7 7 0 0 0-10-10L2 10"/>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  wifi: <><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r=".6"/></>,
  battery: <><rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10v4M5 10h11v4H5Z"/></>,
  sliders: <><path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
};

export default function Icon({ name, size = 20, className = '', ...props }) {
  if (name === 'doom' || name === 'strange') return <img src={name === 'doom' ? doomMask : agamottoEye} alt="" className={`inline-block shrink-0 align-middle object-contain ${className}`} width={size} height={size} aria-hidden="true" {...props} />;
  return <svg className={`inline-block shrink-0 align-middle ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.chat}</svg>;
}
