import { useEffect, useState } from 'react';

const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-green-700';
const button = 'inline-flex items-center justify-center rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800';
const money = value => `KSh ${Number(value).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

function ProductImage({ product, detail = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={`${detail ? 'aspect-[4/3]' : 'h-48'} overflow-hidden bg-green-50`}>
    {product.image_url && !failed ? <img src={product.image_url} alt={product.product_name} loading={detail ? 'eager' : 'lazy'} className="h-full w-full object-cover" onError={() => setFailed(true)} /> : <div className="flex h-full items-center justify-center p-5 text-center text-sm text-gray-500">No product image available</div>}
  </div>;
}

function Icon({ grid }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{grid ? <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> : <><path d="M8 5h13M8 12h13M8 19h13" /><path d="M3 5h1M3 12h1M3 19h1" /></>}</svg>;
}

function ProductCard({ product, list }) {
  return <article className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${list ? 'sm:grid sm:grid-cols-[220px_1fr]' : ''}`}>
    <a href={`/marketplace/${product.product_id}`} aria-label={`View ${product.product_name}`}><ProductImage product={product} /></a>
    <div className="flex flex-col items-start gap-3 p-5"><div className="flex w-full flex-wrap items-start justify-between gap-2"><h2 className="text-xl font-bold text-green-950"><a href={`/marketplace/${product.product_id}`} className="hover:underline">{product.product_name}</a></h2>{product.verification_status === 'approved' && <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">Verified farmer</span>}</div><p className="text-lg font-bold text-green-800">{money(product.price)} / {product.unit}</p><p className="text-sm text-gray-600">{product.quantity_available} {product.unit} available · {product.farmer_location}</p><p className="text-sm text-gray-600">{product.farm_name}</p><a href={`/marketplace/${product.product_id}`} className="mt-auto font-semibold text-green-800 underline underline-offset-4">View product</a></div>
  </article>;
}

function AccountNavigation() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let active = true;
    const token = sessionStorage.getItem('agribridge_auth_token');
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/profiles/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (active && result) setUser(result.data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return <div className="flex flex-wrap gap-5 text-sm font-semibold"><a href="/marketplace" className="text-green-800">Marketplace</a><a href="/cart">Cart</a>{user ? <><a href="/profile">Profile</a>{user.capabilities?.buyer && <a href="/buyer">Buyer dashboard</a>}{user.capabilities?.farmer && <a href="/farmer">Farmer dashboard</a>}{user.capabilities?.admin && <a href="/admin">Admin dashboard</a>}{user.capabilities?.['field-officer'] && <a href="/field-officer">Inspections</a>}</> : <><a href="/login">Login</a><a href="/register">Create account</a></>}</div>;
}

