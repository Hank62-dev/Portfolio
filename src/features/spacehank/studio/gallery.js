import { storage } from '../storage';

// Generated pictures and saved prompts, kept on this device next to the music library.

const newest = (a, b) => b.createdAt - a.createdAt;

export const listImages = async () => (await storage.images.all()).sort(newest);

export const saveImage = async ({ prompt, blob, sample = false }) => {
  const now = Date.now();
  const record = { id: crypto.randomUUID(), prompt, blob, mime: blob.type, createdAt: now, updatedAt: now, favorite: false, sample };
  await storage.images.put(record);
  return record;
};

export const setImageFavorite = async (record, favorite) => {
  const next = { ...record, favorite, updatedAt: Date.now() };
  await storage.images.put(next);
  return next;
};

export const removeImage = (id) => storage.images.remove(id);

export const listPrompts = async () => (await storage.prompts.all()).sort(newest);

export const savePrompt = async (text) => {
  const now = Date.now();
  const record = { id: crypto.randomUUID(), text: text.trim().slice(0, 900), createdAt: now, updatedAt: now };
  await storage.prompts.put(record);
  return record;
};

export const removePrompt = (id) => storage.prompts.remove(id);

export const STYLES = [
  { id: 'editorial', label: 'Editorial', words: 'editorial illustration, restrained composition, fine linework' },
  { id: 'render', label: '3D render', words: 'soft studio 3D render, matte materials, shallow depth of field' },
  { id: 'photo', label: 'Photo', words: 'cinematic photograph, natural light, 35mm, subtle grain' },
  { id: 'icon', label: 'Icon', words: 'flat vector icon, bold geometry, centered on a plain background' },
  { id: 'abstract', label: 'Abstract', words: 'abstract generative art, layered shapes, smooth gradients' },
];

export const SHAPES = [
  { id: 'square', label: 'Square', words: 'square composition' },
  { id: 'wide', label: 'Wide 16:9', words: 'wide 16:9 composition' },
  { id: 'tall', label: 'Tall 9:16', words: 'tall 9:16 vertical composition' },
];

/** The full prompt sent to the model: what you typed, then the chosen look and shape, then the brand direction. */
export const composePrompt = ({ text, style, shape, brand, brandText }) =>
  [text.trim(), STYLES.find((s) => s.id === style)?.words, SHAPES.find((s) => s.id === shape)?.words, brand ? brandText : '']
    .filter(Boolean)
    .join('. ');
