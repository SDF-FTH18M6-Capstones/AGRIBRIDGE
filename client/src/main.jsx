import React, { Suspense } from 'react';
import { ContentSkeleton } from './components/ui/Loading';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';

async function start() {
  const { prepareTab } = await import('./services/tabSession');
  await prepareTab();
  const root = document.getElementById('root');
  if (window.__PRODUCT_PAGE__) {
    const { default: ProductPages } = await import('./features/marketplace/ProductPages');
    hydrateRoot(root, <ProductPages {...window.__PRODUCT_PAGE__} />);
    return;
  }
  const [{ Provider }, { RouterProvider }, { default: router }, { AuthProvider }, { default: store }] = await Promise.all([
    import('react-redux'), import('react-router-dom'), import('./app/router.jsx'),
    import('./context/AuthContext.jsx'), import('./store/store.js'),
  ]);
  createRoot(root).render(<React.StrictMode><Provider store={store}><AuthProvider><Suspense fallback={<div className="page-width py-10"><ContentSkeleton label="Loading page" /></div>}><RouterProvider router={router} /></Suspense></AuthProvider></Provider></React.StrictMode>);
}
start().catch(() => {
  createRoot(document.getElementById('root')).render(<main className="page-width py-16"><h1 className="text-2xl font-bold">Unable to open AgriBridge</h1><p className="my-4 text-gray-600">Check your connection and try loading the page again.</p><button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button></main>);
});
