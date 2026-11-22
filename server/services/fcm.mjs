import { createSign } from 'node:crypto';

// Firebase Cloud Messaging: how the server reaches the Android app with the app closed (Web Push does not reach a WebView).
// It talks to the FCM HTTP v1 API directly, so it needs no Firebase library: a service account (a JSON key made in the
// Firebase console, kept in the FCM_SERVICE_ACCOUNT setting) signs a short token, Google swaps it for an access token that
// lasts an hour, and each message is one POST. Without the setting it is simply off.

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const base64url = (value) => Buffer.from(value).toString('base64url');

/** The service account from the setting: the JSON itself, or the JSON in base64. Null when absent or unusable. */
export const parseServiceAccount = (raw) => {
  if (!raw) return null;
  const tryParse = (text) => {
    try {
      const account = JSON.parse(text);
      return account?.client_email && account?.private_key && account?.project_id ? account : null;
    } catch {
      return null;
    }
  };
  return tryParse(raw) ?? tryParse(Buffer.from(raw, 'base64').toString('utf8'));
};

/** The message FCM is asked to deliver: shown by Android itself, with what the app needs when it is tapped. */
export const fcmMessage = (token, notification) => ({
  message: {
    token,
    notification: { title: String(notification.title ?? '').slice(0, 200), body: String(notification.body ?? '').slice(0, 500) },
    // data values must be strings
    data: Object.fromEntries(
      Object.entries({ tab: notification.tab, kind: notification.kind, key: notification.key, tone: notification.tone })
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([name, value]) => [name, String(value)])
    ),
    android: {
      priority: 'high',
      ttl: '3600s',
      // the same occasion sent again replaces the one already showing
      notification: { channel_id: 'reminders', icon: 'ic_stat_hank62', color: '#0b0c0e', ...(notification.key ? { tag: String(notification.key).slice(0, 100) } : {}) },
    },
  },
});

export const createFcm = ({ account, fetchImpl = fetch, now = Date.now } = {}) => {
  const enabled = Boolean(account);
  let access = null; // { token, until }

  const accessToken = async () => {
    if (access && now() < access.until) return access.token;
    const issued = Math.floor(now() / 1000);
    const head = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: issued, exp: issued + 3600 }));
    const signature = createSign('RSA-SHA256').update(`${head}.${claims}`).sign(account.private_key, 'base64url');
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${signature}` }),
    });
    if (!response.ok) throw Object.assign(new Error(`FCM sign-in failed (${response.status})`), { statusCode: response.status });
    const body = await response.json();
    access = { token: body.access_token, until: now() + (Number(body.expires_in) || 3600) * 1000 - 60 * 1000 };
    return access.token;
  };

  /**
   * Sends one notification to one app install. A token FCM no longer knows (the app was removed or its data cleared)
   * throws with statusCode 404, like a Web Push endpoint that is gone, so the caller forgets it the same way.
   */
  const send = async (token, notification) => {
    if (!enabled) throw new Error('FCM is not set up');
    const response = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify(fcmMessage(token, notification)),
    });
    if (response.ok) return;
    const detail = await response.json().catch(() => ({}));
    const code = detail?.error?.details?.find((d) => d.errorCode)?.errorCode ?? detail?.error?.status;
    // only a token FCM says is gone counts: a 400 can also be a message it did not like, and that is no reason to drop the phone
    const gone = response.status === 404 || code === 'UNREGISTERED';
    if (response.status === 401) access = null; // the access token was refused: get a new one next time
    throw Object.assign(new Error(`FCM refused the message (${response.status} ${code ?? ''})`), { statusCode: gone ? 404 : response.status });
  };

  return { enabled, send };
};
