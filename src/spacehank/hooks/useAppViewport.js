import { useEffect } from 'react';

/** The viewport the workspace asks for: the width of the screen, and no zooming by pinch. */
export const APP_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

/**
 * While the workspace is on screen, the page cannot be zoomed with two fingers, as in a native app (the portfolio keeps its normal,
 * zoomable viewport: this puts it back on the way out). iOS Safari ignores the viewport hint, so its own pinch gesture is stopped too.
 */
export function useAppViewport() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const before = meta?.getAttribute('content');
    meta?.setAttribute('content', APP_VIEWPORT);
    const stop = (event) => event.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    return () => {
      if (meta && before) meta.setAttribute('content', before);
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
    };
  }, []);
}
