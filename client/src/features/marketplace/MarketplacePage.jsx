import { Spinner } from '../../components/ui/Loading';
import { useEffect } from 'react';
export default function MarketplacePage() {
  useEffect(() => { window.location.replace(window.location.pathname + window.location.search); }, []);
  return <div className="p-8"><Spinner label="Opening marketplace" /></div>;
}
