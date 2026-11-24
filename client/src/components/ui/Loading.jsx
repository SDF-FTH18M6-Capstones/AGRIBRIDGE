export function Spinner({ label = 'Loading', className = '' }) {
  return <span className={`loading-indicator ${className}`} role="status"><svg className="loading-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity=".2" /><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg><span className="sr-only">{label}</span></span>;
}

export function ContentSkeleton({ cards = 3, label = 'Loading content' }) {
  return <div role="status" aria-label={label} className="content-skeleton"><div className="skeleton h-5 w-40" /><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: cards }, (_, index) => <div key={index} className="skeleton-card"><div className="skeleton h-28 w-full" /><div className="skeleton mt-5 h-4 w-2/3" /><div className="skeleton mt-3 h-3 w-1/2" /></div>)}</div><span className="sr-only">{label}</span></div>;
}
