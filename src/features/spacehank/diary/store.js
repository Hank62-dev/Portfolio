import { createNote, deleteNote, updateNote } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { composeText } from './model';
import { removePhoto } from './photos';

// Saving a diary page. A page is a journal note, so it lives in the notes store and shows in Second Brain as well;
// its pictures are in the photos store and the note keeps their ids.

/** Creates the page for `day`, or updates it when `entry` is the page already there. Returns the note's id. */
export const saveEntry = async ({ day, entry, mood, body, photos = [] }) => {
  const text = composeText(day, body);
  const fields = { html: textToHtml(text), mood: mood ?? undefined, photos };
  if (entry) {
    await updateNote(entry.id, { text, ...fields });
    return entry.id;
  }
  return (await createNote(text, { day, ...fields })).id;
};

/** Removes a page and its pictures. */
export const removeEntry = async (entry) => {
  await Promise.all((entry.photos ?? []).map((id) => removePhoto(id).catch(() => {})));
  await deleteNote(entry.id);
};
