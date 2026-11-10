import { useCallback, useEffect, useState } from 'react';

const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window);

/**
 * Installing the workspace as an app. Chrome and Edge hand over an install prompt; iOS has none, so the person is
 * told where the button is instead. `installed` is true once it runs as an app.
 */
export function useInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (event) => {
      event.preventDefault(); // keep it for our own button
      setPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  /** Shows the browser's install dialog. Returns true if the person accepted. */
  const install = useCallback(async () => {
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    return outcome === 'accepted';
  }, [prompt]);

  return { canInstall: Boolean(prompt) && !installed, ios: isIos() && !installed, installed, install };
}
