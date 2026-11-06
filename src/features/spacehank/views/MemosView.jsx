import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Download, Ellipsis, Languages, Mic, NotebookPen, Pause, Play, ScrollText, Sparkles, Square, Trash2 } from 'lucide-react';
import { Badge, Button, Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead, Segmented } from '../components/Page';
import { transcribeRecording } from '../memos/audio';
import { LANGUAGES, asNote, bars, canTranscribe, formatDuration, titleFrom } from '../memos/model';
import { memos } from '../memos/store';
import { createNote } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { useFab } from '../fab';
import { useStore } from '../store';
import { locale, tr } from '../lang';

const PEAKS = 64;

/** The bars of a memo, filled up to how far playback has got. Clicking one seeks. */
function Wave({ peaks, progress, onSeek, live }) {
  return (
    <div className="flex h-12 min-w-0 flex-1 items-center gap-[3px] max-sm:order-1 max-sm:basis-full" role={onSeek ? 'slider' : 'img'} aria-label={tr('Waveform')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} onClick={(e) => onSeek?.((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth)}>
      {peaks.map((p, i) => (
        <i key={i} className={clsx('block flex-1 rounded-full transition-colors', live ? 'bg-signal' : i / peaks.length <= progress ? 'bg-signal' : 'bg-wash/20')} style={{ height: `${Math.max(8, p * 100)}%` }} />
      ))}
    </div>
  );
}

function Memo({ memo, playing, progress, onPlay, onSeek, onNotify, writing, onWrite }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(memo.title);
  useEffect(() => setTitle(memo.title), [memo.title]); // the words just written may have named it
  useEffect(() => {
    if (writing?.done) setOpen(true); // the words that just arrived are shown
  }, [writing]);
  const send = async () => {
    await createNote(asNote({ ...memo, title }), { html: textToHtml(asNote({ ...memo, title })) });
    onNotify?.(tr('Saved to Second Brain'));
  };
  const download = () => {
    const url = URL.createObjectURL(memo.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'memo'}.${memo.mime.includes('mp4') ? 'm4a' : memo.mime.includes('ogg') ? 'ogg' : 'webm'}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <li className="rounded-3xl border border-line bg-ink-1 p-4" data-memo={memo.title}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <button type="button" onClick={() => onPlay(memo)} aria-label={`${playing ? tr('Pause') : tr('Play')} ${memo.title}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-bone text-ink-0 transition-transform hover:scale-105 active:scale-95">
          {playing ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <input aria-label={tr('Title')} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== memo.title && memos.update(memo.id, { title: title.trim() })} className="w-full truncate bg-transparent text-fine font-medium text-bone focus-visible:outline-none" />
          <small className="font-mono text-[0.68rem] text-bone-faint">
            {new Date(memo.at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {formatDuration(memo.duration)}
          </small>
        </div>
        <Wave peaks={memo.peaks} progress={progress} onSeek={(f) => onSeek(memo, f)} />
        <span className="flex shrink-0 items-center gap-1.5 max-sm:order-2 max-sm:basis-full max-sm:justify-end">
          <Button variant="secondary" size="sm" aria-label={tr('Show the transcript')} aria-pressed={open} onClick={() => setOpen(!open)} className={clsx(open && 'border-bone')}>
            <ScrollText size={14} aria-hidden="true" /> {tr('Transcript')}
          </Button>
          <Button variant="secondary" size="sm" aria-label={memo.transcript ? tr('Write it down again with AI') : tr('Write it down with AI')} title={memo.transcript ? tr('Write it down again with AI') : tr('Write it down with AI')} loading={Boolean(writing?.busy)} onClick={() => onWrite(memo)}>
            <Sparkles size={14} className="text-signal" aria-hidden="true" /> {tr('AI transcribe')}
          </Button>
          <Menu
            align="end"
            trigger={
              <Button variant="secondary" size="icon" aria-label={tr('More')} title={tr('More')}>
                <Ellipsis size={16} aria-hidden="true" />
              </Button>
            }
            items={[
              { id: 'note', label: tr('Save to Second Brain'), icon: NotebookPen, onSelect: send },
              { id: 'download', label: tr('Download'), icon: Download, onSelect: download },
              { id: 'delete', label: tr('Delete'), icon: Trash2, onSelect: () => memos.remove(memo.id) },
            ]}
          />
        </span>
      </div>
      {writing?.busy && (
        <p className="mt-3 font-mono text-fine text-bone-dim" role="status">
          {tr('Writing down what was said…')}
        </p>
      )}
      {writing?.error && (
        <p className="mt-3 rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
          {writing.error}
        </p>
      )}
      {open && (
        <textarea
          key={memo.transcript}
          aria-label={tr('Transcript')}
          rows={4}
          defaultValue={memo.transcript}
          placeholder={tr('No transcript. Type one if you like.')}
          onBlur={(e) => e.target.value !== memo.transcript && memos.update(memo.id, { transcript: e.target.value })}
          className="mt-3 w-full resize-y rounded-2xl border border-line bg-ink-2 p-3 text-fine leading-relaxed text-bone focus-visible:border-signal focus-visible:outline-none"
        />
      )}
    </li>
  );
}

export default function MemosView({ onNotify }) {
  const { loaded, items } = useStore(memos.store);
  const [status, setStatus] = useState('idle'); // idle | recording
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState([]);
  const [heard, setHeard] = useState('');
  const [lang, setLang] = useState('vi-VN');
  const [problem, setProblem] = useState('');
  const [playing, setPlaying] = useState({ id: null, progress: 0 });
  const rec = useRef({});
  const audio = useRef(null);
  const transcribes = canTranscribe();
  const heardRef = useRef('');
  heardRef.current = heard;
  const langRef = useRef(lang);
  langRef.current = lang;

  // The browser's own speech-to-text only works while recording, and only in some browsers. This one works on any
  // recording, in any browser: the server's speech model listens to it afterwards (see memos/audio.js).
  const [writing, setWriting] = useState({}); // memo id -> { busy } | { error } | { done }
  const writeDown = useCallback(async (memo) => {
    const mark = (state) => setWriting((all) => ({ ...all, [memo.id]: state }));
    mark({ busy: true });
    try {
      const text = await transcribeRecording(memo.blob, langRef.current === 'en-US' ? 'en' : 'vi');
      if (!text) {
        mark({ error: tr('No words were heard in this recording.') });
        return;
      }
      await memos.update(memo.id, { transcript: text, ...(/^Memo /.test(memo.title) ? { title: titleFrom(text) } : {}) });
      mark({ done: true });
    } catch (error) {
      mark({ error: error.message });
    }
  }, []);

  useEffect(() => {
    void memos.load();
    const recorder = rec.current;
    const player = audio;
    return () => {
      recorder.stream?.getTracks().forEach((t) => t.stop());
      player.current?.pause();
    };
  }, []);

  const start = async () => {
    setProblem('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setProblem(tr('This browser cannot record audio.'));
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setProblem(tr('The microphone is blocked. Allow it in the address bar, then try again.'));
      return;
    }
    const r = rec.current;
    r.stream = stream;
    r.chunks = [];
    r.peaks = [];
    r.final = '';
    const recorder = new MediaRecorder(stream);
    r.recorder = recorder;
    r.mime = recorder.mimeType || 'audio/webm';
    recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
    recorder.start(250);
    r.startedAt = Date.now();

    // volume, for the live waveform and for the memo's picture
    const Context = window.AudioContext || window.webkitAudioContext;
    r.context = new Context();
    const analyser = r.context.createAnalyser();
    analyser.fftSize = 512;
    r.context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    r.meter = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      r.peaks.push(Math.min(1, peak * 1.6));
      setLive(r.peaks.slice(-PEAKS).map((p) => p));
      setSeconds((Date.now() - r.startedAt) / 1000);
    }, 100);

    if (transcribes) {
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new Recognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) r.final += `${piece} `;
          else interim += piece;
        }
        setHeard((r.final + interim).trim());
      };
      recognition.onend = () => r.recorder?.state === 'recording' && r.recognition === recognition && recognition.start();
      try {
        recognition.start();
        r.recognition = recognition;
      } catch {
        r.recognition = null;
      }
    }
    setHeard('');
    setSeconds(0);
    setStatus(tr('recording'));
  };

  const stop = useCallback(async () => {
    const r = rec.current;
    if (!r.recorder) return;
    window.clearInterval(r.meter);
    const recognition = r.recognition;
    r.recognition = null;
    recognition?.stop?.();
    const finished = new Promise((resolve) => {
      r.recorder.onstop = resolve;
    });
    r.recorder.stop();
    await finished;
    r.stream.getTracks().forEach((t) => t.stop());
    r.context?.close();
    const duration = (Date.now() - r.startedAt) / 1000;
    const blob = new Blob(r.chunks, { type: r.mime });
    const transcript = r.final.trim() || heardRef.current;
    r.recorder = null;
    setStatus(tr('idle'));
    setLive([]);
    if (blob.size && duration >= 0.5) {
      const memo = await memos.create({ title: titleFrom(transcript), transcript, duration, blob, mime: r.mime, peaks: bars(r.peaks, PEAKS), at: Date.now() });
      onNotify?.('Memo saved');
      if (!transcript) void writeDown(memo); // the browser heard nothing (or cannot listen): the server writes it down
    }
    setHeard('');
  }, [onNotify, writeDown]);

  // How long a memo is. A recording made by the browser (webm) carries no length of its own, so the audio element says
  // "Infinity" until it has played to the end: the length kept with the memo is used then.
  const lengthOf = (el, memo) => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : memo.duration || 1);

  const frame = useRef(0);
  const settle = () => {
    window.cancelAnimationFrame(frame.current);
    frame.current = 0;
  };
  useEffect(() => settle, []); // stops the playhead when the page closes

  const play = (memo) => {
    if (playing.id === memo.id && audio.current && !audio.current.paused) {
      audio.current.pause();
      settle();
      setPlaying({ id: null, progress: 0 });
      return;
    }
    audio.current?.pause();
    settle();
    const url = URL.createObjectURL(memo.blob);
    const el = new Audio(url);
    audio.current = el;
    const finish = () => {
      settle();
      URL.revokeObjectURL(url);
      if (audio.current === el) setPlaying({ id: null, progress: 0 });
    };
    // the playhead moves with every frame, not with the few updates a second the audio element reports
    const follow = () => {
      setPlaying({ id: memo.id, progress: Math.min(1, el.currentTime / lengthOf(el, memo)) });
      frame.current = window.requestAnimationFrame(follow);
    };
    el.onended = finish;
    el.onerror = finish;
    el.onpause = () => !el.ended && settle();
    setPlaying({ id: memo.id, progress: 0 });
    void el.play().then(() => {
      settle();
      frame.current = window.requestAnimationFrame(follow);
    }, finish);
  };

  const seek = (memo, fraction) => {
    if (playing.id === memo.id && audio.current) audio.current.currentTime = Math.max(0, Math.min(1, fraction)) * lengthOf(audio.current, memo);
    else play(memo);
  };

  const recording = status === 'recording';
  useFab({ label: recording ? tr('Stop recording') : tr('Record'), icon: recording ? Square : Mic, onPress: recording ? stop : start });

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow={tr('Capture')} title={tr('Voice')} accent="Memos." description={tr('Press the button and say it. It keeps the recording, turns your words into text when the browser can, and can send it to Second Brain.')} />

      <section className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(70%_100%_at_50%_0%,rgb(255_91_46/0.16),transparent_60%),var(--color-ink-1)] p-6 sm:p-8" aria-label={tr('Recorder')}>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <div className="relative grid size-28 place-items-center">
            {recording && <i className="absolute inset-0 animate-ping rounded-full bg-danger/25 [animation-duration:1.8s]" aria-hidden="true" />}
            <button
              type="button"
              onClick={recording ? stop : start}
              aria-label={recording ? tr('Stop recording') : tr('Start recording')}
              className={clsx('relative grid size-24 place-items-center rounded-full text-ink-0 max-md:size-20 shadow-[0_14px_40px_-10px_rgb(255_91_46/0.7)] transition-transform hover:scale-105 active:scale-95', recording ? 'bg-danger' : 'bg-gradient-to-br from-signal to-[#ff8a5c]')}
            >
              {recording ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
            </button>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <b className="font-display text-h2 leading-none text-bone tabular-nums" data-timer>
              {formatDuration(seconds)}
            </b>
            <small className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">{recording ? tr('Recording, tap to stop') : tr('Tap to record')}</small>
          </div>
          {recording && (
            <div className="flex h-14 w-full items-center gap-[3px]" aria-hidden="true">
              <Wave peaks={live.length ? live : [0.05]} progress={1} live />
            </div>
          )}
          {recording && heard && (
            <p className="max-h-24 w-full overflow-y-auto rounded-2xl bg-shade/25 p-3 text-center text-fine leading-relaxed text-bone" data-heard>
              {heard}
            </p>
          )}
          {!recording && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-fine text-bone-dim">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.78rem]">
                  <Languages size={14} aria-hidden="true" /> {tr('Speaking')}
                </span>
                <Segmented label={tr('Language')} value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))} />
              </div>
              {!transcribes && <Badge>{tr('This browser cannot type while you speak: the words are written down after you stop.')}</Badge>}
            </div>
          )}
          {problem && (
            <p className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2.5 font-mono text-fine text-danger" role="alert">
              {problem}
            </p>
          )}
        </div>
      </section>

      {loaded && items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-signal-soft text-signal">
            <AudioLines size={22} aria-hidden="true" />
          </span>
          <h2 className="font-display text-lead text-bone">{tr('No memos yet')}</h2>
          <p className="max-w-sm text-fine text-bone-dim">{tr('The first one you record shows up here, with its waveform and the words you said.')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={tr('Memos')}>
          {items.map((m) => (
            <Memo key={m.id} memo={m} playing={playing.id === m.id} progress={playing.id === m.id ? playing.progress : 0} onPlay={play} onSeek={seek} onNotify={onNotify} writing={writing[m.id]} onWrite={writeDown} />
          ))}
        </ul>
      )}
    </div>
  );
}
