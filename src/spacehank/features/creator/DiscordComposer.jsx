import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Select, Textarea, pushToast } from '../../../shared/ui';
import { discordChannels, postToDiscord } from '../../core/api/owner';
import { Label } from './ui';
import { tr } from '../../core/i18n/lang';

const MAX = 1900;

/**
 * Posts a message to the owner's own Discord server through a webhook kept on the server. Nothing can ping anyone (mentions are
 * switched off), it is one message at a time, and the server holds an hourly cap.
 */
export default function DiscordComposer({ initial = '', onSent }) {
  const [text, setText] = useState(initial);
  const [info, setInfo] = useState(null); // { configured, channels, left } | { error }
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    discordChannels()
      .then((data) => {
        if (!live) return;
        setInfo(data);
        setChannel((current) => current || data.channels[0] || '');
      })
      .catch((problem) => live && setInfo({ error: problem.message }));
    return () => {
      live = false;
    };
  }, []);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await postToDiscord({ channel, content: text });
      pushToast(tr('Posted to Discord (#{0}). {1} posts left this hour.', channel, result.left), { tone: 'success' });
      onSent?.();
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <p className="text-fine text-bone-faint">{tr('Checking Discord…')}</p>;
  if (info.error) return <p className="text-fine text-danger">{info.error}</p>;
  if (!info.configured)
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-4 text-fine leading-relaxed text-bone-dim" data-discord-setup>
        <b className="text-bone">{tr('Discord is not connected yet.')}</b> {tr('In your server: Server Settings, Integrations, Webhooks, New Webhook, copy its URL. In Render, add it to the realtime service as')} <code className="font-mono text-[0.78rem]">{tr('DISCORD_WEBHOOK_URL')}</code> {tr('(or several channels as')} <code className="font-mono text-[0.78rem]">{tr('DISCORD_WEBHOOKS')}</code>{tr(', a JSON object of name to URL). The address stays on the server and never reaches this page.')}
      </div>
    );

  return (
    <div className="flex flex-col gap-3" data-discord-composer>
      <div className="flex flex-wrap items-center gap-2">
        <Label>{tr('Post to')}</Label>
        <Select aria-label={tr('Channel')} value={channel} onChange={(e) => setChannel(e.target.value)} compact wrapperClassName="w-44">
          {info.channels.map((name) => (
            <option key={name} value={name}>
              #{name}
            </option>
          ))}
        </Select>
        <span className="font-mono text-[0.68rem] text-bone-faint">{info.left} {tr('of')} {info.perHour} {tr('posts left this hour')}</span>
      </div>
      <Textarea aria-label={tr('Message')} rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('Write the announcement…')} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={text.length > MAX ? 'font-mono text-[0.72rem] text-danger' : 'font-mono text-[0.72rem] text-bone-faint'}>
          {text.length} / {MAX}
        </span>
        <Button onClick={send} loading={busy} disabled={!text.trim() || text.length > MAX || !channel} data-send-discord>
          <Send size={14} aria-hidden="true" /> {tr('Post to Discord')}
        </Button>
      </div>
      {error && (
        <p className="text-fine text-danger" role="alert">
          {error}
        </p>
      )}
      <p className="text-[0.76rem] leading-relaxed text-bone-faint">{tr('It posts to your own server, one message, with mentions switched off. Read it through first: a post cannot be taken back from here.')}</p>
    </div>
  );
}
