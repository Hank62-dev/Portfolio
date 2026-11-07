import { tr } from '../lang';

const MAX_SIDE = 1280;

/**
 * A photo made small enough to send: at most 1280 pixels on its longer side, as a JPEG. A receipt is only text, so this is
 * plenty to read it and keeps the upload to a few hundred KB. Resolves { image (base64, no prefix), mime }.
 */
export const shrinkPhoto = async (file) => {
  if (!file?.type?.startsWith('image/')) throw new Error(tr('That is not a picture.'));
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(tr('That picture could not be opened.'));
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const url = canvas.toDataURL('image/jpeg', 0.82);
  return { image: url.slice(url.indexOf(',') + 1), mime: 'image/jpeg' };
};
