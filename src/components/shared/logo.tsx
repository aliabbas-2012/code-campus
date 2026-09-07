interface LogoProps {
  label?: string;
  className?: string;
  size?: 'md' | 'lg';
}

/** Brand mark: a rounded indigo badge with a code-bracket glyph, paired with the wordmark. */
export function Logo({ label = 'Code Campus', className = '', size = 'md' }: LogoProps): React.ReactNode {
  const badge = size === 'lg' ? 44 : 28;
  const text = size === 'lg' ? 'text-2xl' : 'text-base';

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={badge}
        height={badge}
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="8" fill="url(#logo-gradient)" />
        <path
          d="M11 9.5L7 14l4 4.5M17 9.5l4 4.5-4 4.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
      </svg>
      <span className={`${text} font-semibold tracking-tight text-gray-900 dark:text-gray-100`}>{label}</span>
    </span>
  );
}
