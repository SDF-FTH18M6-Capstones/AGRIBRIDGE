import { Spinner } from '../../components/ui/Loading';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { AccountShell, Panel } from './UI';
import { button, secondary, input, money } from './format';

function readCart(key) {
  try { const saved = JSON.parse(sessionStorage.getItem(key)); if (Array.isArray(saved?.items)) return saved; }
  catch { /* Start a new tab-local cart when storage is invalid. */ }
  return { items: [], checkout_key: crypto.randomUUID() };
}

export default function Cart() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const productId = params.get('product');
  const requested = params.get('quantity') || '1';
  const key = `agribridge_cart_${user.user_id}`;
  const [cart, setCart] = useState(() => readCart(key));
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(Boolean(productId));
  const [created, setCreated] = useState([]);
  useEffect(() => {
    let active = true;
    if (!productId) return;
    async function addProduct() {
      try {
        const product = (await api.get(`/products/${encodeURIComponent(productId)}`)).data.data;
        const quantity = Number(requested);
        if (!Number.isFinite(quantity) || quantity <= 0 || !/^\d+(?:\.\d{1,3})?$/.test(requested)) throw new Error('Choose a positive quantity with at most three decimal places.');
        if (quantity > Number(product.quantity_available) || product.status !== 'available') throw new Error('The selected quantity is no longer available.');
        if (active) {
          setCart(previous => {
            const items = previous.items.filter(item => item.product_id !== product.product_id);
            return { checkout_key: crypto.randomUUID(), items: [...items, { ...product, quantity: String(quantity) }] };
          });
          setAdding(false);
          setParams({}, { replace: true });
        }
      } catch (error) { if (active) setMessage(error.message); }
      finally { if (active) setAdding(false); }
    }
    addProduct();
    return () => { active = false; };
  }, [productId, requested, setParams]);
  useEffect(() => { sessionStorage.setItem(key, JSON.stringify(cart)); }, [key, cart]);
  const farmers = new Set(cart.items.map(item => item.farmer_id));
  function update(productId, quantity) {
    setCreated([]);
    setCart(previous => ({ checkout_key: crypto.randomUUID(), items: previous.items.map(item => item.product_id === productId ? { ...item, quantity } : item) }));
  }
  async function placeOrder(event) {
    event.preventDefault();
    if (busy || !cart.items.length) return;
    setBusy(true); setMessage('');
    try {
      const response = await api.post('/orders', { split_by_farmer: true, checkout_key: cart.checkout_key, items: cart.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })) });
      setCreated(response.data.data.orders);
      setCart({ items: [], checkout_key: crypto.randomUUID() });
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <AccountShell><Panel title="Your cart" description="Each farmer receives a separate order. No payment is requested until that farmer confirms availability.">
    {adding && <p role="status">Adding your selected produce…</p>}
    {message && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{message}</p>}
    {created.length > 0 && <div role="status" className="space-y-3 rounded-2xl border border-green-200 bg-green-50 p-6"><h2 className="text-xl font-bold text-green-950">Orders sent to your farmers</h2><p>Order {created.map(order => `#${order.order_id}`).join(', ')}. You’ll be notified when payment becomes available.</p><Link className={button} to="/buyer/orders">View your orders</Link></div>}
    {cart.items.length > 0 ? <form onSubmit={placeOrder} className="space-y-5"><div className="divide-y rounded-2xl border bg-white">{cart.items.map(item => <article key={item.product_id} className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap justify-between gap-3"><div><a href={`/marketplace/${item.product_id}`} className="text-xl font-bold text-green-950 hover:underline">{item.product_name}</a><p className="mt-1 text-sm text-gray-600">{item.farm_name} · {money(item.price)} / {item.unit}</p></div><button className="text-sm font-semibold text-red-700" type="button" onClick={() => setCart(previous => ({ checkout_key: crypto.randomUUID(), items: previous.items.filter(row => row.product_id !== item.product_id) }))}>Remove</button></div><div className="flex flex-wrap items-end justify-between gap-4"><label className="block max-w-xs space-y-2 text-sm"><span>Quantity ({item.unit})</span><input className={input} type="number" min="0.001" step="0.001" max={item.quantity_available} required value={item.quantity} onChange={event => update(item.product_id, event.target.value)} /></label><p className="font-bold text-green-900">{money(Number(item.price) * Number(item.quantity))}</p></div></article>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl bg-green-950 p-6 text-white"><div><p className="text-sm text-green-100">{farmers.size} farmer{farmers.size === 1 ? '' : 's'} · {farmers.size} separate order{farmers.size === 1 ? '' : 's'}</p><p className="mt-1 text-2xl font-bold">Estimated total {money(cart.items.reduce((total, item) => total + Number(item.price) * Number(item.quantity), 0))}</p><p className="mt-2 text-xs text-green-100">Current prices and stock are checked on submission. Paystack requires a minimum total of KSh 3.00 per farmer.</p></div>
        {user.capabilities?.buyer ? <button disabled={busy || adding} className="rounded-lg bg-white px-5 py-3 font-bold text-green-950 disabled:opacity-50">{busy ? <Spinner label="Submitting" /> : 'Submit orders for confirmation'}</button> : <Link className="rounded-lg bg-white px-5 py-3 font-bold text-green-950" to="/profile?setup=buyer&next=%2Fcart">Complete buyer details to order</Link>}
      </div></form> : !adding && created.length === 0 && <div className="rounded-2xl border bg-white p-8"><h2 className="text-xl font-semibold">Your cart is ready for fresh produce</h2><p className="mt-2 text-sm text-gray-600">Choose products in the marketplace to get started.</p></div>}
    <a href="/marketplace" className={secondary}>Continue browsing produce</a>
  </Panel></AccountShell>;
}
