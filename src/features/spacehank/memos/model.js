import { locale, tr } from '../lang';
// Voice Memos as plain functions: how long, what to call it, and which way it was said.

export const formatDuration = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** A title for a memo: the first few words of what was said, or the time it was recorded. */
export const titleFrom = (transcript, at = Date.now()) => {
  const words = String(transcript ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length) return words.slice(0, 7).join(' ') + (words.length > 7 ? '…' : '');
  return `Memo ${new Date(at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
};

export const LANGUAGES = [
  { id: 'vi-VN', label: tr('Tiếng Việt') },
  { id: 'en-US', label: tr('English') },
];

/** Whether this browser can turn speech into text while recording. */
export const canTranscribe = (scope = globalThis) => Boolean(scope.SpeechRecognition || scope.webkitSpeechRecognition);

/** The note a memo becomes in Second Brain: its title, the words, and a tag. */
export const asNote = (memo) => `${memo.title}\n#voice\n${memo.transcript || '(No transcript. The recording is kept in Voice Memos.)'}`;

/** Heights (0 to 1) for `bars` slim bars summarising an array of volume samples, for a waveform drawing. */
export const bars = (samples, count = 48) => {
  if (!samples.length) return Array.from({ length: count }, () => 0.04);
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i / count) * samples.length);
    const to = Math.max(from + 1, Math.floor(((i + 1) / count) * samples.length));
    const slice = samples.slice(from, to);
    return Math.max(0.04, Math.min(1, Math.max(...slice)));
  });
};
