import { ContentSkeleton } from '../../components/ui/Loading';
import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import useResource from '../v1/useResource';
import PasswordChecklist from './PasswordChecklist';
import { strongPassword } from './passwordPolicy';
import { button, input, when } from '../v1/format';

export default function SessionsPanel() {
  const resource = useResource('/sessions', true);
  const { logout } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState({ current_password: '', new_password: '', confirm_password: '' });
  async function revoke(scope) {
    setBusy(true); setMessage('');
    try { await api.post('/sessions/revoke', { scope }); if (scope === 'all') logout(); else { resource.reload(); setMessage('Other sessions signed out. This tab remains signed in.'); } }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="space-y-6" aria-labelledby="session-security-title"><div><h2 id="session-security-title" className="text-xl font-bold text-green-950">Your sessions & security</h2><p className="mt-2 text-sm text-gray-600">Each tab signs in separately. Device descriptions are approximate; activity in another tab never extends this session.</p></div>
    {(message || resource.error) && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm">{message || resource.error}</p>}
    <div className="divide-y rounded-2xl border bg-white">{resource.loading && <ContentSkeleton label="Loading sessions" />}{resource.data?.filter(row => row.active).map(row => <article key={row.session_id} className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="min-w-0"><h3 className="font-semibold text-green-950">{row.current ? 'This tab' : 'Another session'} <span className="text-xs font-normal text-gray-500">{row.session_id.slice(0, 8)}</span></h3><p className="mt-1 max-w-xl break-words text-xs text-gray-500">{row.browser}</p><p className="mt-2 text-xs text-gray-600">Last activity {when(row.last_activity_at)} · inactivity limit {row.idle_minutes} minutes</p></div><button className="rounded-xl border px-3 py-2 text-sm text-red-800" disabled={busy} onClick={async () => { try { await api.delete(`/sessions/${row.session_id}`); if (row.current) logout(); else resource.reload(); } catch (error) { setMessage(error.message); } }}>Sign out {row.current ? 'this tab' : 'session'}</button></article>)}</div>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={busy} onClick={() => revoke('others')}>Log out other sessions</button><button className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-800" disabled={busy} onClick={() => revoke('all')}>Log out all sessions</button></div>
    <form className="space-y-4 rounded-2xl border bg-white p-5" onSubmit={async event => { event.preventDefault(); if (!strongPassword(values.new_password)) { setMessage('Meet every new-password requirement.'); return; } setBusy(true); try { await api.post('/change-password', values); logout(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}><h3 className="font-bold text-green-950">Change password</h3><p className="text-sm text-gray-600">Changing your password signs out every session. Your existing orders and cart are preserved.</p><div className="grid gap-4 sm:grid-cols-2">{[['current_password', 'Current password'], ['new_password', 'New password'], ['confirm_password', 'Confirm new password']].map(([name, label]) => <label key={name} className="space-y-2 text-sm"><span>{label}</span><input className={input} type="password" autoComplete={name === 'current_password' ? 'current-password' : 'new-password'} required value={values[name]} onChange={event => setValues(previous => ({ ...previous, [name]: event.target.value }))} /></label>)}</div><PasswordChecklist value={values.new_password} /><button className={button} disabled={busy}>Change password and sign out</button></form>
  </section>;
}
