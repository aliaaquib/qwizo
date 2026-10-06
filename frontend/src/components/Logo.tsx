// Qwizo custom logo — lime rounded square, ink Q whose tail becomes a check.
// The check nods to quizzes: the correct answer.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Qwizo logo"
      role="img"
    >
      <rect width="40" height="40" rx="11" fill="#E2EB5D" />
      {/* Q bowl — full circle */}
      <circle cx="18" cy="18" r="9" stroke="#444348" strokeWidth="4" />
      {/* tail resolving into a check — starts on the bowl's edge */}
      <path
        d="M23.5 23.5 L27.5 27.5 L33.5 19.5"
        stroke="#444348"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ markSize = 30 }: { markSize?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={markSize} />
      <span className="text-[19px] font-semibold tracking-tight">Qwizo</span>
    </span>
  );
}
