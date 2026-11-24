import { Spinner } from '../../components/ui/Loading';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useResource from './useResource';
import { button, input } from './format';

export function FarmPin({ value, onChange, readOnly = false }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const changed = useRef(onChange);
  const [message, setMessage] = useState('');
  useEffect(() => { changed.current = onChange; }, [onChange]);
  useEffect(() => {
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([-0.4, 37], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).on('tileerror', () => setMessage('Map tiles could not load. Use GPS or enter the farm coordinates manually; the saved pin remains available.')).addTo(map);
    mapRef.current = map;
    if (!readOnly) map.on('click', event => changed.current?.({ latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) }));
    const resize = new ResizeObserver(() => map.invalidateSize()); resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [readOnly]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value.latitude == null || value.longitude == null || value.latitude === '' || value.longitude === '') { if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; } return; }
    const position = [Number(value.latitude), Number(value.longitude)];
    if (!position.every(Number.isFinite)) return;
    if (markerRef.current) markerRef.current.setLatLng(position);
    else {
      const icon = L.divIcon({ className: '', html: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 39S1 23 1 15a14 14 0 1 1 28 0c0 8-14 24-14 24Z" fill="#166534" stroke="white" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="white"/></svg>', iconSize: [30, 40], iconAnchor: [15, 39] });
      markerRef.current = L.marker(position, { icon, draggable: !readOnly, title: 'Farm location pin', alt: 'Farm location pin' }).addTo(map);
      markerRef.current.on('dragend', () => { const point = markerRef.current.getLatLng(); changed.current?.({ latitude: Number(point.lat.toFixed(6)), longitude: Number(point.lng.toFixed(6)) }); });
      map.setView(position, 14);
    }
  }, [value.latitude, value.longitude, readOnly]);
  return <div className="space-y-3"><div className="relative z-0 h-72 overflow-hidden rounded-2xl border" ref={container} aria-label="Farm map. Click to place the pin, or enter coordinates below." />
    {!readOnly && <><p className="text-xs leading-relaxed text-gray-600">Click the map or drag the pin to your farm. If you are at the farm, use your current location. This pin is required before verification submission and is private.</p><button type="button" className={button} onClick={() => { if (!navigator.geolocation) { setMessage('Location is unavailable. Place the pin manually or enter coordinates.'); return; } setMessage('Finding your location…'); navigator.geolocation.getCurrentPosition(position => { onChange({ latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)) }); mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 16); setMessage('Check and adjust this pin so it identifies the farm.'); }, () => setMessage('Location permission or GPS is unavailable. Place the pin manually or enter coordinates.'), { enableHighAccuracy: true, timeout: 15000 }); }}>Use my current location</button><div className="grid grid-cols-2 gap-3">{[['latitude', 'Latitude', -4.9, 5.1], ['longitude', 'Longitude', 33.8, 42.1]].map(([name, label, min, max]) => <label key={name} className="space-y-1 text-sm"><span>{label}</span><input className={input} type="number" step="0.000001" min={min} max={max} value={value[name] ?? ''} onChange={event => onChange({ [name]: event.target.value === '' ? null : Number(event.target.value) })} /></label>)}</div></>}
    {message && <p role="status" className="text-sm text-green-900">{message}</p>}
    {value.latitude != null && value.longitude != null && <a className="inline-block text-sm font-semibold text-green-800 underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${value.latitude},${value.longitude}`)}`}>Open farm location in maps</a>}
  </div>;
}

export default function LocationFields({ value, onChange, farmer = false, required = true }) {
  const resource = useResource('/locations');
  if (resource.loading) return <Spinner label="Loading county and subcounty options" />;
  if (resource.error) return <p role="alert" className="text-sm text-red-800">{resource.error} <button type="button" className="underline" onClick={resource.reload}>Retry locations</button></p>;
  const { counties, subcounties, wards } = resource.data;
  return <fieldset className="space-y-4"><legend className="mb-3 font-semibold text-green-950">{farmer ? 'Farm location' : 'Your area'}</legend><div className="grid gap-4 sm:grid-cols-2">{[
    ['county_code', 'County', counties],
    ['subcounty_code', 'Subcounty', subcounties.filter(row => row.county_code === value.county_code)],
    ...(farmer ? [['ward_code', 'Ward', wards.filter(row => row.sub_county_code === value.subcounty_code)]] : []),
  ].map(([name, label, options]) => <label className="space-y-2 text-sm" key={name}><span>{label}</span><select className={input} required={required && (name !== 'ward_code' || farmer)} value={value[name] || ''} onChange={event => onChange({ [name]: event.target.value, ...(name === 'county_code' ? { subcounty_code: '', ward_code: '' } : name === 'subcounty_code' ? { ward_code: '' } : {}) })}><option value="">Select {label.toLowerCase()}…</option>{options.map(row => <option value={row.code} key={row.code}>{row.name}</option>)}</select></label>)}<label className="space-y-2 text-sm"><span>Town / area{farmer ? ' (optional)' : ''}</span><input className={input} maxLength={150} required={required && !farmer} value={value.town || ''} onChange={event => onChange({ town: event.target.value })} /></label></div>{farmer && <><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>Nearby landmark</span><input className={input} maxLength={200} value={value.landmark || ''} onChange={event => onChange({ landmark: event.target.value })} /></label><label className="space-y-2 text-sm"><span>Directions to the farm</span><textarea className={input} rows={3} maxLength={1000} value={value.directions || ''} onChange={event => onChange({ directions: event.target.value })} /></label></div><FarmPin value={value} onChange={onChange} /></>}<p className="text-xs text-gray-500">Location reference: <a className="underline" href="https://github.com/davidamunga/kenya-locations" target="_blank" rel="noopener noreferrer">kenya-locations</a>, CC BY 4.0. General reference only; the officer confirms the farm location.</p></fieldset>;
}
