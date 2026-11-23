import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import useResource from './useResource';
import { AccountShell, Panel, Form, Status } from './UI';
import { button, secondary, safeNext, when } from './format';

function FarmerVerification({ farmer, refresh }) {
  const resource = useResource('/farmer-verifications/me', true);
  const active = resource.data?.some(row => ['pending', 'assigned', 'submitted'].includes(row.status));
  return <Panel title="Farm verification" resource={resource} description="An officer inspects your farm. An administrator reviews the report before selling access is enabled.">
    <div className="space-y-3">{resource.data?.map(row => <article key={row.verification_id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><Status value={row.status} /><time dateTime={row.created_at} className="text-xs text-gray-500">{when(row.created_at)}</time></div><p className="mt-3 text-sm">{row.farm_location}</p>{row.remarks && <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><strong>Feedback:</strong> {row.remarks}</p>}</article>)}</div>
    {!active && farmer.verification_status !== 'approved' && <Form label={resource.data?.length ? 'Submit verification again' : 'Submit for verification'} initial={{ farm_location: farmer.location }} fields={[{ name: 'farm_location', label: 'Farm location for inspection', maxLength: 500 }]} onSubmit={async values => { await api.post('/farmer-verifications', values); resource.reload(); refresh(); return 'Verification submitted. Track your progress here.'; }} />}
    {active && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Your verification is in progress. You can continue browsing and use your buyer profile while you wait.</p>}
  </Panel>;
}

export default function ProfileHub() {
  const resource = useResource('/profiles/me', true);
  const { updateUser, refreshUser } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next')) || safeNext(sessionStorage.getItem('agribridge_pending_checkout'));
  const data = resource.data;
  async function save(profileType, fields, values) {
    const payload = Object.fromEntries(fields.map(field => [field.name, values[field.name] || '']));
    const response = await api.put('/profiles/me', { ...payload, profile_type: profileType });
    updateUser(response.data.user);
    resource.reload();
    if (profileType === 'buyer') {
      sessionStorage.removeItem('agribridge_pending_checkout');
      navigate(next?.startsWith('/farmer') ? '/buyer' : next || '/buyer', { replace: true });
    }
    return profileType === 'farmer' ? response.data.user.capabilities.farmer ? 'Farm details saved. Your farm remains verified.' : 'Farm details saved. Submit your farm for verification below.' : 'Buyer profile activated.';
  }
  const buyerFields = [
    { name: 'buyer_type', label: 'I buy as', options: [{ value: 'individual', label: 'Individual / household' }, { value: 'retailer', label: 'Retailer' }, { value: 'wholesaler', label: 'Wholesaler' }, { value: 'restaurant', label: 'Restaurant / hotel' }] },
    { name: 'location', label: 'Location', minLength: 2, maxLength: 150 },
    { name: 'business_name', label: 'Business name (optional)', required: false, maxLength: 150 },
  ];
  const farmerFields = [{ name: 'farm_name', label: 'Farm name', minLength: 2, maxLength: 150 }, { name: 'location', label: 'Farm location', minLength: 2, maxLength: 150 }, { name: 'description', label: 'About your farm', type: 'textarea', wide: true, required: false }];
  return <AccountShell><Panel title="One account. Two ways to grow." resource={resource} description="Browse freely. Activate buying by completing your details, and unlock selling after farm verification.">
    {data && <>
      <div className="rounded-2xl bg-green-950 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-widest text-green-200">Your AgriBridge account</p><h2 className="mt-3 text-2xl font-bold">{data.full_name}</h2><p className="mt-2 text-sm text-green-100">{data.email} · {data.phone_number || 'No phone number provided'}</p><div className="mt-5 flex flex-wrap gap-4"><Link to="/account" className="text-sm font-semibold text-white underline underline-offset-4">Edit account details</Link><Link to="/issues" className="text-sm font-semibold text-white underline underline-offset-4">Resolution requests</Link>{next && <Link to={next} className="text-sm font-semibold text-white underline underline-offset-4">Return to your selected produce</Link>}</div></div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section id="buyer-profile" className="space-y-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-green-950">Buy produce</h2><Status value={data.buyer_profile ? 'approved' : 'pending'} label={data.buyer_profile ? 'Buying enabled' : 'Details needed'} /></div><p className="text-sm leading-relaxed text-gray-600">Complete these details to place orders. No administrator approval is needed.</p>
          {data.buyer_profile && <Link to="/buyer" className={button}>Open buyer dashboard</Link>}
          <Form key={`buyer-${data.buyer_profile?.buyer_id || 'new'}`} initial={data.buyer_profile || {}} fields={buyerFields} label={data.buyer_profile ? 'Save buyer details' : 'Enable purchasing'} onSubmit={values => save('buyer', buyerFields, values)} />
        </section>
        <section id="farmer-profile" className="space-y-5"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-green-950">Sell your harvest</h2><Status value={data.farmer_profile?.verification_status || 'pending'} label={data.farmer_profile?.verification_status === 'approved' ? 'Selling enabled' : data.farmer_profile?.verification_status || 'Farm details needed'} /></div><p className="text-sm leading-relaxed text-gray-600">Save your farm details, then request verification. Your farmer dashboard opens after approval.</p>
          {data.capabilities.farmer && <Link to="/farmer" className={button} onClick={event => { event.preventDefault(); refreshUser().then(() => navigate("/farmer")).catch(() => resource.reload()); }}>Open farmer dashboard</Link>}
          <Form key={`farmer-${data.farmer_profile?.farmer_id || 'new'}`} initial={data.farmer_profile || {}} fields={farmerFields} label="Save farm details" onSubmit={values => save('farmer', farmerFields, values)} />
          {data.farmer_profile?.verification_status === 'approved' && <p className="text-xs text-gray-500">Changing your farm name or location requires verification again.</p>}
        </section>
      </div>
      {data.farmer_profile && <FarmerVerification farmer={data.farmer_profile} refresh={resource.reload} />}
      <a href="/marketplace" className={secondary}>Continue browsing</a>
    </>}
  </Panel></AccountShell>;
}
