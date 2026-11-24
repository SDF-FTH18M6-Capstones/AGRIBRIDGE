import { Spinner } from '../../components/ui/Loading';
import { useState } from 'react';
import api from '../../services/api';
import useResource from './useResource';
import Uploads, { FileCard } from './Uploads';
import { FarmPin } from './LocationFields';
import { Panel, Status } from './UI';
import { button, when } from './format';

export default function FarmVerification({ farmer, refresh }) {
  const resource = useResource('/farmer-verifications/me', true);
  const media = useResource('/media', true);
  const [selection, setSelection] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = resource.data?.some(row => ['pending', 'assigned', 'submitted'].includes(row.status));
  const purposes = ['farm_photo', ...({ owner: ['land_title'], lease: ['lease', 'ownership_support'], family: ['authorization', 'ownership_support'] }[farmer.land_tenure] || [])];
  const drafts = (media.data || []).filter(row => !row.verification_id && purposes.includes(row.purpose));
  const ids = (selection || drafts.map(row => row.asset_id)).filter(id => drafts.some(row => row.asset_id === id));
  const orderedDrafts = [...drafts].sort((a, b) => (ids.includes(a.asset_id) ? ids.indexOf(a.asset_id) : ids.length) - (ids.includes(b.asset_id) ? ids.indexOf(b.asset_id) : ids.length));
  return <Panel title="Farm verification evidence" resource={resource} description="Your farm images and land documents are private. Upload your evidence and submit it for manual review and an officer visit.">
    {resource.data?.map(row => <article key={row.verification_id} className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-bold">Application #{row.verification_id}</h3><Status value={row.status} /></div><p className="text-xs text-gray-500">Submitted {when(row.created_at)}</p><p className="text-sm">{row.farm_location}</p>{row.remarks && <p className="rounded-lg bg-green-50 p-3 text-sm"><strong>Review feedback:</strong> {row.remarks}</p>}{row.officer_remarks && <p className="text-sm"><strong>Officer report:</strong> {row.officer_remarks}</p>}{row.location_snapshot && <FarmPin value={row.location_snapshot} readOnly />}<div className="grid gap-3 md:grid-cols-2">{row.documents?.map(asset => <FileCard key={asset.asset_id} asset={asset} />)}</div></article>)}
    {!active && farmer.verification_status !== 'approved' && <div className="space-y-5"><div className="rounded-xl bg-green-950 p-5 text-white"><h3 className="font-bold">Before you submit</h3><p className="mt-2 text-sm text-green-100">Save your county, subcounty, ward, map pin, directions, landmark and land arrangement above. Select 3–5 farm photographs plus {farmer.land_tenure === 'lease' ? 'your lease and supporting ownership evidence' : farmer.land_tenure === 'family' ? 'owner/family authorization and supporting ownership evidence' : 'your title deed'}. Documents can be a PDF or ordered photographs.</p></div>
      {!farmer.land_tenure && <p role="status" className="text-sm text-amber-900">Select and save your land arrangement in the farm details first.</p>}
      {purposes.map(purpose => <Uploads key={purpose} purpose={purpose} onUploaded={asset => { setSelection(previous => previous ? [...previous, asset.asset_id] : null); media.reload(); }} />)}
      <h3 className="font-semibold text-green-950">Choose evidence and arrange document pages</h3><div className="space-y-3">{orderedDrafts.map(asset => <FileCard key={asset.asset_id} asset={asset} actions={<div className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={ids.includes(asset.asset_id)} onChange={event => setSelection(event.target.checked ? [...ids, asset.asset_id] : ids.filter(id => id !== asset.asset_id))} />Include in submission{ids.includes(asset.asset_id) ? ` · position ${ids.indexOf(asset.asset_id) + 1}` : ''}</label><button type="button" disabled={ids.indexOf(asset.asset_id) <= 0} className="underline disabled:opacity-40" onClick={() => { const order = [...ids]; const at = order.indexOf(asset.asset_id); [order[at - 1], order[at]] = [order[at], order[at - 1]]; setSelection(order); }}>Move earlier</button><button type="button" disabled={!ids.includes(asset.asset_id) || ids.indexOf(asset.asset_id) === ids.length - 1} className="underline disabled:opacity-40" onClick={() => { const order = [...ids]; const at = order.indexOf(asset.asset_id); [order[at + 1], order[at]] = [order[at], order[at + 1]]; setSelection(order); }}>Move later</button><button type="button" className="text-red-800 underline" onClick={async () => { try { await api.delete(`/media/${asset.asset_id}`); setSelection(ids.filter(id => id !== asset.asset_id)); media.reload(); } catch (error) { setMessage(error.message); } }}>Remove draft</button></div>} />)}</div>
      <button className={button} disabled={busy || !farmer.land_tenure || ids.length < 4 || ids.some(id => !drafts.find(row => row.asset_id === id)?.can_preview)} onClick={async () => { setBusy(true); setMessage(''); try { await api.post('/farmer-verifications', { farm_location: farmer.location, asset_ids: ids }); setSelection(null); resource.reload(); media.reload(); refresh(); setMessage('Application submitted. Your location and selected evidence have been preserved for review.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>{busy ? <Spinner label="Submitting" /> : 'Submit complete application'}</button>
    </div>}{active && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">Your application is in progress. Submitted evidence stays unchanged during review. You can continue browsing or buying while you wait.</p>}{message && <p role="status" className="rounded-lg bg-green-50 p-4 text-sm">{message}</p>}
  </Panel>;
}
