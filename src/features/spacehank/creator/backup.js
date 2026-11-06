import { tr } from '../lang';
// A copy of the Creator Lab's data as one JSON file, so income records and deals are not trapped in one browser.

export const BACKUP_VERSION = 1;

/** The file's contents. `data` is { content, income, deals, settings }. Pure. */
export const buildBackup = (data, now = Date.now()) => JSON.stringify({ app: 'hank62-creator', version: BACKUP_VERSION, at: now, ...data }, null, 2);

const list = (value) => (Array.isArray(value) ? value.filter((x) => x && typeof x === 'object' && typeof x.id === 'string') : []);

/** What a backup file holds, or an error message. Anything that is not a backup of this app is refused. Pure. */
export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: tr('That file is not a backup (it is not valid JSON).') };
  }
  if (!data || data.app !== 'hank62-creator') return { error: tr('That file is not a Creator Lab backup.') };
  if (!Number.isFinite(data.version) || data.version > BACKUP_VERSION) return { error: tr('That backup was made by a newer version of the app.') };
  return {
    content: list(data.content),
    income: list(data.income).filter((e) => Number.isFinite(e.amount) && Number.isFinite(e.at)),
    deals: list(data.deals),
    settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
  };
};
