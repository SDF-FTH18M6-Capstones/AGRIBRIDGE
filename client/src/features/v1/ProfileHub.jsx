import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useResource from './useResource';
import { AccountShell, Panel, Status } from './UI';
import { button, secondary, safeNext } from './format';
import ProfileEditor from './ProfileEditor';
import FarmVerification from './FarmVerification';

export default function ProfileHub() {
  const resource = useResource('/profiles/me', true);
  const { refreshUser } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next')) || safeNext(sessionStorage.getItem('agribridge_pending_checkout'));
  const data = resource.data;
  function saved(kind) {
    resource.reload();
    if (kind === 'buyer') { sessionStorage.removeItem('agribridge_pending_checkout'); navigate(next?.startsWith('/farmer') ? '/buyer' : next || '/buyer', { replace: true }); }
  }
  return <AccountShell><Panel title="One account. Two ways to grow." resource={resource} description="Browse freely. Complete buyer details to purchase, or submit farm evidence for officer inspection and administrator approval.">
    {data && <>
      <div className="rounded-2xl bg-green-950 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-green-200">Your AgriBridge account</p><h2 className="mt-3 text-2xl font-bold">{data.full_name}</h2><p className="mt-2 text-sm text-green-100">{data.email} · {data.phone_number || 'No phone number provided'}</p><div className="mt-5 flex flex-wrap gap-4"><Link to="/account" className="text-sm font-semibold underline underline-offset-4">Account details & tab sessions</Link><Link to="/issues" className="text-sm font-semibold underline underline-offset-4">Resolution requests</Link>{next && <Link to={next} className="text-sm font-semibold underline underline-offset-4">Return to your selected produce</Link>}</div></div>
      <div className="grid items-start gap-8 xl:grid-cols-2"><section id="buyer-profile" className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-green-950">Buy produce</h2><Status value={data.buyer_profile ? 'approved' : 'pending'} label={data.buyer_profile ? 'Buying enabled' : 'Details needed'} /></div><p className="text-sm text-gray-600">Complete your buyer details to purchase. No administrator approval is needed.</p>{data.buyer_profile && <Link to="/buyer" className={button}>Open buyer dashboard</Link>}<ProfileEditor key={`buyer-${data.user_id}`} kind="buyer" profile={data.buyer_profile} onSaved={saved} /></section>
      <section id="farmer-profile" className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-green-950">Sell your harvest</h2><Status value={data.farmer_profile?.verification_status || 'pending'} label={data.capabilities.farmer ? 'Selling enabled' : 'Farm details & verification'} /></div><p className="text-sm text-gray-600">You may save incomplete farm details. The map pin, directions, land evidence and photographs are required before verification submission.</p>{data.capabilities.farmer && <Link to="/farmer" className={button} onClick={event => { event.preventDefault(); refreshUser().then(() => navigate('/farmer')).catch(resource.reload); }}>Open farmer dashboard</Link>}<ProfileEditor key={`farmer-${data.user_id}-${data.farmer_profile?.farmer_id || 'new'}`} kind="farmer" profile={data.farmer_profile} onSaved={saved} />{data.capabilities.farmer && <p className="text-xs text-gray-500">Changing the farm name or location requires verification again.</p>}</section></div>
      {data.farmer_profile && <FarmVerification farmer={data.farmer_profile} refresh={resource.reload} />}<a href="/marketplace" className={secondary}>Continue browsing</a>
    </>}
  </Panel></AccountShell>;
}
