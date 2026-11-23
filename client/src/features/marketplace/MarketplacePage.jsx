import { useEffect } from 'react';
export default function MarketplacePage() {
  useEffect(() => { window.location.replace(window.location.pathname + window.location.search); }, []);
  return <p className="p-8" role="status">Opening marketplace…</p>;
}
