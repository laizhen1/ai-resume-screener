export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={`brand-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <rect width="48" height="48" rx="13" fill="currentColor" />
    <path d="M14 10.5h14l6 6V34a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V13.5a3 3 0 0 1 3-3Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
    <path d="M27 11v7h7M17 21h8M17 26h5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="32" cy="32" r="9" fill="currentColor" stroke="white" strokeWidth="2" />
    <path d="m28 32 2.7 2.7 5.3-5.4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function Brand() {
  return <span className="brand-lockup"><BrandMark /><span>Open <strong>Resume Lab</strong></span></span>;
}
