// The app's utility icon set — 16px, 1.6 stroke, currentColor, matching
// NavIcon's voice. One file so every surface draws the same glyphs.

const PATHS: Record<string, React.ReactNode> = {
  edit: (
    <>
      <path d="M11.3 2.7a1.7 1.7 0 0 1 2.4 2.4L5.4 13.4l-3.1.7.7-3.1 8.3-8.3Z" />
    </>
  ),
  archive: (
    <>
      <rect x="1.8" y="2.5" width="12.4" height="3.2" rx="0.8" />
      <path d="M3 5.7v6.8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.7M6.4 8.6h3.2" />
    </>
  ),
  restore: (
    <>
      <path d="M2.2 6.5a6 6 0 1 1 1.4 4.3M2.2 6.5V2.9m0 3.6h3.6" />
    </>
  ),
  plus: <path d="M8 3v10M3 8h10" />,
  x: <path d="M4 4l8 8M12 4l-8 8" />,
  check: <path d="M2.8 8.6l3.4 3.4 7-7.6" />,
  search: (
    <>
      <circle cx="7" cy="7" r="4.4" />
      <path d="M10.4 10.4 14 14" />
    </>
  ),
  "chevron-down": <path d="M3.5 6l4.5 4.5L12.5 6" />,
  "chevron-right": <path d="M6 3.5L10.5 8 6 12.5" />,
  "chevron-left": <path d="M10 3.5L5.5 8 10 12.5" />,
  calendar: (
    <>
      <rect x="2" y="3.2" width="12" height="10.8" rx="1.2" />
      <path d="M2 6.6h12M5.4 1.6v3.2M10.6 1.6v3.2" />
    </>
  ),
  command: (
    <path d="M6 6H4.5a1.75 1.75 0 1 1 1.75-1.75V6Zm0 0h4m-4 0v4m4-4h1.5a1.75 1.75 0 1 0-1.75-1.75V6Zm0 4H6m4 0v1.5a1.75 1.75 0 1 0 1.75-1.75H10Zm-4 0v1.5A1.75 1.75 0 1 1 4.25 9.75H6Z" />
  ),
  panel: (
    <>
      <rect x="1.8" y="2.5" width="12.4" height="11" rx="1.2" />
      <path d="M6 2.5v11" />
    </>
  ),
  inbox: (
    <>
      <path d="M1.8 9.2h3.4l1 1.8h3.6l1-1.8h3.4" />
      <path d="M3 3.5h10l1.2 5.7v3.3a1 1 0 0 1-1 1H2.8a1 1 0 0 1-1-1V9.2L3 3.5Z" />
    </>
  ),
  spark: <path d="M8 1.8 6.6 6.6 1.8 8l4.8 1.4L8 14.2l1.4-4.8L14.2 8 9.4 6.6 8 1.8Z" />,
};

export type IconName = keyof typeof PATHS & string;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
