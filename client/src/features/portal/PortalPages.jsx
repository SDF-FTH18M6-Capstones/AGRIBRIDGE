import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import Payments from '../v1/Payments';

const button = 'inline-flex items-center justify-center rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-900 disabled:opacity-50';
const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-green-700';
const money = value => `KSh ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true;
    async function load() {
      setState(previous => ({ ...previous, loading: true, error: '' }));
      try {
        const response = await api.get(path);
        if (active) setState({ data: response.data.data, loading: false, error: '' });
      } catch (error) {
        if (active) setState(previous => ({ ...previous, loading: false, error: error.message }));
      }
    }
    load();
    return () => { active = false; };
  }, [path, version]);
  return { ...state, reload };
}

function Frame({ title, resource, children }) {
  return <section className="space-y-6 text-gray-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-green-950">{title}</h1>{resource && <button className="rounded-lg border bg-white px-4 py-2" onClick={resource.reload}>Refresh</button>}</div>
    {resource?.loading && <p role="status">Loading…</p>}
    {resource?.error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{resource.error}</p>}
    {!resource?.loading && !resource?.error && children}
  </section>;
}

function Table({ rows = [], columns, actions }) {
  if (!rows.length) return <p className="rounded-xl border bg-white p-8 text-gray-600">No records yet.</p>;
  return <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-green-50"><tr>{columns.map(([key, label]) => <th scope="col" key={key} className="px-4 py-3">{label}</th>)}{actions && <th scope="col" className="px-4 py-3">Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={row.order_id || row.payment_id || row.verification_id || row.response_id || row.product_id || index} className="border-t">{columns.map(([key, , format]) => <td key={key} className="px-4 py-4">{format ? format(row[key], row) : String(row[key] ?? '—')}</td>)}{actions && <td className="px-4 py-4">{actions(row)}</td>}</tr>)}</tbody></table></div>;
}

function ActionForm({ fields, onSubmit, label = 'Save', initial = {} }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try { await onSubmit(values); setMessage('Saved successfully.'); }
    catch (error) { setMessage(error.message || 'Unable to save.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5">
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.name} className="block space-y-2 text-sm font-medium"><span>{field.label}</span>{field.options ? <select required={field.required !== false} className={input} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}><option value="">Select…</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input className={input} type={field.type || 'text'} required={field.required !== false} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength} value={values[field.name] ?? ''} onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))} />}</label>)}</div>
    <button className={button} disabled={busy}>{busy ? 'Saving…' : label}</button><p role="status" className="text-sm">{message}</p>
  </form>;
}

export function ProfilePage({ farmer = false }) {
  const { user, updateUser } = useAuth();
  const resource = useResource('/profiles/me');
  const profile = resource.data?.[farmer ? 'farmer_profile' : 'buyer_profile'];
  const fields = farmer ? [{ name: 'farm_name', label: 'Farm name' }, { name: 'location', label: 'Farm location' }, { name: 'description', label: 'About your farm', required: false }] : [{ name: 'business_name', label: 'Business name', required: false }, { name: 'location', label: 'Location' }, { name: 'buyer_type', label: 'Buyer type', options: ['individual', 'retailer', 'wholesaler', 'restaurant'].map(value => ({ value, label: value })) }];
  return <Frame title={farmer ? 'My farm' : 'Buyer profile'} resource={resource}><p>{user?.full_name} · {user?.email}</p>{farmer && <p>Verification: <strong>{profile?.verification_status || 'pending'}</strong></p>}<ActionForm key={JSON.stringify(profile)} initial={profile || {}} fields={fields} onSubmit={async values => { const payload = Object.fromEntries(fields.map(f => [f.name, values[f.name] || ''])); const response = await api.put('/profiles/me', { ...payload, profile_type: farmer ? 'farmer' : 'buyer' }); updateUser(response.data.user); resource.reload(); }} /></Frame>;
}

export function AccountSettings() {
  const { user, updateUser } = useAuth();
  return <Frame title="Account settings"><p className="text-gray-600">{user?.email}</p><ActionForm initial={user} fields={[{ name: 'full_name', label: 'Full name' }, { name: 'phone_number', label: 'Phone number', type: 'tel', required: false }]} onSubmit={async values => { const response = await api.patch('/account', { full_name: values.full_name, phone_number: values.phone_number || null }); updateUser(response.data.data); }} /><Link className="font-semibold text-green-800 underline" to="/forgot-password">Reset password</Link></Frame>;
}

export function Dashboard({ role }) {
  const resource = useResource(`/dashboards/${role}`);
  return <Frame title={`${role === 'farmer' ? 'Farmer' : 'Buyer'} dashboard`} resource={resource}><div className="grid gap-4 sm:grid-cols-3">{['products', 'requests', 'orders', 'payments'].filter(key => resource.data?.[key]).map(key => <div key={key} className="rounded-xl border bg-white p-6"><p className="capitalize text-gray-600">{key}</p><p className="mt-2 text-3xl font-bold text-green-900">{resource.data[key].total}</p>{key === 'payments' && <p className="mt-3 text-sm">Received: {money(resource.data[key].paid_amount)}</p>}</div>)}</div><a href="/marketplace" className={button}>Browse produce</a></Frame>;
}

export function OrdersPage({ role = 'buyer', admin = false }) {
  const resource = useResource(admin ? '/admin/orders' : '/orders');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const transitions = { pending: 'confirmed', confirmed: 'shipped', shipped: 'delivered', delivered: 'completed' };
  async function change(order, status) {
    setBusy(order.order_id); setMessage('');
    try { await api.patch(`/orders/${order.order_id}/status`, { status }); resource.reload(); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(null); }
  }
  return <Frame title="Orders" resource={resource}><p role="status">{message}</p><Table rows={resource.data || []} columns={[
    ['order_id', 'Order'], ['items', 'Products', items => items.map(item => `${item.product_name || `Product #${item.product_id}`} × ${item.quantity}`).join(', ')], ['total_amount', 'Total', money], ['order_status', 'Status'],
  ]} actions={admin ? undefined : order => <div className="flex flex-wrap gap-2">
    {role === 'farmer' && transitions[order.order_status] && <button className={button} disabled={busy !== null} onClick={() => change(order, transitions[order.order_status])}>Mark {transitions[order.order_status]}</button>}
    {order.order_status === 'pending' && <button className="rounded-lg border px-3 py-2" disabled={busy !== null} onClick={() => change(order, 'cancelled')}>Cancel</button>}
    {role === 'buyer' && order.order_status !== 'cancelled' && <Link className={button} to={`/buyer/payments?order=${order.order_id}`}>Payment</Link>}
  </div>} /></Frame>;
}

export function PaymentsPage({ admin = false, farmer = false }) {
  return <Payments admin={admin} farmer={farmer} />;
}

export function CartPage() {
  const [params] = useSearchParams();
  const id = params.get('product');
  const resource = useResource(id ? `/products/${encodeURIComponent(id)}` : '/products/search?per_page=1');
  const [quantity, setQuantity] = useState(params.get('quantity') || '1');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const product = id ? resource.data : null;
  return <Frame title="Cart & checkout" resource={resource}>{!product ? <div className="rounded-xl border bg-white p-8"><p>Your cart is empty.</p><a className="mt-4 inline-block text-green-800 underline" href="/marketplace">Browse produce</a></div> : <form className="space-y-5 rounded-xl border bg-white p-6" onSubmit={async e => { e.preventDefault(); if (busy || ordered) return; setBusy(true); setMessage(''); try { const response = await api.post('/orders', { items: [{ product_id: product.product_id, quantity }] }); setOrdered(true); setMessage(`Order #${response.data.data.order_id} created successfully.`); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }}><h2 className="text-xl font-bold">{product.product_name}</h2><p>{money(product.price)} / {product.unit} · {product.farm_name}</p><label className="block max-w-xs space-y-2"><span>Quantity ({product.unit})</span><input className={input} type="number" min="0.001" step="0.001" max={product.quantity_available} required value={quantity} onChange={e => setQuantity(e.target.value)} disabled={ordered} /></label><p>Total: {money(Number(product.price) * Number(quantity))}</p><button className={button} disabled={busy || ordered}>{ordered ? 'Order placed' : busy ? 'Placing order…' : 'Place order'}</button><p role="status">{message}</p>{ordered && <Link to="/buyer/orders" className="inline-block font-semibold text-green-800 underline">View order and pay</Link>}</form>}</Frame>;
}

