import { entryOf, bodyOf } from '../diary/model';
import { addPhotoBlob, removePhoto } from '../diary/photos';
import { saveEntry } from '../diary/store';
import { tr } from '../../core/i18n/lang';
import { createNote, loadNotes, notesStore } from '../notes/library';
import { dayKey, textToHtml } from '../notes/notes';

// Sending a drawing somewhere: it is kept as a picture (a PNG in the photos store, like the pictures of a diary page) and the note
// or the diary page holds its id.

const MAX_DIARY_PICTURES = 4;

/** A new note with the drawing on it. Returns what to tell the person. */
export const sendToNote = async (png, name) => {
  const id = await addPhotoBlob(png);
  const body = `# ${name}`;
  await createNote(body, { html: textToHtml(body), photos: [id] });
  return tr('Saved to Second Brain');
};

/** The drawing as a picture on today's diary page (the page is made if there is none yet). */
export const sendToDiary = async (png) => {
  await loadNotes();
  const day = dayKey();
  const entry = entryOf(notesStore.get().notes, day);
  const photos = entry?.photos ?? [];
  if (photos.length >= MAX_DIARY_PICTURES) return tr("Today's page already has {0} pictures.", MAX_DIARY_PICTURES);
  const id = await addPhotoBlob(png);
  try {
    await saveEntry({ day, entry, mood: entry?.mood, body: entry ? bodyOf(entry.text) : '', photos: [...photos, id] });
  } catch (error) {
    await removePhoto(id).catch(() => {});
    throw error;
  }
  return tr("Added to today's diary");
};
