import { useEffect } from 'react';

const setMeta = (selector, attr, value) => {
  const el = document.head.querySelector(selector);
  if (el && value) el.setAttribute(attr, value);
};

/** Per-route <title>, description and Open Graph tags for a client-rendered site. */
export const usePageMeta = ({ title, description }) => {
  useEffect(() => {
    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
  }, [title, description]);
};