function ProductDetail({ product }) {
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = product.verification_status === 'approved' && product.status === 'available' && Number(product.quantity_available) > 0;
  async function save() {
    setBusy(true); setMessage('');
    try {
      const token = sessionStorage.getItem('agribridge_auth_token');
      if (!token) { window.location.assign(`/login?next=${encodeURIComponent(`/marketplace/${product.product_id}`)}`); return; }
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/saved-products`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: product.product_id }) });
      const result = await response.json();
      if (response.status === 403) { window.location.assign(`/profile?setup=buyer&next=${encodeURIComponent(`/marketplace/${product.product_id}`)}`); return; }
      if (!response.ok) throw new Error(result.error?.message || 'Unable to save product.');
      setMessage('Product saved to your account.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <><a className="inline-block text-green-800 underline" href="/marketplace">Back to produce</a><article className="mt-6 grid overflow-hidden rounded-2xl border bg-white lg:grid-cols-2"><ProductImage product={product} detail /><div className="space-y-5 p-6 sm:p-9"><p className="text-sm font-semibold uppercase tracking-wider text-green-700">{product.category_name}</p><h1 className="text-3xl font-bold text-green-950 sm:text-4xl">{product.product_name}</h1><p className="text-2xl font-bold text-green-800">{money(product.price)} / {product.unit}</p><p className="whitespace-pre-line text-gray-600">{product.description || 'Contact this farmer through your order for more details.'}</p><dl className="grid grid-cols-2 gap-3 text-sm"><dt>Farm</dt><dd>{product.farm_name}</dd><dt>Location</dt><dd>{product.farmer_location}</dd><dt>Stock</dt><dd>{product.quantity_available} {product.unit}</dd><dt>Verification</dt><dd>{product.verification_status === 'approved' ? 'Verified farmer' : 'Pending'}</dd><dt>Available from</dt><dd>{product.availability_date || 'Now'}</dd><dt>Status</dt><dd>{product.status.replaceAll('_', ' ')}</dd></dl><form method="get" action="/cart" className="space-y-4"><input type="hidden" name="product" value={product.product_id} /><label className="block max-w-xs space-y-2"><span className="text-sm font-semibold">Quantity ({product.unit})</span><input className={field} name="quantity" type="number" min="0.001" step="0.001" max={product.quantity_available} required value={quantity} onChange={e => setQuantity(e.target.value)} /></label><div className="flex flex-wrap gap-3"><button disabled={!ready} className={`${button} disabled:opacity-50`}>{ready ? 'Add to cart' : 'Currently unavailable'}</button><button className="rounded-lg border px-5 py-3 text-sm font-semibold" type="button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div></form><p role="status" className="text-sm text-green-900">{message}</p></div></article></>;
}

export default function ProductPages({ product, products = [], categories = [], pagination = {}, query = {}, error, notFound = false }) {
  const list = query.view === 'list';
  function href(changes) {
    const params = new URLSearchParams(query);
    Object.entries(changes).forEach(([key, value]) => params.set(key, String(value)));
    return `/marketplace?${params}`;
  }
  return <div className="min-h-screen bg-[#f7faf6] text-gray-900"><header className="border-b bg-white"><nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><a href="/" className="text-2xl font-extrabold tracking-tight text-green-900">AgriBridge</a><AccountNavigation /></nav></header><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
    {notFound ? <section className="py-16"><h1 className="text-3xl font-bold text-green-950">Product not found</h1><p className="my-4">This product may have been removed.</p><a href="/marketplace" className={button}>Browse produce</a></section> : error ? <section role="alert" className="rounded-xl border border-red-200 bg-white p-8"><h1 className="text-2xl font-bold">Unable to load products</h1><p className="my-4">{error}</p><a href="/marketplace" className={button}>Try again</a></section> : product ? <ProductDetail product={product} /> : <>
      <p className="text-sm font-semibold uppercase tracking-widest text-green-700">Direct from the farm</p><h1 className="mt-3 text-3xl font-bold text-green-950 sm:text-5xl">Fresh produce. Real connections.</h1><p className="mt-4 max-w-2xl text-gray-600">Discover agricultural produce from farmers across Kenya.</p>
      <form action="/marketplace" method="get" className="my-8 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4"><input type="hidden" name="view" value={query.view || 'grid'} /><label className="space-y-2 text-sm"><span>Search produce</span><input className={field} name="q" defaultValue={query.q || ''} placeholder="Produce or description" /></label><label className="space-y-2 text-sm"><span>Category</span><select className={field} name="category_id" defaultValue={query.category_id || ''}><option value="">All categories</option>{categories.map(category => <option key={category.category_id} value={category.category_id}>{category.category_name}</option>)}</select></label><label className="space-y-2 text-sm"><span>Location</span><input name="county" defaultValue={query.county || ''} className={field} placeholder="County or town" /></label><label className="space-y-2 text-sm"><span>Sort by</span><select className={field} name="sort" defaultValue={query.sort || 'default'}><option value="default">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest listings</option></select></label><label className="space-y-2 text-sm"><span>Minimum price</span><input type="number" name="min_price" min="0" step="0.01" className={field} defaultValue={query.min_price || ''} /></label><label className="space-y-2 text-sm"><span>Maximum price</span><input type="number" name="max_price" min="0" step="0.01" className={field} defaultValue={query.max_price || ''} /></label><label className="space-y-2 text-sm"><span>Minimum stock</span><input type="number" name="minimum_quantity" min="0" step="0.001" className={field} defaultValue={query.minimum_quantity || ''} /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-green-800" name="verified" value="true" defaultChecked={query.verified === 'true'} />Verified farmers only</label><div className="flex items-center gap-5"><button className={button}>Apply filters</button><a className="text-sm text-green-800 underline" href="/marketplace">Reset</a></div></form>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><p role="status" className="text-sm text-gray-600">{pagination.total_items || 0} products found</p><nav aria-label="Product view" className="flex gap-2">{['grid', 'list'].map(view => <a key={view} href={href({ view })} aria-current={(list ? view === 'list' : view === 'grid') ? 'true' : undefined} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${(list ? view === 'list' : view === 'grid') ? 'border-green-800 bg-green-800 text-white' : 'bg-white text-green-900'}`}><Icon grid={view === 'grid'} />{view === 'grid' ? 'Grid' : 'List'}</a>)}</nav></div>
      {products.length ? <div className={list ? 'grid gap-5' : 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'}>{products.map(item => <ProductCard key={item.product_id} product={item} list={list} />)}</div> : <div className="rounded-xl border bg-white p-10 text-center"><h2 className="text-xl font-semibold">No products found</h2><p className="mt-3 text-gray-600">Try adjusting your search or filters.</p><a href="/marketplace" className="mt-5 inline-block text-green-800 underline">Clear filters</a></div>}
      {pagination.total_pages > 1 && <nav aria-label="Product pagination" className="mt-8 flex flex-wrap justify-center gap-3">{pagination.has_previous && <a className={button} href={href({ page: pagination.page - 1 })}>Previous</a>}<span className="px-3 py-3 text-sm">Page {pagination.page} of {pagination.total_pages}</span>{pagination.has_next && <a className={button} href={href({ page: pagination.page + 1 })}>Next</a>}</nav>}
    </>}
  </main><footer className="mx-auto max-w-7xl border-t px-4 py-8 text-sm text-gray-600 sm:px-6">AgriBridge · Connecting farmers and buyers across Kenya.</footer></div>;
}
