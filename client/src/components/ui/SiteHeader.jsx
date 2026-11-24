import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/auth-context';
import Brand from './Brand';

export default function SiteHeader() {
  const auth = useContext(AuthContext);
  const [account, setAccount] = useState(null);
  const [open, setOpen] = useState(false);
  // Public product pages are hydrated without the application AuthProvider.
  useEffect(() => {
    if (auth || !sessionStorage.getItem('agribridge_auth_token')) return;
    let active = true;
    import('../../services/api').then(({ default: api }) => api.get('/profiles/me'))
      .then(response => { if (active) setAccount(response.data.data); }).catch(() => {});
    return () => { active = false; };
  }, [auth]);
  const user = auth?.user || account;
  const dashboard = user?.capabilities?.admin ? '/admin' : user?.capabilities?.['field-officer'] ? '/field-officer' : user?.capabilities?.farmer ? '/farmer' : user?.capabilities?.buyer ? '/buyer' : '/profile';
  return <header className="site-header"><a href="#main-content" className="skip-link">Skip to content</a><nav className="site-nav page-width" aria-label="Main navigation"><Brand /><button className="mobile-menu-button" type="button" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close navigation' : 'Open navigation'}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg></button><div id="public-navigation" className={`public-navigation ${open ? 'is-open' : ''}`}><div className="site-links"><a href="/">Home</a><a href="/marketplace">Marketplace</a><a href="/about">About us</a></div><div className="site-actions">{user ? <><a href="/cart" className="nav-cart">Cart</a><a href={dashboard} className="btn btn-secondary">Dashboard</a><a href="/profile" className="btn btn-primary">My account</a></> : <><a href="/login" className="btn btn-secondary">Login</a><a href="/register" className="btn btn-primary">Sign up <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" /></svg></a></>}</div></div></nav></header>;
}
