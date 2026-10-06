/**
 * Canonical Qwizo logo — renders the OFFICIAL brand-kit SVG assets directly.
 *
 * Source of truth: `frontend/public/brand/` (copied verbatim from the
 * supplied Qwizo Brand Kit). Never recreate, redraw, or reinterpret the Arc.
 *
 * - `variant="full"` — Arc + Qwizo wordmark lockup
 * - `variant="mark"` — standalone Arc mark
 * - `tone="light"` — for light backgrounds
 * - `tone="dark"` — for dark backgrounds
 * - `tone="mono-black"` / `tone="mono-white"` — one-color versions
 * - `badge` — official lime app-icon badge + Qwizo wordmark (navbar treatment)
 */

export type QwizoLogoVariant = 'full' | 'mark';
export type QwizoLogoTone = 'light' | 'dark' | 'mono-black' | 'mono-white';

const FULL_SRC: Record<QwizoLogoTone, string> = {
  light: '/brand/qwizo-logo-light.svg',
  dark: '/brand/qwizo-logo-dark.svg',
  'mono-black': '/brand/qwizo-logo-monochrome.svg',
  'mono-white': '/brand/qwizo-logo-reverse.svg',
};

const MARK_SRC: Record<QwizoLogoTone, string> = {
  light: '/brand/qwizo-mark.svg',
  dark: '/brand/qwizo-mark-dark.svg',
  'mono-black': '/brand/qwizo-mark-monochrome.svg',
  'mono-white': '/brand/qwizo-mark-reverse.svg',
};

/** Standalone Arc mark — official asset, never redrawn. */
export function QwizoMark({
  size = 32,
  tone = 'light',
  label = 'Qwizo',
}: {
  size?: number;
  tone?: QwizoLogoTone;
  label?: string;
}) {
  return (
    <img
      src={MARK_SRC[tone]}
      alt={label}
      width={size}
      height={size}
      style={{ display: 'block', flex: 'none' }}
      draggable={false}
    />
  );
}

export function QwizoLogo({
  variant = 'full',
  tone = 'light',
  markSize = 30,
  badge = false,
  badgeSize = 38,
  className = '',
}: {
  variant?: QwizoLogoVariant;
  tone?: QwizoLogoTone;
  /** Rendered height in px (aspect ratio preserved by the SVG). */
  markSize?: number;
  /** Navbar treatment: official lime app-icon badge + Qwizo wordmark. */
  badge?: boolean;
  /** Badge size in px (only when badge is true). */
  badgeSize?: number;
  className?: string;
}) {
  if (badge) {
    return (
      <span className={`qwizo-logo inline-flex items-center ${className}`} style={{ gap: 9 }}>
        <span className="qwizo-logo-badge" style={{ width: badgeSize, height: badgeSize }}>
          <img
            src="/brand/qwizo-app-icon.svg"
            alt=""
            width={badgeSize}
            height={badgeSize}
            style={{ display: 'block', width: '100%', height: '100%' }}
            draggable={false}
          />
        </span>
        <span
          aria-hidden="true"
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: '#0F172A',
          }}
        >
          Qwizo
        </span>
      </span>
    );
  }
  if (variant === 'mark') {
    return <QwizoMark size={markSize} tone={tone} />;
  }
  // Official lockup is 560x150; set both dimensions so the aspect holds.
  const w = Math.round((markSize * 560) / 150);
  return (
    <img
      src={FULL_SRC[tone]}
      alt="Qwizo"
      width={w}
      height={markSize}
      className={className}
      style={{ display: 'block', flex: 'none' }}
      draggable={false}
    />
  );
}
