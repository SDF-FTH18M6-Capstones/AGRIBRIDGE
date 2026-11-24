import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const arg = name => process.argv[process.argv.indexOf(name) + 1];
const port = Number(process.env.PORT || (process.argv.includes('--port') ? arg('--port') : 5173));
const host = process.env.HOST || (process.argv.includes('--host') ? arg('--host') : '127.0.0.1');
const backend = (process.env.SSR_API_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
const publicOrigin = process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
const staticRoot = path.join(root, production ? 'dist/client' : 'public');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let vite;

async function api(endpoint) {
  const response = await fetch(`${backend}${endpoint}`, { signal: AbortSignal.timeout(12000), headers: { Accept: 'application/json' } });
  let payload;
  try { payload = await response.json(); }
  catch { throw Object.assign(new Error('The product service returned an invalid response.'), { status: 502 }); }
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || payload.message || 'Unable to load products.'), { status: response.status });
  return payload;
}

let categoryRequest;
let categoryCache;
async function publicCategories() {
  if (categoryCache && Date.now() - categoryCache.at < 30000) return categoryCache.data;
  if (!categoryRequest) categoryRequest = api('/categories/').then(data => { categoryCache = { data, at: Date.now() }; return data; }).finally(() => { categoryRequest = null; });
  return categoryRequest;
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const target = new URL(`${backend}${url.pathname.slice(4)}${url.search}`);
    const client = target.protocol === 'https:' ? https : http;
    const proxy = client.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, upstream => { res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res); });
    const uploadRequest = req.method === 'POST' && (url.pathname === '/api/media' || /\/products\/\d+\/images$/.test(url.pathname));
    proxy.setTimeout(uploadRequest ? 120000 : 20000, () => proxy.destroy(new Error('Backend timeout')));
    proxy.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'The API is unavailable. Please try again.' } })); });
    req.pipe(proxy); return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    if (production || !url.pathname.startsWith('/marketplace')) {
      const filename = path.resolve(staticRoot, `.${decodeURIComponent(url.pathname)}`);
      if (filename.startsWith(staticRoot + path.sep)) {
        try {
          const stat = await fs.stat(filename);
          if (stat.isFile()) {
            const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
            res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': filename.includes('/assets/') && /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(filename) ? 'public,max-age=31536000,immutable' : 'public,max-age=3600' });
            res.end(req.method === 'HEAD' ? undefined : await fs.readFile(filename)); return;
          }
        } catch { /* Route through the HTML handler. */ }
      }
    }
    const productRoute = /^\/marketplace(?:\/([^/]+))?\/?$/.exec(url.pathname);
    let props; let appHtml = ''; let status = 200; let title = 'AgriBridge — Farmers & buyers'; let description = 'Connect with farmers and discover agricultural produce across Kenya.'; let structured = '';
    if (productRoute) {
      props = { query: Object.fromEntries(url.searchParams) };
      try {
        if (productRoute[1]) {
          if (!/^\d+$/.test(productRoute[1])) throw Object.assign(new Error('Product not found'), { status: 404 });
          props.product = (await api(`/products/${productRoute[1]}`)).data;
          title = `${props.product.product_name} | AgriBridge`;
          description = (props.product.description || `${props.product.product_name} from ${props.product.farm_name}`).slice(0, 160);
          structured = `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@type': 'Product', name: props.product.product_name, description, ...(props.product.image_url ? { image: props.product.image_url } : {}), offers: { '@type': 'Offer', priceCurrency: 'KES', price: props.product.price, url: `${publicOrigin}/marketplace/${props.product.product_id}`, availability: props.product.status === 'available' && Number(props.product.quantity_available) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } })}</script>`;
        } else {
          const query = new URLSearchParams({ availability: 'available', per_page: '12' });
          const keys = { q: 'search', county: 'location', category_id: 'category_id', min_price: 'min_price', max_price: 'max_price', minimum_quantity: 'minimum_quantity', verified: 'verified', sort: 'sort', page: 'page' };
          for (const [from, to] of Object.entries(keys)) if (url.searchParams.get(from)) query.set(to, url.searchParams.get(from));
          let categories, result;
          if (url.searchParams.get('category') && !url.searchParams.get('category_id')) {
            categories = await publicCategories();
            const found = categories.data.find(c => c.category_name === url.searchParams.get('category'));
            if (found) { query.set('category_id', found.category_id); props.query.category_id = String(found.category_id); }
            result = await api(`/products/search?${query}`);
          } else {
            [result, categories] = await Promise.all([api(`/products/search?${query}`), publicCategories()]);
          }
          props.products = result.data; props.pagination = result.pagination; props.categories = categories.data;
          title = 'Farm fresh produce | AgriBridge Marketplace';
        }
      } catch (error) {
        status = error.status === 404 ? 404 : error.status === 400 ? 400 : 503;
        props.notFound = status === 404; props.error = status === 404 ? undefined : (status === 400 ? error.message : 'The product service is temporarily unavailable. Please try again.');
        title = props.notFound ? 'Product not found | AgriBridge' : 'Products unavailable | AgriBridge';
      }
      const renderer = production ? await import('./dist/server/entry-server.js') : await vite.ssrLoadModule('/src/entry-server.jsx');
      appHtml = renderer.render(props);
    }
    let template = await fs.readFile(path.join(root, production ? 'dist/client/index.html' : 'index.html'), 'utf8');
    if (!production) template = await vite.transformIndexHtml(req.url, template);
    template = template.replace('<div id="root"></div>', () => `<div id="root">${appHtml}</div>${props ? `<script>window.__PRODUCT_PAGE__=${json(props)}</script>` : ''}`)
      .replace(/<title>.*?<\/title>/, () => `<title>${escape(title)}</title>`)
      .replace('</head>', () => `<meta name="description" content="${escape(description)}"/><link rel="canonical" href="${escape(publicOrigin + url.pathname)}"/>${structured}</head>`);
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : template);
  } catch (error) {
    if (vite) vite.ssrFixStacktrace(error);
    console.error('Unable to render page:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end('Unable to render this page. Please try again.');
  }
}
const server = http.createServer((req, res) => {
  if (vite && !req.url.startsWith('/api/') && !req.url.startsWith('/marketplace')) vite.middlewares(req, res, () => handle(req, res));
  else handle(req, res);
});
if (!production) {
  const { createServer } = await import('vite');
  vite = await createServer({ root, server: { middlewareMode: true, hmr: { server } }, appType: 'custom' });
}
server.listen(port, host, () => console.log(`AgriBridge: http://${host}:${port}`));
