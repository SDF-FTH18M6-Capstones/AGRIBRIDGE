import { Spinner } from '../../components/ui/Loading';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import useResource from './useResource';
import { Panel, Form, Status } from './UI';
import { button, money, when, paymentStatusLabel } from './format';

export default function Payments({ farmer = false, admin = false }) {
  const resource = useResource(admin ? '/admin/payments' : `/payments?view=${farmer ? 'farmer' : 'buyer'}`, true);
  const orders = useResource(admin ? '/admin/orders' : `/orders?view=${farmer ? 'farmer' : 'buyer'}`, true);
  const availability = useResource('/payments/availability', true);
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const returnedReference = params.get('reference') || params.get('trxref');
  const returnedPayment = params.get('payment');
  const handledReturn = useRef(null);
  const { reload: reloadPayments } = resource;
  const { reload: reloadOrders } = orders;
  useEffect(() => {
    if (farmer || admin || !returnedReference || !returnedPayment || handledReturn.current === returnedReference) return;
    handledReturn.current = returnedReference;
    async function verifyReturn() {
      try {
        const payment = (await api.get(`/payments/${encodeURIComponent(returnedPayment)}`)).data.data;
        if (payment.provider_reference !== returnedReference) throw new Error('The checkout reference does not match this payment. Contact support.');
        const result = (await api.post(`/payments/${payment.payment_id}/reconcile`)).data.data;
        setMessage(result.payment_status === 'paid' ? 'Payment verified by Paystack. Your order is now paid.' : `Paystack status: ${paymentStatusLabel(result)}. You can check its status again below.`);
        reloadPayments(); reloadOrders();
      } catch (error) { setMessage(error.message); }
    }
    verifyReturn();
  }, [admin, farmer, returnedReference, returnedPayment, reloadPayments, reloadOrders]);
  const payable = (orders.data || []).filter(order => order.can_pay);
  async function openCheckout(payment) {
    const response = await api.post(`/payments/${payment.payment_id}/initiate`, {});
    const checkout = new URL(response.data.data.authorization_url);
    if (checkout.protocol !== 'https:' || checkout.host !== 'checkout.paystack.com') throw new Error('Invalid Paystack checkout URL. Contact support.');
    window.location.assign(checkout.href);
    return 'Opening Paystack test checkout…';
  }
  async function check(payment) {
    setBusy(payment.payment_id); setMessage('');
    try {
      await api.post(admin ? `/admin/payments/${payment.payment_id}/reconcile` : `/payments/${payment.payment_id}/reconcile`);
      resource.reload(); orders.reload();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(null); }
  }
  return <Panel title={farmer ? 'Customer payments' : 'Payments'} resource={{ ...resource, reload: () => { resource.reload(); orders.reload(); availability.reload(); } }} description="Pay farmer-confirmed orders through Paystack. V1 uses test mode; no real money is collected.">
    {!farmer && !admin && availability.error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">Unable to check payment availability. {availability.error}</p>}
    {!farmer && !admin && availability.data && !availability.data.available && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{availability.data.message}</p>}
    {!farmer && !admin && !orders.loading && payable.length > 0 && <Form disabled={!availability.data?.available || availability.loading || Boolean(availability.error)} key={payable.map(order => order.order_id).join(',')} label="Continue to Paystack (test mode)" initial={{ order_id: payable.some(order => String(order.order_id) === params.get('order')) ? params.get('order') : String(payable[0].order_id) }} fields={[
      { name: 'order_id', label: 'Confirmed order', options: payable.map(order => ({ value: order.order_id, label: `#${order.order_id} · ${order.farm_name} · ${money(order.total_amount)}` })) },
    ]} onSubmit={async values => {
      // Recheck before allocating a pending record; configuration may have changed.
      const readiness = (await api.get('/payments/availability')).data.data;
      if (!readiness.available) { availability.reload(); throw new Error(readiness.message); }
      const order = payable.find(item => item.order_id === Number(values.order_id));
      if (!order) throw new Error('Select a confirmed, unpaid order.');
      let payment = resource.data?.find(item => item.order_id === order.order_id && item.payment_status === 'pending');
      if (!payment) payment = (await api.post('/payments', { order_id: order.order_id, amount: order.total_amount, payment_method: 'paystack' })).data.data;
      try {
        return await openCheckout(payment);
      } finally { resource.reload(); orders.reload(); }
    }} />}
    {!farmer && !admin && !orders.loading && !payable.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">No orders are ready for a new payment. Wait for farmer confirmation, or check an existing payment below.</p>}
    {message && <p role="alert" className="rounded-lg bg-green-50 p-4 text-green-950">{message}</p>}
    <div className="space-y-4">{resource.data?.map(payment => <article key={payment.payment_id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-green-950">Payment #{payment.payment_id} · Order #{payment.order_id}</h2><p className="mt-2 text-xl font-bold">{money(payment.amount)}</p></div><Status value={payment.provider_started && payment.payment_status === 'pending' ? 'processing' : payment.payment_status} label={paymentStatusLabel(payment)} /></div><p className="mt-3 break-all text-sm text-gray-600">{payment.transaction_reference || (payment.provider_reference ? `Paystack reference: ${payment.provider_reference}` : 'No settled transaction reference yet')}</p>{payment.paid_at && <p className="mt-1 text-sm text-gray-500">Verified {when(payment.paid_at)}</p>}
      {payment.payment_status === 'pending' && payment.provider_started && payment.payment_method !== 'paystack' && <p role="status" className="mt-3 text-sm text-amber-900">This existing payment used the previous provider. Contact the administrator to resolve it before starting another checkout.</p>}
      {!farmer && !admin && payment.payment_status === 'pending' && payment.payment_method === 'paystack' && payment.authorization_url && <button className={`${button} mt-4 mr-3`} disabled={busy !== null} onClick={async () => { setBusy(payment.payment_id); try { await openCheckout(payment); } catch (error) { setMessage(error.message); } finally { setBusy(null); } }}>Resume Paystack checkout</button>}
      {!farmer && payment.payment_status === 'pending' && payment.provider_started && payment.payment_method === 'paystack' && !payment.provider_reference_unknown && <button className={`${button} mt-4`} disabled={busy !== null} onClick={() => check(payment)}>{busy === payment.payment_id ? <Spinner label="Checking payment status" /> : 'Check Paystack status'}</button>}
      {admin && payment.payment_status === 'pending' && !payment.provider_started && <button className={`${button} mt-4`} onClick={async () => { try { await api.patch(`/payments/${payment.payment_id}`, { payment_status: 'failed' }); resource.reload(); } catch (error) { setMessage(error.message); } }}>Close unstarted attempt</button>}
    </article>)}</div>
    {resource.data?.length === 0 && <p className="rounded-2xl border bg-white p-8 text-gray-600">No payment attempts yet.</p>}
  </Panel>;
}
