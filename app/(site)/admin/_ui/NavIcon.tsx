// 16px geometric line icons, stroke-only, inheriting currentColor. Geometry
// lives here rather than in config/adminNav.ts — config names screens, it does
// not draw them. Ported from the Hub's sidebar, extended for the screens the
// Control Room brought over.

const PATHS: Record<string, React.ReactNode> = {
  today: (<><circle cx="8" cy="8" r="5.8" /><path d="M8 8 L10.8 5.4" /></>),
  pages: (<><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M2.5 6h11" /></>),
  experiments: (<><path d="M6.2 2v4.2L3 12.2a1 1 0 0 0 .9 1.5h8.2a1 1 0 0 0 .9-1.5L9.8 6.2V2" /><path d="M5.2 2h5.6M4.9 9.6h6.2" /></>),
  leads: (<><circle cx="8" cy="5.2" r="2.5" /><path d="M3.2 13.5C3.2 10.9 5.3 9.6 8 9.6s4.8 1.3 4.8 3.9" /></>),
  attribution: <path d="M1.5 8.5h2.6L5.8 4l3.2 8 1.6-3.5h3.9" />,
  markets: (<><path d="M8 14C8 14 12.5 9.6 12.5 6.4A4.5 4.5 0 1 0 3.5 6.4C3.5 9.6 8 14 8 14Z" /><circle cx="8" cy="6.4" r="1.5" /></>),
  channels: (<><path d="M2 8h4.5M6.5 8C9 8 9 4 11.5 4M6.5 8C9 8 9 12 11.5 12" /><circle cx="13" cy="4" r="1.2" /><circle cx="13" cy="12" r="1.2" /></>),
  executive: (<><rect x="2" y="3" width="12" height="8" rx="1" /><path d="M8 11v2.2M5.5 14.2h5M4.8 8.6 6.8 6.4l1.8 1.4 2.4-2.6" /></>),
  report: (<><rect x="2.5" y="2.5" width="11" height="11" rx="1" /><path d="M2.5 7h11M7 2.5v11" /></>),
  links: (<><path d="M6.6 9.4 9.4 6.6" /><path d="M7.2 4.6 8.6 3.2a2.7 2.7 0 0 1 3.8 3.8L11 8.4" /><path d="M8.8 11.4 7.4 12.8a2.7 2.7 0 0 1-3.8-3.8L5 7.6" /></>),
  email: (<><rect x="2" y="3.5" width="12" height="9" rx="1" /><path d="M2.4 4.4 8 8.8l5.6-4.4" /></>),
  paid: (<><circle cx="8" cy="8" r="5.8" /><path d="M8 4.8v6.4M9.7 6.2H7.1a1.3 1.3 0 0 0 0 2.6h1.8a1.3 1.3 0 0 1 0 2.6H6.3" /></>),
  organic: (<><path d="M8 14V7.2" /><path d="M8 7.2c0-2.6 2-4.7 5.2-4.9.2 3.2-1.9 5.4-5.2 4.9Z" /><path d="M8 9.6C8 7.7 6.4 6.1 3.8 6c-.2 2.5 1.5 4.2 4.2 3.6Z" /></>),
  content: (<><path d="M3.5 2.5h6.2L12.5 5.3v8.2h-9z" /><path d="M9.5 2.5v3h3M6 8h4M6 10.5h4" /></>),
  settings: (<><path d="M2.5 5h11M2.5 11h11" /><circle cx="6.2" cy="5" r="1.7" /><circle cx="10.2" cy="11" r="1.7" /></>),
  contacts: (<><circle cx="8" cy="5.2" r="2.5" /><path d="M3.2 13.5C3.2 10.9 5.3 9.6 8 9.6s4.8 1.3 4.8 3.9" /></>),
  forms: (<><rect x="3.5" y="2" width="9" height="12" rx="1" /><path d="M6 5.5h4M6 8h4M6 10.5h2.5" /></>),
  partners: (<><circle cx="5.5" cy="5.5" r="2" /><circle cx="10.5" cy="5.5" r="2" /><path d="M2 13.2c0-2.3 1.6-3.6 3.5-3.6 1.3 0 2.4.6 3 1.6M9.6 9.8c.3-.1.6-.2.9-.2 1.9 0 3.5 1.3 3.5 3.6" /></>),
  outreach: (<><path d="M14 2 2 6.8l4.7 2.5L9.2 14 14 2Z" /><path d="M6.7 9.3 14 2" /></>),
  events: (<><rect x="2.5" y="3.5" width="11" height="10" rx="1" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>),
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name] ?? <circle cx="8" cy="8" r="5.8" />}
    </svg>
  );
}
