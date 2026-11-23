import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useResource from './useResource';
import { Panel, Form, Status } from './UI';
import { button, secondary, money, when } from './format';

function OrderCard({ order, role, admin, reload }) {
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  async function transition(status, reason) {
    setBusy(true); setMessage('');
    try { await api.patch(`/orders/${order.order_id}/status`, { status, ...(reason ? { reason } : {}) }); setAction(''); reload(); }
    catch (error) { setMessage(error.message); throw error; }
    finally { setBusy(false); }
  }
  const steps = ['pending', 'confirmed', 'paid', 'completed'];
  const index = steps.indexOf(order.order_status);
  return <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Order #{order.order_id}</p><h2 className="mt-1 text-xl font-bold text-green-950">{role === 'farmer' ? order.buyer_name : order.farm_name}</h2><p className="mt-1 text-xs text-gray-500">Placed {when(order.created_at)}</p></div><Status value={order.payment_status === 'processing' ? 'processing' : order.order_status} /></header>
    <div className="space-y-5 p-5 sm:p-6"><ul className="divide-y divide-gray-100">{order.items.map(item => <li key={item.order_item_id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span><strong>{item.product_name}</strong><span className="ml-2 text-gray-600">{item.quantity} {item.unit} × {money(item.unit_price)}</span></span><span className="font-semibold">{money(item.subtotal)}</span></li>)}</ul><p className="text-right text-lg font-bold text-green-900">Total {money(order.total_amount)}</p>
      {index >= 0 && <ol aria-label="Order progress" className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{steps.map((step, position) => <li key={step} aria-current={position === index ? 'step' : undefined} className={`rounded-lg border px-3 py-3 ${position <= index ? 'border-green-200 bg-green-50 text-green-900' : 'border-gray-100 text-gray-500'}`}>{position + 1}. {step === 'pending' ? 'Placed' : step === 'confirmed' ? 'Farmer confirmed' : step === 'paid' ? 'Payment verified' : 'Receipt confirmed'}</li>)}</ol>}
      {order.order_status === 'pending' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Farmer confirmation due by <time dateTime={order.confirmation_deadline}>{when(order.confirmation_deadline)}</time>. Payment opens after confirmation.</p>}
      {order.order_status === 'confirmed' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Payment due by <time dateTime={order.payment_deadline}>{when(order.payment_deadline)}</time>. {order.payment_status === 'processing' && 'A charge is being reconciled; please do not submit another payment.'}</p>}
      {order.rejection_reason && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><strong>Farmer’s reason:</strong> {order.rejection_reason}</p>}
      <div className="flex flex-wrap gap-3">
        {!admin && role === 'farmer' && order.order_status === 'pending' && <><button className={button} disabled={busy} onClick={() => transition('confirmed').catch(() => {})}>Confirm order</button><button className={secondary} disabled={busy} onClick={() => setAction(action === 'reject' ? '' : 'reject')}>Reject with reason</button></>}
        {!admin && role === 'buyer' && ['pending', 'confirmed'].includes(order.order_status) && order.payment_status !== 'processing' && <button className={secondary} disabled={busy} onClick={() => setAction(action === 'cancel' ? '' : 'cancel')}>Cancel order</button>}
        {!admin && role === 'buyer' && order.can_pay && <Link className={button} to={`/buyer/payments?order=${order.order_id}`}>Pay confirmed order</Link>}
        {!admin && role === 'buyer' && order.order_status === 'paid' && <button className={button} onClick={() => setAction(action === 'receipt' ? '' : 'receipt')}>Confirm received</button>}
        {!admin && role === 'buyer' && order.can_review && <button className={secondary} onClick={() => setAction(action === 'review' ? '' : 'review')}>Leave a review</button>}
        {!admin && (['paid', 'completed'].includes(order.order_status) || order.payment_status === 'processing' || role === 'farmer' && order.order_status === 'confirmed') && <button className={secondary} onClick={() => setAction(action === 'issue' ? '' : 'issue')}>Request resolution</button>}
        <button className="text-sm font-semibold text-green-800 underline" onClick={async () => { try { setHistory((await api.get(`/orders/${order.order_id}`)).data.data.history); } catch (error) { setMessage(error.message); } }} hidden={admin}>Show order history</button>
      </div>
      {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p>}
      {action === 'reject' && <Form label="Reject order" fields={[{ name: 'reason', label: 'Why can’t you fulfil this order?', type: 'textarea', minLength: 3, maxLength: 1000, wide: true }]} onSubmit={values => transition('rejected', values.reason)} />}
      {action === 'cancel' && <Form label="Confirm cancellation" fields={[{ name: 'confirmed', type: 'checkbox', label: 'Cancel this unpaid order and release its reserved stock', required: true, wide: true }]} onSubmit={() => transition('cancelled')} />}
      {action === 'receipt' && <Form label="Complete order" fields={[{ name: 'received', type: 'checkbox', label: 'I have received the produce for this order', required: true, wide: true }]} onSubmit={() => transition('completed')} />}
      {action === 'review' && <Form label="Submit review" fields={[{ name: 'rating', label: 'Rating', options: [5, 4, 3, 2, 1].map(value => ({ value, label: `${value} out of 5` })) }, { name: 'comment', label: 'Your feedback', type: 'textarea', required: false, maxLength: 100 }]} onSubmit={async values => { await api.post('/reviews', { order_id: order.order_id, rating: Number(values.rating), comment: values.comment || null }); setAction(''); reload(); }} />}
      {action === 'issue' && <Form label="Send request to administrator" fields={[{ name: 'issue_type', label: 'Request type', options: [{ value: 'cancellation', label: 'Cancellation' }, { value: 'refund', label: 'Refund' }, { value: 'payment', label: 'Payment needs investigation' }] }, { name: 'reason', label: 'Explain what happened', type: 'textarea', minLength: 5, wide: true }]} onSubmit={async values => { await api.post(`/orders/${order.order_id}/issues`, values); setAction(''); setMessage('Request sent. Track it under Resolution requests.'); reload(); }} />}
      {history && <ol className="space-y-2 border-t pt-4 text-sm">{history.length ? history.map((event, position) => <li key={position}><time className="text-gray-500">{when(event.created_at)}</time><span className="ml-3 font-medium">{event.action.replaceAll('_', ' ')}</span>{event.details.message && <p className="mt-1 text-gray-600">{event.details.message}</p>}</li>) : <li>No recorded events for this legacy order.</li>}</ol>}
    </div>
  </article>;
}

export default function Orders({ role = 'buyer', admin = false }) {
  const resource = useResource(admin ? '/admin/orders' : `/orders?view=${role}`, true);
  return <Panel title={admin ? 'All orders' : role === 'farmer' ? 'Orders to confirm & manage' : 'Your orders'} resource={resource} description="The farmer confirms first. Payment is verified separately. The buyer confirms receipt to complete an order.">
    <div className="space-y-6">{resource.data?.map(order => <OrderCard key={order.order_id} order={order} role={role} admin={admin} reload={resource.reload} />)}</div>
    {resource.data?.length === 0 && <div className="rounded-xl border bg-white p-8"><h2 className="font-semibold">No orders yet</h2><p className="mt-2 text-sm text-gray-600">{role === 'farmer' ? 'Orders from buyers will appear here for confirmation.' : 'Browse produce to place your first order.'}</p><a href="/marketplace" className="mt-5 inline-block font-semibold text-green-800 underline">Visit marketplace</a></div>}
  </Panel>;
}
