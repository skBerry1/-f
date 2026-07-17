type IconProps = { className?: string };

export function StarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5l2.9 6.05 6.6.86-4.85 4.6 1.23 6.54L12 17.4l-5.88 3.15 1.23-6.54L2.5 9.41l6.6-.86L12 2.5z" />
    </svg>
  );
}

export function CatalogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  );
}

export function BagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M5 8h14l-1.2 11a2 2 0 01-2 1.8H8.2a2 2 0 01-2-1.8L5 8z" />
      <path d="M9 10V6a3 3 0 016 0v4" />
    </svg>
  );
}

export function MarketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M4 10l1-5h14l1 5" />
      <path d="M4 10a2.4 2.4 0 004.8 0A2.4 2.4 0 0013.6 10a2.4 2.4 0 004.8 0A2.4 2.4 0 0023 10" transform="scale(0.87) translate(1.7 0)" />
      <path d="M5.5 12.5V20h13v-7.5" />
      <path d="M9.5 20v-4.5h5V20" />
    </svg>
  );
}

export function CaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3.5" y="8" width="17" height="12" rx="2" />
      <path d="M3.5 12h17" />
      <path d="M12 8v12" />
      <path d="M12 8s-4.5-.3-4.5-2.7C7.5 3.9 9 3.2 10.2 4c1 .7 1.8 4 1.8 4zm0 0s4.5-.3 4.5-2.7C16.5 3.9 15 3.2 13.8 4c-1 .7-1.8 4-1.8 4z" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.2c1.4-3.2 4.2-4.8 7.5-4.8s6.1 1.6 7.5 4.8" />
    </svg>
  );
}
