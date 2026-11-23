import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { button, input, secondary, labels } from './format';

export function AccountShell({ children }) {
  const { user, logout } = useAuth();
  return <div className="min-h-screen bg-[#f7faf6] text-gray-900">
    <header className="border-b bg-white"><nav aria-label="Account navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <a href="/marketplace" className="text-2xl font-extrabold tracking-tight text-green-900">AgriBridge</a>
      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold"><a href="/marketplace">Marketplace</a><Link to="/cart">Cart</Link><Link to="/profile">Profile</Link>
        {user?.capabilities?.buyer && <Link to="/buyer">Buyer dashboard</Link>}
        {user?.capabilities?.farmer && <Link to="/farmer">Farmer dashboard</Link>}
        {user?.capabilities?.admin && <Link to="/admin">Admin dashboard</Link>}
        {user?.capabilities?.["field-officer"] && <Link to="/field-officer">Inspections</Link>}
        <Link to="/notifications">Notifications</Link><button className="text-red-700" onClick={logout}>Logout</button>
      </div>
    </nav></header><main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
  </div>;
}

export function Panel({ title, children, resource, description }) {
  return <section className="space-y-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-green-950">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{description}</p>}</div>{resource && <button className={secondary} onClick={resource.reload}>Refresh</button>}</div>
    {resource?.loading && <p role="status" className="rounded-xl border bg-white p-6">Loading…</p>}
    {resource?.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{resource.error}</p>}
    {!resource?.loading && children}
  </section>;
}

export function Status({ value, label }) {
  const tone = ['completed', 'approved', 'paid', 'resolved'].includes(value) ? 'bg-green-100 text-green-900' : ['failed', 'rejected', 'suspended'].includes(value) ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900';
  return <span className={`inline-flex self-start items-center rounded-md px-2.5 py-1 text-xs font-semibold ${tone}`}>{label || labels[value] || value}</span>;
}

export function Form({ fields, initial = {}, onSubmit, label = 'Save', success = 'Saved successfully.', disabled = false }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setResult(null);
    try { const message = await onSubmit(values); setResult({ ok: true, message: message || success }); }
    catch (error) { setResult({ ok: false, message: error.message || 'Unable to save. Please try again.' }); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.name} className={`block space-y-2 text-sm font-medium ${field.wide ? 'sm:col-span-2' : ''}`}>
    <span>{field.label}</span>
    {field.options ? <select className={input} required={field.required !== false} value={values[field.name] ?? ''} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))}><option value="">Select…</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : field.type === 'checkbox' ? <input type="checkbox" className="ml-3 h-4 w-4 accent-green-800" required={field.required === true} checked={Boolean(values[field.name])} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.checked }))} />
      : field.type === 'textarea' ? <textarea className={input} rows={3} required={field.required !== false} maxLength={field.maxLength || 2000} value={values[field.name] ?? ''} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} />
      : <input className={input} type={field.type || 'text'} required={field.required !== false} min={field.min} max={field.max} step={field.step} minLength={field.minLength} maxLength={field.maxLength || 200} value={values[field.name] ?? ''} onChange={event => setValues(previous => ({ ...previous, [field.name]: event.target.value }))} />}
    {field.hint && <span className="block text-xs font-normal text-gray-500">{field.hint}</span>}
  </label>)}</div><button disabled={busy || disabled} className={button}>{busy ? 'Saving…' : label}</button>{result && <p role={result.ok ? 'status' : 'alert'} className={`rounded-lg p-3 text-sm ${result.ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-800'}`}>{result.message}</p>}</form>;
}
