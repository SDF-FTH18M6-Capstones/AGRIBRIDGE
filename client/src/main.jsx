import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';

async function start() {
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
  createRoot(root).render(<React.StrictMode><Provider store={store}><AuthProvider><RouterProvider router={router} /></AuthProvider></Provider></React.StrictMode>);
}
start();
