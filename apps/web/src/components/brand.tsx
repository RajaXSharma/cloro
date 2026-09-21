/**
 * The GitHub mark, from the Simple Icons path data. lucide dropped brand glyphs,
 * and this is an official logo rather than an icon we would be drawing ourselves.
 */
export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/**
 * Cloro's mark: a terminal chevron on a tile with a presence dot, so the glyph
 * reads as "shared editing session" rather than as a generic bracket logo.
 *
 * The mark is the one hand-drawn vector in the app. Icons come from lucide; this
 * is a brand mark, which no icon library can supply.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="6"
        fill="var(--primary)"
        fillOpacity="0.14"
        stroke="var(--primary)"
        strokeOpacity="0.5"
      />
      <path
        d="M8.5 8.75 11.75 12 8.5 15.25"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.75 15.5h3"
        stroke="var(--foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <circle cx="17.5" cy="6.5" r="2.25" fill="var(--foreground)" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName = "size-5",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Mark className={`${markClassName} shrink-0`} />
      <span className="text-sm font-semibold tracking-tight">cloro</span>
    </span>
  );
}
