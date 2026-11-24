import { Spinner } from '../../components/ui/Loading';
import { prepareImage } from './prepareImage';
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import useResource from './useResource';
import { button, secondary } from './format';

const names = { farm_photo: 'Farm photograph', land_title: 'Title deed', lease: 'Lease agreement', authorization: 'Owner / family authorization', ownership_support: 'Supporting ownership evidence', inspection_photo: 'Visit photograph', inspection_report: 'Inspection report', product_image: 'Product photograph' };


export function FileCard({ asset, actions, reviewStage, onReviewed }) {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');
  const labels = { pending: 'Awaiting manual review', officer_accepted: 'Officer accepted · awaiting admin', accepted: 'Accepted by reviewers', changes_requested: 'Corrections requested', blocked: 'Unavailable · replace', ready: 'Ready for listing' };
  return <article className="min-w-0 space-y-3 rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h4 className="break-words text-sm font-semibold text-green-950">{asset.name}</h4><p className="mt-1 text-xs text-gray-500">{names[asset.purpose]} · {(asset.bytes / 1024 / 1024).toFixed(2)} MB</p></div><span className={`shrink-0 rounded px-2 py-1 text-xs ${['accepted', 'ready'].includes(asset.review_status) ? 'bg-green-50 text-green-900' : ['blocked', 'changes_requested'].includes(asset.review_status) ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-950'}`}>{labels[asset.review_status] || 'Uploaded'}</span></div>
    {asset.can_preview && <button type="button" disabled={busy} className="text-sm font-semibold text-green-800 underline" onClick={async () => { setBusy(true); setMessage(''); try { const response = await api.get(asset.access_path); setUrl(response.data.data.url); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>{busy ? <Spinner label="Preparing" /> : url ? 'Refresh secure access' : 'Preview / open file'}</button>}
    {url && <div className="space-y-2">{asset.format !== 'pdf' && <img src={url} className="max-h-64 w-full rounded-lg object-contain" alt={`${names[asset.purpose]}: ${asset.name}`} onError={() => setMessage('The temporary preview expired. Refresh secure access.')} />}<a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-green-800 underline">Open / download {asset.format.toUpperCase()} (link valid for two minutes)</a></div>}
    {['officer', 'admin'].map(stage => asset.reviews?.[stage] && <div key={stage} className="rounded-lg bg-gray-50 p-3 text-sm"><p className="font-semibold capitalize">{stage === 'admin' ? 'Administrator' : 'Assigned officer'}: {asset.reviews[stage].decision}</p><p className="mt-1 whitespace-pre-line text-gray-700">{asset.reviews[stage].note}</p></div>)}
    {reviewStage && asset.can_preview && <form className="space-y-3 rounded-xl border border-green-200 p-3" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(''); try { await api.post(`/media/${asset.asset_id}/reviews`, { stage: reviewStage, decision, note }); setDecision(''); setNote(''); setMessage('Manual review recorded.'); onReviewed?.(); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}><p className="text-sm font-semibold text-green-950">{reviewStage === 'admin' ? 'Administrator' : 'Officer'} file review</p><label className="block space-y-1 text-sm"><span>Decision for {asset.name}</span><select className="w-full rounded-xl border p-2" required value={decision} onChange={event => setDecision(event.target.value)}><option value="">Select…</option><option value="accepted">Accept evidence</option><option value="rejected">Reject / request replacement</option></select></label><label className="block space-y-1 text-sm"><span>Findings / specific correction</span><textarea className="w-full rounded-xl border p-2" required minLength={5} maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} /></label><button disabled={busy} className={button}>{busy ? <Spinner label="Saving" /> : 'Record file review'}</button></form>}
    {message && <p role="status" className="text-sm text-green-950">{message}</p>}{actions}
  </article>;
}

export default function Uploads({ purpose, verificationId, productId, onUploaded }) {
  const readiness = useResource('/media/availability');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const previews = useRef(new Set());
  useEffect(() => { const urls = previews.current; return () => urls.forEach(url => URL.revokeObjectURL(url)); }, []);
  const imagesOnly = ['farm_photo', 'inspection_photo', 'product_image'].includes(purpose);
  function choose(files) {
    const additions = [...files].map(file => { const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''; if (preview) previews.current.add(preview); return { id: crypto.randomUUID(), file, preview, progress: 0, state: 'selected', error: '' }; });
    setItems(previous => [...previous, ...additions]); setMessage('');
  }
  async function send() {
    setBusy(true); setMessage('');
    for (const item of items.filter(row => row.state !== 'uploaded')) {
      const update = changes => setItems(previous => previous.map(row => row.id === item.id ? { ...row, ...changes } : row));
      update({ state: 'uploading', error: '', progress: 0 });
      try {
        const file = await prepareImage(item.file);
        if (file.size > 10 * 1024 * 1024) throw new Error('PDF documents must be at most 10 MB.');
        const data = new FormData(); data.append('file', file); data.append('purpose', purpose);
        if (verificationId) data.append('verification_id', verificationId);
        if (productId) data.append('product_id', productId);
        const response = await api.post('/media', data, { timeout: 90000, onUploadProgress: event => update({ progress: event.total ? Math.round(event.loaded * 100 / event.total) : 0 }) });
        update({ state: 'uploaded', progress: 100 }); onUploaded?.(response.data.data);
      } catch (error) { update({ state: 'failed', error: error.message }); }
    }
    setBusy(false); setMessage('Uploaded files will appear below for manual review. Failed uploads can be retried.');
  }
  return <section className="space-y-4 rounded-2xl border border-dashed border-green-300 bg-green-50/40 p-4" aria-label={`Upload ${names[purpose]}`}><h4 className="font-semibold text-green-950">{names[purpose]}</h4><p className="text-xs leading-relaxed text-gray-600">{imagesOnly ? 'Clear photographs, up to 5 MB each after compression.' : 'JPEG, PNG, WebP or PDF. Images up to 5 MB; PDFs up to 10 MB. Photograph every page with all corners visible, readable text and no glare.'} Select files or take a photo. You can remove and retake a selected photograph before uploading.</p>
    {!readiness.data?.available && !readiness.loading && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{readiness.data?.message || readiness.error || 'Uploads are unavailable.'}</p>}
    <div className="flex flex-wrap gap-3"><label className={`${secondary} cursor-pointer`}>Choose {imagesOnly ? 'photos' : 'files'}<input className="sr-only" type="file" accept={imagesOnly ? 'image/*' : 'image/*,application/pdf'} multiple disabled={busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} /></label><label className={`${secondary} cursor-pointer`}>Take photo<input className="sr-only" type="file" accept="image/*" capture="environment" disabled={busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} /></label></div>
    <ol className="space-y-3">{items.map(item => <li key={item.id} className="flex flex-wrap items-start gap-3 rounded-xl border bg-white p-3">{item.preview && <img src={item.preview} alt={`Selected ${item.file.name}`} className="h-20 w-20 rounded object-cover" />}<div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{item.file.name}</p><p className="mt-1 text-xs text-gray-500">{item.state === 'uploaded' ? 'Uploaded · ready to include for review' : item.state === 'uploading' ? `${item.progress}% transferred · waiting for storage confirmation` : item.state === 'failed' ? 'Upload failed · retry below' : 'Selected · not uploaded yet'}</p>{item.state === 'uploading' && <progress aria-label={`Uploading ${item.file.name}`} className="mt-2 w-full accent-green-800" value={item.progress} max="100" />}{item.error && <p role="alert" className="mt-1 text-xs text-red-800">{item.error}</p>}</div>{item.state !== 'uploaded' && <button type="button" className="text-sm text-red-800 underline" disabled={busy} onClick={() => { if (item.preview) { URL.revokeObjectURL(item.preview); previews.current.delete(item.preview); } setItems(previous => previous.filter(row => row.id !== item.id)); }}>Remove / retake</button>}</li>)}</ol>
    {items.some(item => item.state !== 'uploaded') && <button type="button" className={button} disabled={busy || !readiness.data?.available} onClick={send}>{busy ? <Spinner label="Uploading" /> : 'Upload selected / retry failed'}</button>}{message && <p role="status" className="text-sm text-green-900">{message}</p>}
  </section>;
}
