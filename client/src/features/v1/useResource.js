import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

export default function useResource(path, poll = false) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await api.get(path);
        if (active) setState({ data: response.data.data, loading: false, error: '' });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, loading: false, error: error.message }));
      }
    }
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    const timer = poll ? setInterval(refresh, 30000) : null;
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [path, version, poll]);
  return { ...state, reload };
}
