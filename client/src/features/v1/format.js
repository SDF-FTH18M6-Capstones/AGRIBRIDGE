export const button = 'inline-flex items-center justify-center rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50';
export const secondary = 'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 disabled:opacity-50';
export const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-green-700';
export const money = value => `KSh ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
export const when = value => value ? new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const labels = { pending: 'Awaiting farmer confirmation', confirmed: 'Awaiting payment', processing: 'Payment processing', paid: 'Paid · awaiting receipt confirmation', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected', expired: 'Expired', suspended: 'Suspended' };
export function safeNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  // Reject control characters and backslashes before URL normalization.
  if ([...value].some(character => character.charCodeAt(0) < 32 || [92, 127].includes(character.charCodeAt(0)))) return null;
  try {
    const parsed = new URL(value, 'https://agribridge.invalid');
    if (parsed.origin !== 'https://agribridge.invalid' || !/^\/(?:cart|buyer|farmer|marketplace|profile|account|notifications|issues|admin|field-officer)(?:[/?#]|$)/.test(parsed.pathname)) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch { return null; }
}

export function paymentStatusLabel(payment) {
  if (payment.payment_status === 'pending') {
    if (payment.provider_reference_unknown) return 'Needs review';
    return payment.provider_started ? 'Payment processing' : 'Not started';
  }
  return { paid: 'Paid', failed: 'Failed', refunded: 'Refunded' }[payment.payment_status] || 'Unknown payment status';
}
