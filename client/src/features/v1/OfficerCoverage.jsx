import { useState } from 'react';
import api from '../../services/api';
import useResource from './useResource';
import { button, input } from './format';
export default function OfficerCoverage({ officer, reload }) {
  const resource = useResource('/locations');
  const [county, setCounty] = useState('');
  const [sub, setSub] = useState('');
  const [message, setMessage] = useState('');
  const coverage = officer.coverage || [];
  async function save(rows) { try { await api.patch(`/admin/field-officers/${officer.field_officer_id}/coverage`, { coverage: rows }); reload(); setMessage('Coverage updated.'); } catch (error) { setMessage(error.message); } }
  return <section className="space-y-3 rounded-2xl border bg-white p-5"><h3 className="font-semibold text-green-950">{officer.full_name} · assigned coverage</h3><ul className="space-y-2 text-sm">{coverage.map((area, i) => <li key={`${area.county_code}-${area.subcounty_code || ''}`} className="flex flex-wrap justify-between gap-3"><span>{resource.data?.counties.find(row => row.code === area.county_code)?.name || area.county_code} · {area.subcounty_code ? resource.data?.subcounties.find(row => row.code === area.subcounty_code)?.name || area.subcounty_code : 'Whole county'}</span><button className="text-red-800 underline" onClick={() => save(coverage.filter((_, index) => i !== index))}>Remove area</button></li>)}</ul><div className="flex flex-wrap gap-3"><select className={`${input} sm:max-w-52`} aria-label={`Coverage county for ${officer.full_name}`} value={county} onChange={event => { setCounty(event.target.value); setSub(''); }}><option value="">Choose county…</option>{resource.data?.counties.map(row => <option key={row.code} value={row.code}>{row.name}</option>)}</select><select className={`${input} sm:max-w-52`} aria-label={`Coverage subcounty for ${officer.full_name}`} value={sub} onChange={event => setSub(event.target.value)}><option value="">Whole county</option>{resource.data?.subcounties.filter(row => row.county_code === county).map(row => <option key={row.code} value={row.code}>{row.name}</option>)}</select><button className={button} disabled={!county || coverage.some(row => row.county_code === county && (row.subcounty_code || '') === sub)} onClick={() => save([...coverage, { county_code: county, ...(sub ? { subcounty_code: sub } : {}) }])}>Add coverage</button></div>{message && <p role="status" className="text-sm">{message}</p>}</section>;
}
