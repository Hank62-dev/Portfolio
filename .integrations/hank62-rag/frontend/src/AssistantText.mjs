import { createElement, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';

export function revealText(text, onFrame) {
  const words = text.match(/\s*\S+\s*|\s+/gu) || [];
  const step = Math.max(1, Math.ceil(words.length / 160));
  let position = 0;
  let timer = setTimeout(function tick() {
    position = Math.min(position + step, words.length);
    if (position < words.length) timer = setTimeout(tick, 25);
    onFrame(words.slice(0, position).join(''));
  }, 25);
  return () => clearTimeout(timer);
}

export default function AssistantText({ text, animate = false, onComplete }) {
  const [visible, setVisible] = useState(animate ? '' : text);
  const content = useRef(null);
  useEffect(() => {
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(text);
      if (animate) onComplete?.();
      return;
    }
    setVisible('');
    // shortcut: reveal the completed API response; stream tokens when the API supports it.
    return revealText(text, next => {
      setVisible(next);
      if (next === text) onComplete?.();
    });
  }, [text, animate, onComplete]);
  useEffect(() => {
    if (!animate) return;
    const scroll = content.current?.closest('[role="log"]')?.parentElement;
    if (scroll && scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 80) scroll.scrollTop = scroll.scrollHeight;
  }, [visible, animate]);
  return createElement('div', { ref: content, className: 'assistant-markdown', 'aria-busy': animate && visible !== text }, createElement(Markdown, null, animate ? visible : text));
}
