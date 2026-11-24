import { Spinner } from '../components/ui/Loading';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './auth-context';
import api from '../services/api';
import { clearSession, metadata, saveCredentials, tabId } from '../services/tabSession';

function stored() {
  try { return { token: sessionStorage.getItem('agribridge_auth_token'), user: JSON.parse(sessionStorage.getItem('agribridge_auth_user')) }; }
  catch { clearSession(); return { token: null, user: null }; }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(stored);
  const [checking, setChecking] = useState(Boolean(session.token));
  const [clock, setClock] = useState(() => Date.now());
  const [confirmation, setConfirmation] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef(null);
  useEffect(() => { if (confirmation && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal(); }, [confirmation]);
  const logout = useCallback(() => {
    const refresh = sessionStorage.getItem('agribridge_refresh_token');
    const tab = tabId();
    if (refresh) fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/sessions/end`, { method: 'POST', headers: { 'Content-Type':'application/json', 'X-Tab-ID': tab }, body:JSON.stringify({refresh_token:refresh}) }).catch(() => {});
    clearSession(); setSession({ token: null, user: null }); setChecking(false);
  }, []);
  const login = useCallback(data => {
    saveCredentials({ ...data, access_token: data.access_token || data.token });
    setSession(stored()); setChecking(false);
  }, []);
  const updateUser = useCallback(user => {
    const token = sessionStorage.getItem('agribridge_auth_token');
    if (!token || !user) return;
    try {
      const identity = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub;
      if (String(identity) !== String(user.user_id)) return;
    } catch { return; }
    sessionStorage.setItem('agribridge_auth_user', JSON.stringify(user));
    setSession(previous => ({ ...previous, user }));
  }, []);
  const refreshUser = useCallback(async () => {
    const response = await api.get('/profiles/me');
    updateUser(response.data.data);
    return response.data.data;
  }, [updateUser]);
  useEffect(() => {
    const updated = () => { setSession(stored()); setClock(Date.now()); };
    const unauthorized = () => { clearSession(); setSession({ token: null, user: null }); setChecking(false); };
    const reauthenticate = event => { setConfirmation(event.detail); setPassword(''); setError(''); };
    window.addEventListener('agribridge:session-updated', updated);
    window.addEventListener('agribridge:unauthorized', unauthorized);
    window.addEventListener('agribridge:reauthenticate', reauthenticate);
    return () => {
      window.removeEventListener('agribridge:session-updated', updated);
      window.removeEventListener('agribridge:unauthorized', unauthorized);
      window.removeEventListener('agribridge:reauthenticate', reauthenticate);
    };
  }, []);
  const hasSession = Boolean(session.token);
  const userId = session.user?.user_id;
  useEffect(() => {
    if (!hasSession) return;
    let active = true;
    let lastPing = 0;
    const touch = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastPing < 30000) return;
      lastPing = Date.now();
      try { const response = await api.post('/sessions/activity', {}); if (active) { saveCredentials({ session: response.data.data }); } }
      catch { /* API handles expired or revoked sessions. */ }
    };
    const interact = event => { if (event.isTrusted) touch(); };
    const inspect = async () => {
      setClock(Date.now());
      const meta = metadata();
      if (meta && Math.min(Date.parse(meta.expires_at), Date.parse(meta.idle_expires_at)) <= Date.now()) { logout(); return; }
      try { const response = await api.get('/sessions/current'); if (active) saveCredentials({ session: response.data.data }); }
      catch { /* API handles session renewal/revocation. */ }
    };
    api.get('/profiles/me').then(response => { if (active) updateUser(response.data.data); }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    const timer = setInterval(inspect, 15000);
    const profileTimer = setInterval(() => { if (document.visibilityState === 'visible') refreshUser().catch(() => {}); }, 30000);
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.addEventListener(event, interact, { passive: true });
    return () => { active = false; clearInterval(timer); clearInterval(profileTimer); for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) window.removeEventListener(event, interact); };
    // Renewal updates the token but does not restart activity timers or count as input.
  }, [userId, hasSession, logout, refreshUser, updateUser]);
  const value = useMemo(() => ({ ...session, checking, login, logout, updateUser, refreshUser, isAuthenticated: Boolean(session.token && session.user) }), [session, checking, login, logout, updateUser, refreshUser]);
  const meta = metadata();
  const left = meta ? Math.ceil((Math.min(Date.parse(meta.expires_at), Date.parse(meta.idle_expires_at)) - clock) / 1000) : Infinity;
  return <AuthContext.Provider value={value}>
    {children}
    {session.token && left > 0 && left <= 120 && <aside role="alert" className="fixed inset-x-4 bottom-4 z-[1100] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg"><p>This tab’s session ends in {left} seconds. Save your work.</p><button className="rounded-lg bg-green-900 px-4 py-2 font-semibold text-white" onClick={async () => { const response = await api.post('/sessions/activity', {}); saveCredentials({ session: response.data.data }); }}>Stay signed in</button></aside>}
    {confirmation && <dialog ref={dialogRef} aria-labelledby="confirm-password-title" className="fixed inset-0 z-[1200] m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 backdrop:bg-black/40" onCancel={event => { event.preventDefault(); confirmation.reject(new Error("Password confirmation cancelled.")); setConfirmation(null); setPassword(""); }}><form className="space-y-4 bg-white p-6" onSubmit={async event => { event.preventDefault(); setConfirming(true); try { await api.post('/sessions/reauthenticate', { password }); confirmation.resolve(); setConfirmation(null); setPassword(''); } catch (failure) { setError(failure.message); } finally { setConfirming(false); } }}><h2 id="confirm-password-title" className="text-xl font-bold text-green-950">Confirm it’s you</h2><p className="text-sm text-gray-600">Enter your password to authorize this sensitive action.</p><label className="block text-sm">Current password<input autoFocus autoComplete="current-password" className="mt-2 w-full rounded-xl border p-3" type="password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p role="alert" className="text-sm text-red-800">{error}</p>}<div className="flex gap-3"><button disabled={confirming} className="rounded-lg bg-green-900 px-4 py-2 text-white">{confirming ? <Spinner label="Checking" /> : 'Confirm'}</button><button type="button" className="rounded-xl border px-4 py-2" onClick={() => { confirmation.reject(new Error('Password confirmation cancelled.')); setConfirmation(null); setPassword(''); }}>Cancel</button></div></form></dialog>}
  </AuthContext.Provider>;
}
