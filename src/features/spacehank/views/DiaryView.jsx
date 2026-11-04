import { useEffect, useMemo, useState } from 'react';
import { Footprints, Lock, PenLine, ShieldCheck } from 'lucide-react';
import { Loading, Skeleton } from '../../../design-system';
import { useFab } from '../fab';
import { loadNotes, notesStore } from '../notes/library';
import { dayKey } from '../notes/notes';
import DiaryLock from '../diary/DiaryLock';
import EntrySheet from '../diary/EntrySheet';
import Journey from '../diary/Journey';
import LockSettings from '../diary/LockSettings';
import { diaryLock, lockDiary } from '../diary/lock';
import MoodFace from '../diary/MoodFace';
import { useDiaryLocked } from '../diary/useLock';
import Writer from '../diary/Writer';
import { Thumb, SoftButton } from '../diary/ui';
import { bodyOf, dayLabel, encouragement, entryOf, excerptOf, journeyDays, journeyStats, memories, milestonesOf, moodWord, shortLabel, weekMoods } from '../diary/model';
import Pet from '../pet/Pet';
import { usePet } from '../pet/usePet';
import { useStore } from '../store';

const PAGE = 21; // days shown at first, and how many more each time

const Pill = ({ children }) => <span className="rounded-full bg-[color:var(--dz-text)]/15 px-3.5 py-1.5 font-body text-[0.95rem] leading-none text-[color:var(--dz-text)] backdrop-blur">{children}</span>;

