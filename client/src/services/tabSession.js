import { claimTabOwnership } from './tabOwnership.js';
// Authentication is tab-scoped. BroadcastChannel only detects copied sessions;
// it never shares tokens, signs other tabs out, or synchronizes their activity.
const TOKEN = 'agribridge_auth_token';
const USER = 'agribridge_auth_user';
const REFRESH = 'agribridge_refresh_token';
const META = 'agribridge_session';
const TAB = 'agribridge_tab_id';
const base = import.meta.env?.VITE_API_BASE_URL || '/api';
let startup;
let renewing;
let generation = 0;
export const tabId = () => {
  let id = sessionStorage.getItem(TAB);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(TAB, id); }
  return id;
};
export function metadata() { try { return JSON.parse(sessionStorage.getItem(META)); } catch { return null; } }
export function clearSession() {
  generation++;
  for (const key of [TOKEN, USER, REFRESH, META]) sessionStorage.removeItem(key);
}
export function saveCredentials(data) {
  const previous = metadata();
  if (data.session && previous && data.session.session_id !== previous.session_id) generation++;
  if (data.access_token) sessionStorage.setItem(TOKEN, data.access_token);
  if (data.refresh_token) sessionStorage.setItem(REFRESH, data.refresh_token);
  if (data.session) sessionStorage.setItem(META, JSON.stringify(data.session));
  if (data.user) sessionStorage.setItem(USER, JSON.stringify(data.user));
  window.dispatchEvent(new Event('agribridge:session-updated'));
}
export function prepareTab() {
  if (startup) return startup;
  const copied = () => {
    clearSession(); sessionStorage.removeItem(TAB); tabId();
    window.dispatchEvent(new Event('agribridge:unauthorized'));
  };
  const ownership = claimTabOwnership({ storage: sessionStorage, Channel: window.BroadcastChannel, onCopied: copied });
  startup = ownership.ready.then(() => {
    if (sessionStorage.getItem(TOKEN) && !metadata()) copied();
    tabId();
  });
  return startup;
}
export function tokenExpiresAt(token = sessionStorage.getItem(TOKEN)) {
  try { const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return payload.exp * 1000; }
  catch { return 0; }
}
export async function refreshSession() {
  if (renewing) return renewing;
  const refresh = sessionStorage.getItem(REFRESH);
  const startedGeneration = generation;
  if (!refresh) throw new Error('Please log in again.');
  renewing = (async () => {
    const response = await fetch(`${base}/sessions/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tab-ID': tabId() },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    const body = await response.json();
    if (!response.ok) {
      if (response.status === 401 && startedGeneration === generation && sessionStorage.getItem(REFRESH) === refresh) {
        clearSession(); window.dispatchEvent(new Event('agribridge:unauthorized'));
      }
      throw new Error(body.error?.message || 'Please log in again.');
    }
    if (startedGeneration !== generation || sessionStorage.getItem(REFRESH) !== refresh) throw new Error("This tab signed out while authentication was renewing.");
    saveCredentials(body.data);
    return body.data.access_token;
  })();
  try { return await renewing; }
  finally { renewing = null; }
}
export async function usableToken() {
  await prepareTab();
  const token = sessionStorage.getItem(TOKEN);
  if (token && tokenExpiresAt(token) < Date.now() + 30000) return refreshSession();
  return token;
}
