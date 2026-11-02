import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Mic, Pause, Play, Square, Trash2 } from 'lucide-react';
import { Badge, Button, Select } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { LANGUAGES, asNote, bars, canTranscribe, formatDuration, titleFrom } from '../memos/model';
import { memos } from '../memos/store';
import { createNote } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { useStore } from '../store';

const PEAKS = 64;

/** The bars of a memo, filled up to how far playback has got. Clicking one seeks. */
function Wave({ peaks, progress, onSeek, live }) {
  return (
    <div className="flex h-12 flex-1 items-center gap-[3px]" role={onSeek ? 'slider' : 'img'} aria-label="Waveform" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} onClick={(e) => onSeek?.((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth)}>
      {peaks.map((p, i) => (
        <i key={i} className={clsx('block flex-1 rounded-full transition-colors', live ? 'bg-signal' : i / peaks.length <= progress ? 'bg-signal' : 'bg-white/20')} style={{ height: `${Math.max(8, p * 100)}%` }} />
      ))}
    </div>
  );
}

function Memo({ memo, playing, progress, onPlay, onSeek, onNotify }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(memo.title);
  const send = async () => {
    await createNote(asNote({ ...memo, title }), { html: textToHtml(asNote({ ...memo, title })) });
    onNotify?.('Saved to Second Brain');
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
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onPlay(memo)} aria-label={`${playing ? 'Pause' : 'Play'} ${memo.title}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-bone text-ink-0 transition-transform hover:scale-105 active:scale-95">
          {playing ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== memo.title && memos.update(memo.id, { title: title.trim() })} className="w-full truncate bg-transparent text-fine font-medium text-bone focus-visible:outline-none" />
          <small className="font-mono text-[0.68rem] text-bone-faint">
            {new Date(memo.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {formatDuration(memo.duration)}
          </small>
        </div>
        <Wave peaks={memo.peaks} progress={progress} onSeek={(f) => onSeek(memo, f)} />
        <span className="flex shrink-0 items-center gap-0.5">
          <Button variant="secondary" size="icon" aria-label="Show the transcript" aria-pressed={open} onClick={() => setOpen(!open)}>
            <FileText size={14} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Save to Second Brain" onClick={send}>
            <FileText size={14} className="text-signal" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Download" onClick={download}>
            <Download size={14} aria-hidden="true" />
          </Button>
          <Button variant="danger" size="icon" aria-label={`Delete ${memo.title}`} onClick={() => memos.remove(memo.id)}>
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </span>
      </div>
      {open && (
        <textarea
          aria-label="Transcript"
          rows={4}
          defaultValue={memo.transcript}
          placeholder="No transcript. Type one if you like."
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
      setProblem('This browser cannot record audio.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setProblem('The microphone is blocked. Allow it in the address bar, then try again.');
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
    setStatus('recording');
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
    setStatus('idle');
    setLive([]);
    if (blob.size && duration >= 0.5) {
      await memos.create({ title: titleFrom(transcript), transcript, duration, blob, mime: r.mime, peaks: bars(r.peaks, PEAKS), at: Date.now() });
      onNotify?.('Memo saved');
    }
    setHeard('');
  }, [onNotify]);

  const play = (memo) => {
    if (playing.id === memo.id && audio.current && !audio.current.paused) {
      audio.current.pause();
      setPlaying({ id: null, progress: 0 });
      return;
    }
    audio.current?.pause();
    const url = URL.createObjectURL(memo.blob);
    const el = new Audio(url);
    audio.current = el;
    el.ontimeupdate = () => setPlaying({ id: memo.id, progress: el.duration ? el.currentTime / el.duration : 0 });
    el.onended = () => {
      URL.revokeObjectURL(url);
      setPlaying({ id: null, progress: 0 });
    };
    setPlaying({ id: memo.id, progress: 0 });
    void el.play().catch(() => setPlaying({ id: null, progress: 0 }));
  };

  const seek = (memo, fraction) => {
    if (playing.id === memo.id && audio.current?.duration) audio.current.currentTime = Math.max(0, Math.min(1, fraction)) * audio.current.duration;
    else play(memo);
  };

  const recording = status === 'recording';

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Capture" title="Voice" accent="Memos." description="Press the button and say it. It keeps the recording, turns your words into text when the browser can, and can send it to Second Brain." />

      <section className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(70%_100%_at_50%_0%,rgb(255_91_46/0.16),transparent_60%),var(--color-ink-1)] p-6 sm:p-8" aria-label="Recorder">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5">
          <div className="relative grid size-28 place-items-center">
            {recording && <i className="absolute inset-0 animate-ping rounded-full bg-danger/25 [animation-duration:1.8s]" aria-hidden="true" />}
            <button
              type="button"
              onClick={recording ? stop : start}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
              className={clsx('relative grid size-24 place-items-center rounded-full text-ink-0 shadow-[0_14px_40px_-10px_rgb(255_91_46/0.7)] transition-transform hover:scale-105 active:scale-95', recording ? 'bg-danger' : 'bg-gradient-to-br from-signal to-[#ff8a5c]')}
            >
              {recording ? <Square size={26} fill="currentColor" aria-hidden="true" /> : <Mic size={30} aria-hidden="true" />}
            </button>
          </div>
          <b className="font-display text-h2 leading-none text-bone tabular-nums" data-timer>
            {formatDuration(seconds)}
          </b>
          {recording && (
            <div className="flex h-14 w-full items-center gap-[3px]" aria-hidden="true">
              <Wave peaks={live.length ? live : [0.05]} progress={1} live />
            </div>
          )}
          {recording && heard && (
            <p className="max-h-24 w-full overflow-y-auto rounded-2xl bg-black/25 p-3 text-center text-fine leading-relaxed text-bone" data-heard>
              {heard}
            </p>
          )}
          {!recording && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-fine text-bone-dim">
              {transcribes ? (
                <label className="flex items-center gap-2 font-mono text-[0.78rem]">
                  Speaking
                  <Select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value)} className="h-9 w-36 py-1">
                    {LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </label>
              ) : (
                <Badge tone="warn">No speech-to-text in this browser, recording only</Badge>
              )}
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
        <p className="rounded-3xl border border-dashed border-line-strong p-6 text-center text-fine text-bone-dim">No memos yet. The first one you record shows up here.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Memos">
          {items.map((m) => (
            <Memo key={m.id} memo={m} playing={playing.id === m.id} progress={playing.id === m.id ? playing.progress : 0} onPlay={play} onSeek={seek} onNotify={onNotify} />
          ))}
        </ul>
      )}
    </div>
  );
}