/** Nhật ký: a diary written a day at a time and walked as a journey. The pages are journal notes, so Second Brain shows them too. */
export default function DiaryView({ onNotify }) {
  const { notes, loaded, error } = useStore(notesStore);
  const pet = usePet();
  const [shown, setShown] = useState(PAGE);
  const [sheet, setSheet] = useState(null); // { mode: 'write' | 'read', day, label? }
  const [settings, setSettings] = useState(false);
  const locked = useDiaryLocked();
  const lockOn = useStore(diaryLock, (s) => s.enabled);
  const today = dayKey();

  useEffect(() => {
    void loadNotes();
  }, []);

  const stats = useMemo(() => journeyStats(notes, today), [notes, today]);
  const { days, more } = useMemo(() => journeyDays(notes, today, { days: shown }), [notes, today, shown]);
  const marks = useMemo(() => milestonesOf(notes), [notes]);
  const week = useMemo(() => weekMoods(notes, today), [notes, today]);
  const remembered = useMemo(() => memories(notes, today), [notes, today]);
  const todayEntry = days[0]?.entry ?? null;

  const write = (day) => setSheet({ mode: 'write', day });
  const read = (day, label) => setSheet({ mode: 'read', day, label });
  useFab(locked ? null : { label: 'Viết nhật ký hôm nay', icon: PenLine, onPress: () => write(today) });

  // a locked diary closes whatever was open on it (a page being written is kept as a draft)
  useEffect(() => {
    if (locked) {
      setSheet(null);
      setSettings(false);
    }
  }, [locked]);

  const entry = sheet ? entryOf(notes, sheet.day) : null;

  if (locked) {
    return (
      <div data-sky className="sky -mx-5 -mt-4 min-h-[80vh] px-4 py-6 md:mx-0 md:mt-0 md:rounded-[2rem] md:px-8 md:py-10" data-diary>
        <div className="mx-auto w-full max-w-[34rem]">
          <DiaryLock />
        </div>
      </div>
    );
  }

  return (
    <div data-sky className="sky -mx-5 -mt-4 min-h-[80vh] px-4 py-6 md:mx-0 md:mt-0 md:rounded-[2rem] md:px-8 md:py-10" data-diary>
      <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-5">
        <header className="flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="font-display text-[2.6rem] leading-none text-[color:var(--dz-text)]">Hành trình của bạn</h1>
            <p className="mt-1 font-body text-[1rem] text-[color:var(--dz-text)]/85">Mỗi ngày một dấu chân, mỗi dấu chân một kỷ niệm.</p>
          </div>
          <div className="flex shrink-0 gap-2 pt-1">
            {lockOn && (
              <button type="button" onClick={() => lockDiary({ quiet: true })} aria-label="Khoá nhật ký ngay" className="grid size-10 place-items-center rounded-full border border-[color:var(--dz-text)]/25 bg-[color:var(--dz-text)]/10 text-[color:var(--dz-text)] backdrop-blur active:scale-90" data-lock-now>
                <Lock size={17} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => setSettings(true)} aria-label="Cài đặt khoá nhật ký" className="grid size-10 place-items-center rounded-full border border-[color:var(--dz-text)]/25 bg-[color:var(--dz-text)]/10 text-[color:var(--dz-text)] backdrop-blur active:scale-90" data-lock-settings-open>
              <ShieldCheck size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        {!loaded ? (
          <Loading label="Đang mở nhật ký" className="flex flex-col gap-4">
            <Skeleton className="h-40 rounded-3xl bg-[color:var(--dz-text)]/15" />
            <Skeleton className="h-12 rounded-full bg-[color:var(--dz-text)]/10" />
            <Skeleton className="h-72 rounded-3xl bg-[color:var(--dz-text)]/10" />
          </Loading>
        ) : error ? (
          <p className="paper rounded-3xl p-5 font-body text-[1rem]" role="alert">
            {error}
          </p>
        ) : (
          <>
            {/* today */}
            <section className="paper flex items-center gap-3 rounded-[2rem] p-4" aria-label="Hôm nay" data-today>
              <div className="w-[5.5rem] shrink-0">
                <Pet mood={pet.mood} outfit={pet.outfit} size="100%" waving={pet.mood === 'happy' || pet.mood === 'excited'} label={`${pet.name}, bạn đồng hành`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.66rem] tracking-[0.12em] text-[color:var(--dz-text-3)] uppercase">{dayLabel(today)}</p>
                {todayEntry ? (
                  <button type="button" onClick={() => read(today)} className="mt-1 flex w-full items-start gap-2 text-left">
                    {todayEntry.mood && <MoodFace mood={todayEntry.mood} size={34} />}
                    <span className="min-w-0 flex-1 font-display text-[1.2rem] leading-snug text-[color:var(--dz-text)]">{excerptOf(bodyOf(todayEntry.text), 90) || moodWord(todayEntry.mood) || 'Một dấu chân không lời.'}</span>
                  </button>
                ) : (
                  <p className="mt-1 font-body text-[1rem] leading-snug text-[color:var(--dz-text)]">{encouragement({ written: false, streak: stats.streak, total: stats.total, hour: new Date().getHours() })}</p>
                )}
                <SoftButton className="mt-2.5 min-h-10 px-4 text-[0.88rem]" tone={todayEntry ? 'soft' : 'fill'} onClick={() => write(today)} data-write-today>
                  <PenLine size={15} aria-hidden="true" /> {todayEntry ? 'Viết thêm' : 'Viết nhật ký hôm nay'}
                </SoftButton>
              </div>
            </section>

            {/* numbers */}
            <div className="flex flex-wrap gap-2 px-1" aria-label="Hành trình đến giờ">
              {stats.total > 0 ? (
                <>
                  <Pill>Ngày thứ {stats.day}</Pill>
                  <Pill>{stats.streak > 0 ? `${stats.streak} ngày liền` : 'Chuỗi mới đang chờ'}</Pill>
                  <Pill>{stats.total} trang</Pill>
                </>
              ) : (
                <Pill>Trang đầu tiên đang chờ bạn</Pill>
              )}
            </div>

            {/* the week */}
            {stats.total > 0 && (
              <section className="rounded-3xl bg-[color:var(--dz-text)]/12 p-3.5 backdrop-blur" aria-label="Tâm trạng 7 ngày gần đây" data-week>
                <p className="mb-2 px-1 font-display text-[1.2rem] leading-none text-[color:var(--dz-text)]">7 ngày gần đây</p>
                <ol className="flex justify-between">
                  {week.map((d) => (
                    <li key={d.day} className="flex flex-col items-center gap-1">
                      <MoodFace mood={d.mood} size={34} />
                      <span className="font-mono text-[0.62rem] text-[color:var(--dz-text)]/75">{d.weekday}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* memories */}
            {remembered.length > 0 && (
              <section aria-label="Kỷ niệm" data-memories>
                <h2 className="mb-2 px-1 font-display text-[1.5rem] leading-none text-[color:var(--dz-text)]">Kỷ niệm</h2>
                <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                  {remembered.map(({ ago, label, entry: page }) => (
                    <li key={ago} className="w-60 shrink-0 snap-start">
                      <button type="button" onClick={() => read(page.day, label)} className="paper flex h-full w-full flex-col gap-1.5 rounded-3xl p-3.5 text-left transition-transform active:scale-[0.97]">
                        <span className="font-display text-[1.2rem] leading-none text-[color:var(--dz-amber)]">{label}</span>
                        <span className="font-mono text-[0.62rem] tracking-[0.08em] text-[color:var(--dz-text-3)] uppercase">{shortLabel(page.day)}</span>
                        <span className="flex items-start gap-2">
                          <span className="line-clamp-3 min-w-0 flex-1 font-body text-[0.9rem] leading-snug text-[color:var(--dz-text)]">{excerptOf(bodyOf(page.text), 110) || moodWord(page.mood) || 'Một dấu chân không lời.'}</span>
                          {page.photos?.[0] && <Thumb id={page.photos[0]} size={52} />}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* the road */}
            <section aria-label="Hành trình" className="pt-1">
              <h2 className="mb-3 flex items-center gap-2 px-1 font-display text-[1.5rem] leading-none text-[color:var(--dz-text)]">
                <Footprints size={22} aria-hidden="true" /> Con đường
              </h2>
              <Journey days={days} marks={marks} pet={pet} todayKey={today} onOpen={(day) => read(day)} onWrite={write} />
              {more ? (
                <div className="mt-4 flex justify-center">
                  <SoftButton tone="glass" onClick={() => setShown((count) => count + PAGE)}>
                    Đi ngược về những ngày trước
                  </SoftButton>
                </div>
              ) : (
                stats.first && (
                  <p className="mt-4 text-center font-display text-[1.3rem] text-[color:var(--dz-text)]" data-start>
                    Khởi hành từ {dayLabel(stats.first).toLowerCase()}
                  </p>
                )
              )}
            </section>
          </>
        )}
      </div>

      {settings && <LockSettings onClose={() => setSettings(false)} onNotify={onNotify} />}
      {sheet?.mode === 'write' && <Writer key={`w-${sheet.day}`} day={sheet.day} entry={entry} onClose={() => setSheet(null)} onNotify={onNotify} />}
      {sheet?.mode === 'read' && entry && <EntrySheet key={`r-${sheet.day}`} entry={entry} label={sheet.label} onClose={() => setSheet(null)} onEdit={() => write(sheet.day)} />}
    </div>
  );
}
