import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useResource from './useResource';
import { Panel, Form, Status, AccountShell } from './UI';
import { button, secondary, money, when } from './format';

export function Dashboard({ role }) {
  const resource = useResource(`/dashboards/${role}`, true);
  const counts = resource.data?.orders?.by_status || {};
  const farmer = role === 'farmer';
  const items = farmer ? [['pending', 'Need your confirmation'], ['confirmed', 'Awaiting buyer payment'], ['paid', 'Paid orders']] : [['pending', 'Awaiting farmer confirmation'], ['confirmed', 'Confirmed / payment pending'], ['paid', 'Confirm receipt when received']];
  return <Panel title={farmer ? 'Your harvest, your business.' : 'Good produce starts here.'} resource={resource} description={farmer ? 'Review incoming orders first. Buyers can pay only after you confirm.' : 'Track your orders from farmer confirmation to payment and receipt.'}>
    <div className="grid gap-4 sm:grid-cols-3">{items.map(([status, title]) => <Link key={status} to={`/${role}/orders`} className="rounded-xl border bg-white p-5 transition hover:border-green-600"><p className="text-sm text-gray-600">{title}</p><p className="mt-3 text-4xl font-bold text-green-950">{counts[status] || 0}</p></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><section className="rounded-2xl bg-green-950 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-green-200">Next step</p><h2 className="mt-3 text-2xl font-bold">{farmer ? 'Keep your listings fresh.' : 'Find your next harvest.'}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-green-100">{farmer ? 'Accurate stock and clear product details help buyers order with confidence.' : 'Browse current prices and available quantities from approved farms.'}</p>{farmer ? <Link className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-bold text-green-950" to="/farmer/products/new">Add a product</Link> : <a className="mt-6 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-bold text-green-950" href="/marketplace">Explore produce</a>}</section><section className="space-y-4 rounded-xl border bg-white p-6"><h2 className="font-bold text-green-950">Your account at a glance</h2><p className="text-sm">Completed orders <strong className="float-right">{counts.completed || 0}</strong></p><p className="text-sm">{farmer ? 'Verified customer payments' : 'Verified payments'} <strong className="float-right">{money(resource.data?.payments?.paid_amount)}</strong></p>{farmer && <p className="text-sm">Products <strong className="float-right">{resource.data?.products?.total || 0}</strong></p>}<Link className="block text-sm font-semibold text-green-800 underline" to="/profile">Manage buyer & farmer profiles</Link><Link className="block text-sm font-semibold text-green-800 underline" to={`/${role}/issues`}>Resolution requests</Link></section></div>
  </Panel>;
}

export function Notifications({ standalone = false }) {
  const resource = useResource('/notifications', true);
  const [error, setError] = useState('');
  const content = <Panel title="Notifications" resource={resource} description="Updates about your orders, payments and farmer verification.">{error && <p role="alert" className="text-red-800">{error}</p>}<div className="space-y-3">{resource.data?.map(row => <article key={row.notification_id} className={`rounded-xl border p-5 ${row.read_at ? 'bg-white' : 'border-green-200 bg-green-50'}`}><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-bold text-green-950">{row.title}</h2><time className="text-xs text-gray-500" dateTime={row.created_at}>{when(row.created_at)}</time></div><p className="mt-3 text-sm leading-relaxed text-gray-700">{row.message}</p><div className="mt-4 flex flex-wrap gap-4"><Link to={row.link} className="text-sm font-semibold text-green-800 underline">View details</Link>{!row.read_at && <button className="text-sm font-semibold text-green-800" onClick={async () => { try { await api.patch(`/notifications/${row.notification_id}`); setError(''); resource.reload(); } catch (err) { setError(err.message); } }}>Mark read</button>}</div></article>)}</div>{resource.data?.length === 0 && <p className="rounded-xl border bg-white p-8 text-gray-600">You’re all caught up. New updates will appear here.</p>}</Panel>;
  return standalone ? <AccountShell>{content}</AccountShell> : content;
}

export function Issues({ admin = false, standalone = false }) {
  const resource = useResource('/order-issues', true);
  const content = <Panel title={admin ? 'Order exceptions & refunds' : 'Your resolution requests'} resource={resource} description={admin ? 'Investigate provider records before recording a resolution. Recording a refund does not send money.' : 'Request cancellation, refund review or payment investigation from an order.'}>
    <div className="space-y-5">{resource.data?.map(row => <article key={row.issue_id} className="space-y-4 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-bold text-green-950">Request #{row.issue_id} · Order #{row.order_id}</h2><Status value={row.status} /></div><p className="text-sm font-semibold capitalize">{row.issue_type}</p><p className="whitespace-pre-line text-sm text-gray-700">{row.reason}</p><p className="text-xs text-gray-500">Submitted {when(row.created_at)}</p>{row.resolution_note && <p className="rounded-lg bg-green-50 p-4 text-sm">Administrator: {row.resolution_note}{row.refund_reference && ` · Refund reference: ${row.refund_reference}`}</p>}
      {admin && row.status === 'open' && <Form label="Record resolution" fields={[
        { name: 'decision', label: 'Decision', options: [{ value: 'reject', label: 'Reject request' }, { value: 'cancel', label: 'Cancel unpaid order' }, { value: 'refund_verified', label: 'Record externally verified refund' }, { value: 'resolved', label: 'Resolved without changing payment' }] },
        { name: 'note', label: 'Investigation and resolution notes', type: 'textarea', minLength: 5, wide: true },
        { name: 'refund_reference', label: 'External refund reference (refund decisions only)', required: false, maxLength: 100 },
        { name: 'refund_verified', label: 'I independently verified that the external refund succeeded', type: 'checkbox', required: false, wide: true },
        { name: 'restock_confirmed', label: 'I verified that this stock can be returned to sale', type: 'checkbox', required: false, wide: true },
      ]} onSubmit={async values => { await api.patch(`/admin/order-issues/${row.issue_id}`, values); resource.reload(); }} />}
    </article>)}</div>{resource.data?.length === 0 && <p className="rounded-xl border bg-white p-8 text-gray-600">No resolution requests.</p>}
  </Panel>;
  return standalone ? <AccountShell>{content}</AccountShell> : content;
}

export function AdminSettings() {
  const resource = useResource('/admin/settings');
  return <Panel title="Marketplace settings" resource={resource} description="New deadlines apply to new reservations and newly confirmed orders. Existing deadlines remain unchanged.">{resource.data && <Form key={JSON.stringify(resource.data)} initial={resource.data} fields={[{ name: 'confirmation_hours', label: 'Farmer confirmation window (hours)', type: 'number', min: 1, max: 72, step: 1 }, { name: 'payment_hours', label: 'Buyer payment window (hours)', type: 'number', min: 1, max: 24, step: 1 }]} onSubmit={async values => { await api.put('/admin/settings', { confirmation_hours: Number(values.confirmation_hours), payment_hours: Number(values.payment_hours) }); resource.reload(); }} />}</Panel>;
}

export function AuditHistory() {
  const resource = useResource('/admin/audit');
  return <Panel title="Audit history" resource={resource}><div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-green-50"><tr>{['When', 'Actor', 'Record', 'Action', 'Details'].map(title => <th scope="col" key={title} className="p-4">{title}</th>)}</tr></thead><tbody>{resource.data?.map(row => <tr className="border-t" key={row.event_id}><td className="p-4">{when(row.created_at)}</td><td className="p-4">{row.actor_id || 'System'}</td><td className="p-4">{row.entity_type} #{row.entity_id}</td><td className="p-4">{row.action.replaceAll('_', ' ')}</td><td className="max-w-sm break-words p-4">{JSON.stringify(row.details)}</td></tr>)}</tbody></table></div></Panel>;
}

export function DashboardSwitch() {
  return <nav aria-label="Dashboard switcher" className="flex flex-wrap gap-3"><Link to="/profile" className={secondary}>Buyer & farmer profiles</Link><a href="/marketplace" className={button}>Marketplace</a></nav>;
}

export function Moderation({ farmers = false }) {
  const resource = useResource(farmers ? '/admin/farmers' : '/admin/products');
  return <Panel title={farmers ? 'Farmer accounts' : 'Product moderation'} resource={resource} description="Record a reason when restricting access. Existing order details are preserved."><div className="space-y-5">{resource.data?.map(row => <article key={farmers ? row.farmer_id : row.product_id} className="space-y-4 rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold text-green-950">{farmers ? row.farm_name : row.product_name}</h2><p className="mt-2 text-sm text-gray-600">{farmers ? `${row.full_name} · ${row.location}` : `${row.farm_name} · ${money(row.price)} / ${row.unit}`}</p></div><Status value={farmers ? row.verification_status : row.status} /></div>{(!farmers || row.verification_status === 'approved') && <Form label={farmers ? 'Suspend selling access' : 'Archive listing'} fields={[{ name: 'reason', label: 'Reason', minLength: 5, maxLength: 1000 }]} onSubmit={async values => { await api.patch(farmers ? `/admin/farmers/${row.farmer_id}/suspend` : `/admin/products/${row.product_id}/archive`, values); resource.reload(); }} />}</article>)}</div>{resource.data?.length === 0 && <p className="rounded-xl border bg-white p-6">No records yet.</p>}</Panel>;
}
