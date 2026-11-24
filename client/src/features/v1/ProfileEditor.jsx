import { Spinner } from '../../components/ui/Loading';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import LocationFields from './LocationFields';
import { button, input } from './format';

export default function ProfileEditor({ kind, profile, onSaved }) {
  const { user, updateUser } = useAuth();
  const key = `agribridge_profile_draft_${user.user_id}_${kind}`;
  const [value, setValue] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) || profile || {}; } catch { return profile || {}; } });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const farmer = kind === 'farmer';
  const update = changes => setValue(previous => ({ ...previous, ...changes }));
  useEffect(() => { sessionStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return <form className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6" onSubmit={async event => { event.preventDefault(); setBusy(true); setMessage(''); try {
    const fields = farmer ? ['farm_name', 'description', 'county_code', 'subcounty_code', 'ward_code', 'town', 'directions', 'landmark', 'latitude', 'longitude', 'land_tenure'] : ['buyer_type', 'business_name', 'county_code', 'subcounty_code', 'town'];
    const values = Object.fromEntries(fields.filter(field => value[field] !== undefined && value[field] !== '').map(field => [field, value[field]]));
    const response = await api.put('/profiles/me', { ...values, location: value.town || value.location || 'Farm details', profile_type: kind });
    updateUser(response.data.user); sessionStorage.removeItem(key); setMessage(farmer ? 'Farm details saved. Complete your pin and land evidence before submitting for verification.' : 'Buyer details saved. Purchasing is enabled.'); onSaved(kind);
  } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}>
    {profile?.location && !profile.county_code && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Your existing location is preserved: {profile.location}. Please select its county and subcounty; we have not guessed them.</p>}
    {farmer ? <><label className="block space-y-2 text-sm"><span>Farm name</span><input className={input} required minLength={2} maxLength={150} value={value.farm_name || ''} onChange={event => update({ farm_name: event.target.value })} /></label><label className="block space-y-2 text-sm"><span>About your farm (optional)</span><textarea className={input} maxLength={2000} value={value.description || ''} onChange={event => update({ description: event.target.value })} /></label></> : <><label className="block space-y-2 text-sm"><span>I buy as</span><select className={input} required value={value.buyer_type || ''} onChange={event => update({ buyer_type: event.target.value })}><option value="">Select…</option>{['individual', 'retailer', 'wholesaler', 'restaurant'].map(type => <option key={type} value={type}>{type}</option>)}</select></label><label className="block space-y-2 text-sm"><span>Business name (optional)</span><input className={input} maxLength={150} value={value.business_name || ''} onChange={event => update({ business_name: event.target.value })} /></label></>}
    <LocationFields value={value} onChange={update} farmer={farmer} required={!farmer} />
    {farmer && <label className="block space-y-2 text-sm"><span>Your relationship to the farm</span><select className={input} value={value.land_tenure || ''} onChange={event => update({ land_tenure: event.target.value })}><option value="">Choose before verification…</option><option value="owner">I own the land</option><option value="lease">I lease the land</option><option value="family">I have permission to use family land</option></select></label>}
    <button className={button} disabled={busy}>{busy ? <Spinner label="Saving" /> : farmer ? 'Save farm details / draft' : profile ? 'Save buyer details' : 'Enable purchasing'}</button>{message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-950">{message}</p>}
  </form>;
}
