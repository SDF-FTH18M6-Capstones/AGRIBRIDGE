export default function Brand({ className = '', href = '/' }) {
  return <a href={href} className={`brand ${className}`} aria-label="AgriBridge home"><img src="/assets/brand/logo.webp" width="220" height="147" alt="AgriBridge — Connecting farmers and buyers" /></a>;
}