export function SavedProductsPage() {
  const resource = useResource('/saved-products');
  const [message, setMessage] = useState('');
  return <Frame title="Saved products" resource={resource}><p role="status">{message}</p><Table rows={resource.data || []} columns={[
    ['product', 'Product', product => product?.product_name || 'Product'], ['product', 'Price', product => money(product?.price)],
  ]} actions={row => <div className="flex flex-wrap gap-3"><a className={button} href={`/marketplace/${row.product_id}`}>View product</a><button className="rounded-lg border px-3 py-2" onClick={async () => { try { await api.delete(`/saved-products/${row.saved_product_id}`); resource.reload(); } catch (error) { setMessage(error.message); } }}>Remove</button></div>} /></Frame>;
}

export function RequestsPage({ farmer = false }) {
  const resource = useResource(`/requests?view=${farmer ? 'farmer' : 'buyer'}`);
  const categories = useResource('/categories/');
  const [selected, setSelected] = useState(null);
  return <Frame title={farmer ? 'Buyer requests' : 'My buying requests'} resource={resource}>
    {!farmer && <ActionForm label="Publish request" fields={[
      { name: 'product_name', label: 'Product' }, { name: 'category_id', label: 'Category', options: (categories.data || []).map(c => ({ value: c.category_id, label: c.category_name })) },
      { name: 'quantity', label: 'Quantity', type: 'number', min: '0.001', step: '0.001' }, { name: 'unit', label: 'Unit', options: ['kg', 'gram', 'tonne', 'litre', 'piece', 'crate', 'bag', 'bunch'].map(value => ({ value, label: value })) },
      { name: 'budget', label: 'Budget (KSh)', type: 'number', min: '0.01', step: '0.01', required: false }, { name: 'location', label: 'Location' }, { name: 'required_date', label: 'Required by', type: 'date', required: false },
    ]} onSubmit={async values => { await api.post('/requests', { ...values, category_id: Number(values.category_id), budget: values.budget || null, required_date: values.required_date || null }); resource.reload(); }} />}
    <Table rows={resource.data || []} columns={[
      ['product_name', 'Product'], ['quantity', 'Quantity', (value, row) => `${value} ${row.unit}`], ['budget', 'Budget', value => value ? money(value) : '—'], ['location', 'Location'], ['status', 'Status'],
    ]} actions={row => <button className={button} onClick={() => setSelected(row)}>{farmer ? 'Make offer' : 'View offers'}</button>} />
    {selected && <section className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">{selected.product_name}</h2><button className="underline" onClick={() => setSelected(null)}>Close offers</button></div>{farmer ? <ActionForm key={selected.request_id} label="Submit offer" fields={[{ name: 'offered_price', label: 'Offered price', type: 'number', min: '0.01', step: '0.01' }, { name: 'available_quantity', label: 'Available quantity', type: 'number', min: '0.001', step: '0.001' }, { name: 'message', label: 'Message', required: false }]} onSubmit={async values => { await api.post(`/requests/${selected.request_id}/responses`, values); resource.reload(); }} /> : <Offers requestId={selected.request_id} onChange={resource.reload} />}</section>}
  </Frame>;
}

function Offers({ requestId, onChange }) {
  const resource = useResource(`/requests/${requestId}/responses`);
  const [message, setMessage] = useState('');
  return <Frame title="Farmer offers" resource={resource}><p role="status">{message}</p><Table rows={resource.data || []} columns={[
    ['farmer_id', 'Farmer'], ['offered_price', 'Price', money], ['available_quantity', 'Quantity'], ['message', 'Message'], ['status', 'Status'],
  ]} actions={row => row.status === 'pending' && <div className="flex gap-2">{['accepted', 'rejected'].map(status => <button key={status} className={button} onClick={async () => { try { await api.patch(`/responses/${row.response_id}`, { status }); resource.reload(); onChange(); } catch (error) { setMessage(error.message); } }}>{status === 'accepted' ? 'Accept' : 'Reject'}</button>)}</div>} /></Frame>;
}

export function VerificationPage({ role = 'farmer' }) {
  const path = role === 'farmer' ? '/farmer-verifications/me' : role === 'admin' ? '/farmer-verifications' : '/field-officer/verifications';
  const resource = useResource(path);
  const officers = useResource(role === 'admin' ? '/admin/field-officers' : '/profiles/me');
  return <Frame title="Farmer verification" resource={resource}>
    {role === 'farmer' && <ActionForm label="Request verification" fields={[{ name: 'farm_location', label: 'Farm location' }]} onSubmit={async values => { await api.post('/farmer-verifications', values); resource.reload(); }} />}
    <Table rows={resource.data || []} columns={[
      ['verification_id', 'Verification'], ['farmer_id', 'Farmer'], ['farm_location', 'Location'], ['status', 'Status'], ['remarks', 'Remarks'],
    ]} actions={row => role === 'admin' && row.status === 'pending' ? <ActionForm label="Assign officer" fields={[{ name: 'field_officer_id', label: 'Field officer', options: (Array.isArray(officers.data) ? officers.data : []).filter(o => o.status === 'active').map(o => ({ value: o.field_officer_id, label: `${o.full_name} · ${o.staff_number}` })) }]} onSubmit={async values => { await api.patch(`/farmer-verifications/${row.verification_id}`, { action: 'assign', field_officer_id: Number(values.field_officer_id) }); resource.reload(); }} /> : role === 'admin' && row.status === 'submitted' ? <ActionForm label="Save decision" fields={[{ name: 'decision', label: 'Decision', options: [{ value: 'approved', label: 'Approve' }, { value: 'rejected', label: 'Reject' }] }, { name: 'remarks', label: 'Review remarks' }]} onSubmit={async values => { await api.patch(`/farmer-verifications/${row.verification_id}`, { ...values, action: 'review' }); resource.reload(); }} /> : role === 'officer' && row.status === 'assigned' ? <ActionForm label="Submit inspection" fields={[{ name: 'recommendation', label: 'Recommendation', options: [{ value: 'approve', label: 'Approve' }, { value: 'reject', label: 'Reject' }] }, { name: 'remarks', label: 'Inspection observations' }, { name: 'visit_date', label: 'Visit date', type: 'datetime-local' }, { name: 'evidence_url', label: 'Evidence URL', type: 'url', required: false }]} onSubmit={async values => { await api.patch(`/farmer-verifications/${row.verification_id}`, { ...values, evidence_url: values.evidence_url || null, action: 'submit' }); resource.reload(); }} /> : null} />
  </Frame>;
}

export function AdminDirectory({ type }) {
  const resource = useResource(`/admin/${type}`);
  const columns = type === 'farmers' ? [['full_name', 'Farmer'], ['farm_name', 'Farm'], ['location', 'Location'], ['verification_status', 'Verification']] : type === 'buyers' ? [['full_name', 'Buyer'], ['business_name', 'Business'], ['location', 'Location'], ['buyer_type', 'Type']] : [['full_name', 'Officer'], ['email', 'Email'], ['staff_number', 'Staff number'], ['status', 'Status']];
  return <Frame title={type.replace('-', ' ')} resource={resource}>
    {type === 'field-officers' && <ActionForm label="Create officer" fields={[{ name: 'full_name', label: 'Full name' }, { name: 'email', label: 'Email', type: 'email' }, { name: 'password', label: 'Temporary password', type: 'password' }, { name: 'staff_number', label: 'Staff number' }]} onSubmit={async values => { await api.post('/admin/field-officers', values); resource.reload(); }} />}
    <Table rows={resource.data || []} columns={columns} />
  </Frame>;
}

export function CategoriesPage() {
  const resource = useResource('/categories/');
  return <Frame title="Categories" resource={resource}><ActionForm label="Add category" fields={[{ name: 'category_name', label: 'Category name' }, { name: 'description', label: 'Description', required: false }]} onSubmit={async values => { await api.post('/categories/', values); resource.reload(); }} /><Table rows={resource.data || []} columns={[[ 'category_name', 'Category' ], ['description', 'Description']]} /></Frame>;
}

export function AdminProducts() {
  const resource = useResource('/products');
  return <Frame title="Products" resource={resource}><Table rows={resource.data || []} columns={[
    ['product_name', 'Product'], ['price', 'Price', money], ['quantity_available', 'Stock'], ['status', 'Status'],
  ]} actions={row => <a href={`/marketplace/${row.product_id}`} className="font-semibold text-green-800 underline">View product</a>} /></Frame>;
}

export function ReportsPage() {
  const resource = useResource('/dashboards/admin');
  return <Frame title="Reports" resource={resource}><p className="text-gray-600">Current database totals.</p><div className="grid gap-4 sm:grid-cols-2">{Object.entries(resource.data || {}).filter(([key]) => key !== 'requests').map(([key, value]) => <div className="rounded-xl border bg-white p-5" key={key}><h2 className="font-bold capitalize">{key}</h2><p className="text-3xl text-green-900">{value.total}</p>{value.total_amount !== undefined && <p>Total value: {money(value.total_amount)}</p>}{value.paid_amount !== undefined && <p>Settled: {money(value.paid_amount)}</p>}</div>)}</div><button className={button} onClick={() => { const blob = new Blob([JSON.stringify(resource.data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'agribridge-report.json'; a.click(); URL.revokeObjectURL(url); }}>Export report</button></Frame>;
}

export function NotificationsPage({ admin = false }) {
  const resource = useResource(admin ? '/admin/orders' : '/orders');
  return <Frame title="Order updates" resource={resource}><Table rows={resource.data || []} columns={[
    ['order_id', 'Order'], ['order_status', 'Current status'], ['total_amount', 'Total', money],
  ]} /></Frame>;
}

export function FarmerPublicProfile() {
  const { farmerId } = useParams();
  const resource = useResource(`/farmers/${encodeURIComponent(farmerId)}`);
  return <Frame title="Farmer profile" resource={resource}>{resource.data && <article className="space-y-3 rounded-xl border bg-white p-6"><h2 className="text-xl font-bold">{resource.data.farm_name}</h2><p>{resource.data.location}</p><p>{resource.data.description}</p><p>Verification: {resource.data.verification_status}</p><a href="/marketplace" className={button}>Browse produce</a></article>}</Frame>;
}
