// This channel contains session identifiers only, never authentication secrets.
// It is duplicate detection, not shared login/activity/logout synchronization.
export function claimTabOwnership({ storage, Channel, onCopied, delay = 250 }) {
  if (!Channel) { onCopied(); return { ready: Promise.resolve(), close() {} }; }
  const runtime = crypto.randomUUID();
  const born = Date.now();
  const channel = new Channel('agribridge-tab-ownership');
  const session = () => { try { return JSON.parse(storage.getItem('agribridge_session')); } catch { return null; } };
  channel.onmessage = ({ data }) => {
    const current = session();
    if (!current || data.sid !== current.session_id || data.runtime === runtime) return;
    if (data.kind === 'probe' && (born < data.born || born === data.born && runtime < data.runtime)) {
      channel.postMessage({ kind: 'owned', sid: current.session_id, target: data.runtime, runtime });
    }
    // Also act on late responses from background tabs; do not revoke the owner.
    if (data.kind === 'owned' && data.target === runtime) onCopied();
  };
  const current = session();
  if (current) channel.postMessage({ kind: 'probe', runtime, born, sid: current.session_id });
  const ready = new Promise(resolve => setTimeout(resolve, current ? delay : 0));
  return { ready, close: () => channel.close() };
}
