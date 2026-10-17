import { useCallback, useEffect, useState } from 'react';
import { getGithubSnapshot } from '../services/githubService';

/** status: 'loading' | 'ready' | 'error' */
export const useGithub = () => {
  const [state, setState] = useState({ status: 'loading', data: null });

  const load = useCallback((force = false) => {
    let canceled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    getGithubSnapshot({ force })
      .then((data) => !canceled && setState({ status: 'ready', data }))
      .catch(() => !canceled && setState({ status: 'error', data: null }));
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return { ...state, retry: () => load(true) };
};
