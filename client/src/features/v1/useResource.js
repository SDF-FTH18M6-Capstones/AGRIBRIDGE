import { useCallback, useEffect, useState } from 'react';
import { resources } from '../../services/resources';

export default function useResource(path, poll = false) {
  const [state, setState] = useState({ path, data: null, loading: true, refreshing: false, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    let loading = false;
    let lastLoaded = 0;
    async function load(force = false) {
      if (loading) return;
      loading = true;
      setState(previous => ({ ...previous, refreshing: true }));
      try {
        const response = await resources.load(path, { force });
        if (active) { lastLoaded = Date.now(); setState({ path, data: response.data.data, loading: false, refreshing: false, error: '' }); }
      } catch (error) {
        if (active) setState(previous => ({ ...previous, path, data: previous.path === path ? previous.data : null, loading: false, refreshing: false, error: error.message }));
      } finally { loading = false; }
    }
    load(version > 0);
    const refresh = () => { if (document.visibilityState === 'visible' && Date.now() - lastLoaded >= 15000) load(); };
    const timer = poll ? setInterval(refresh, 30000) : null;
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [path, version, poll]);
  return { ...(state.path === path ? state : { data: null, loading: true, refreshing: true, error: '' }), reload };
}
