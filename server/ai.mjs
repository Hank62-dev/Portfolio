import { HttpError } from './http.mjs';

const HUGGING_FACE = 'https://router.huggingface.co/hf-inference/models';
const MAX_TRACKS = 300;

const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const today = (now) => new Date(now()).toISOString().slice(0, 10);

/** Reads text out of a Gemini response (the parts of its first candidate). */
const textOf = (data) =>
  (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

/**
 * The owner's AI helpers: pick music for a mood, write a short morning note, and make pictures. All of them
 * spend from one daily budget (so a free quota is never burned by accident) and none of them ever returns a
 * key or an upstream error body to the browser.
 */
export const createAi = ({ ai, fetchImpl = fetch, now = Date.now }) => {
  let day = today(now);
  let used = 0;

  const imageProvider = ai.hfToken ? 'huggingface' : ai.geminiKey ? 'gemini' : null;

  const roll = () => {
    if (day !== today(now)) {
      day = today(now);
      used = 0;
    }
  };

  const usage = () => {
    roll();
    return { used, limit: ai.dailyLimit, text: Boolean(ai.geminiKey), image: imageProvider };
  };

  const spend = () => {
    roll();
    if (used >= ai.dailyLimit) throw new HttpError(429, 'The daily AI budget is used up. It resets at midnight UTC.');
    used += 1;
  };

  const fail = (response, what) => {
    if (response.status === 429) throw new HttpError(429, `${what} quota reached for now. Try again later.`);
    if (response.status === 401 || response.status === 403) throw new HttpError(502, `${what} rejected the server's key.`);
    throw new HttpError(502, `${what} is unavailable right now.`);
  };

  const gemini = async (model, body) => {
    if (!ai.geminiKey) throw new HttpError(503, 'AI is not configured: set GEMINI_API_KEY on the server.');
    spend();
    let response;
    try {
      response = await fetchImpl(`${ai.geminiBase}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.geminiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });
    } catch {
      throw new HttpError(502, 'Gemini is unreachable right now.');
    }
    if (!response.ok) fail(response, 'Gemini');
    return response.json();
  };

  /** Chooses up to `limit` tracks from the owner's own library that fit a mood. Only titles go to the model. */
  const dj = async ({ mood, tracks, limit = 15 }) => {
    const wish = clip(mood, 200);
    if (!wish) throw new HttpError(400, 'Describe a mood or what you are working on.');
    if (!Array.isArray(tracks) || tracks.length === 0) throw new HttpError(400, 'The library is empty.');
    const list = tracks.slice(0, MAX_TRACKS).map((t) => ({
      id: clip(t.id, 60),
      title: clip(t.title, 80),
      artist: clip(t.artist, 60),
      genre: clip(t.genre, 30),
    }));
    const known = new Set(list.map((t) => t.id));

    const prompt = [
      'You are a thoughtful DJ choosing from ONE person\'s private music library. Pick only from the list.',
      `Request: "${wish}"`,
      `Choose up to ${limit} tracks that fit, in a good listening order.`,
      'Reply as JSON: {"ids": ["<track id>", ...], "note": "<one short sentence about the mix, in the language of the request>"}',
      `Library: ${JSON.stringify(list)}`,
    ].join('\n');

    const data = await gemini(ai.textModel, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
    });
    let parsed;
    try {
      parsed = JSON.parse(textOf(data));
    } catch {
      throw new HttpError(502, 'The DJ could not decide. Try again.');
    }
    const ids = [...new Set((Array.isArray(parsed.ids) ? parsed.ids : []).map(String))].filter((id) => known.has(id)).slice(0, limit);
    return { ids, note: clip(parsed.note, 240) };
  };

  /** A two or three sentence morning note from facts the browser already has. */
  const note = async ({ context, language }) => {
    const facts = clip(JSON.stringify(context ?? {}), 1500);
    const tongue = language === 'vi' ? 'Vietnamese' : 'English';
    const data = await gemini(ai.textModel, {
      contents: [
        {
          parts: [
            {
              text: `Write a warm, concrete morning briefing of at most three short sentences, in ${tongue}, for the owner of a personal workspace. Use only these facts and invent nothing: ${facts}`,
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.6 },
    });
    const text = textOf(data);
    if (!text) throw new HttpError(502, 'No note came back. Try again.');
    return { text: clip(text, 600) };
  };

  /** One picture. Returns { mime, data (base64) }. */
  const image = async ({ prompt }) => {
    const wish = clip(prompt, 900);
    if (wish.length < 3) throw new HttpError(400, 'Describe the picture you want.');
    if (!imageProvider) {
      throw new HttpError(503, 'No image provider is configured: set HF_TOKEN (free) or GEMINI_API_KEY on the server.');
    }

    if (imageProvider === 'huggingface') {
      spend();
      let response;
      try {
        response = await fetchImpl(`${HUGGING_FACE}/${ai.hfImageModel}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.hfToken}` },
          body: JSON.stringify({ inputs: wish }),
          signal: AbortSignal.timeout(90000),
        });
      } catch {
        throw new HttpError(502, 'The image service is unreachable right now.');
      }
      if (!response.ok) fail(response, 'The image service');
      const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
      if (!mime.startsWith('image/')) throw new HttpError(502, 'The image service returned something unexpected.');
      return { mime, data: Buffer.from(await response.arrayBuffer()).toString('base64') };
    }

    const result = await gemini(ai.imageModel, {
      contents: [{ parts: [{ text: wish }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    const part = (result?.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData?.data);
    if (!part) throw new HttpError(502, 'No picture came back. Try a different description.');
    return { mime: part.inlineData.mimeType || 'image/png', data: part.inlineData.data };
  };

  return { usage, dj, note, image };
};
