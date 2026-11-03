import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A layer above the screen that takes a history entry of its own: the phone's Back button closes the layer and leaves
 * the screen underneath as it was. Layers can stack (a page, then the player over it).
 */
export function useHistoryLayer(open, close) {
  const navigate = useNavigate();
  const location = useLocation();
  const key = useRef(`layer-${Math.random().toString(36).slice(2)}`);
  const pushed = useRef(false);
  const armed = useRef(false);

  useEffect(() => {
    if (open && !pushed.current) {
      pushed.current = true;
      navigate(`${location.pathname}${location.search}`, { state: { layers: [...(location.state?.layers ?? []), key.current] } });
    }
    if (!open) pushed.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the layer opens or closes
  }, [open]);

  useEffect(() => {
    if (location.state?.layers?.includes(key.current)) armed.current = true;
    else if (armed.current && open) {
      armed.current = false;
      close();
    }
  }, [open, location]); // eslint-disable-line react-hooks/exhaustive-deps -- `close` is only a setter

  return () => (armed.current ? navigate(-1) : close());
}
