// Curbio Landing — shared UI primitives. Load AFTER React + Babel.
// Exports to window: Icon, PillButton, Field, CheckRow, PhotoPlaceholder,
// Eyebrow, AmberRule, Modal, StarRow.

const LP_ICONS = {
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z',
  calendar: 'M3 4h18v18H3z M16 2v4 M8 2v4 M3 10h18',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  clipboard: 'M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2',
  check: 'M20 6L9 17l-5-5',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  dollar: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  x: 'M18 6L6 18 M6 6l12 12',
  star: 'M12 2l3 7 7 .5L17 14.5 18.5 22 12 18l-6.5 4L7 14.5 2 9.5 9 9z',
  lock: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M4 4h16v16H4z M22 6l-10 7L2 6',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z',
};

function Icon({ name, size = 24, color = 'currentColor', stroke = 1.75, fill = 'none', style }) {
  const d = LP_ICONS[name];
  if (!d) return null;
  const isFilled = fill !== 'none';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={isFilled ? fill : color}
         strokeWidth={isFilled ? 0 : stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d.split(/\s(?=M)/).map((seg, i) => <path key={i} d={seg} />)}
    </svg>
  );
}

function Eyebrow({ children, amber, style }) {
  return <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: amber ? 'var(--amber)' : 'var(--navy)', lineHeight: 1.3, ...style }}>{children}</div>;
}

function AmberRule({ width = 56, style }) {
  return <span style={{ display: 'block', width, height: 3, background: 'var(--amber)', borderRadius: 2, ...style }} />;
}

const lpBtnSizes = { sm: { padding: '9px 18px', fontSize: 13 }, md: { padding: '13px 24px', fontSize: 15 }, lg: { padding: '16px 30px', fontSize: 16 } };
function PillButton({ children, variant = 'primary', size = 'md', onClick, full, icon, style, type = 'button', disabled }) {
  const base = { fontFamily: 'var(--font-sans)', fontWeight: 700, borderRadius: 999, border: 0, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .22s var(--ease-out)', letterSpacing: '0.01em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: full ? '100%' : 'auto', lineHeight: 1.1 };
  const variants = {
    primary: { background: 'var(--amber)', color: '#fff' },
    secondary: { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' },
    onNavy: { background: 'var(--amber)', color: '#fff' },
    ghostNavy: { background: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' },
    white: { background: '#fff', color: 'var(--navy)', border: '1px solid var(--stone)' },
  };
  const v = variants[variant] || variants.primary;
  const cls = 'lp-btn lp-btn-' + variant + (disabled ? ' lp-btn-disabled' : '');
  return (
    <button type={type} className={cls} onClick={disabled ? undefined : onClick}
            style={{ ...base, ...lpBtnSizes[size], ...v, opacity: disabled ? 0.4 : 1, ...style }}>
      {children}
      {icon && <Icon name={icon} size={size === 'lg' ? 19 : 17} color="currentColor" />}
    </button>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, required, hint, half }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: half ? 'span 1' : '1 / -1' }}>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--navy)' }}>
        {label}{required && <span style={{ color: 'var(--amber)' }}> *</span>}
      </span>
      <input className="lp-input" type={type} value={value} placeholder={placeholder} required={required}
             onChange={(e) => onChange(e.target.value)} />
      {hint && <span style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>{hint}</span>}
    </label>
  );
}

function CheckRow({ checked, onChange, children, strong }) {
  return (
    <label style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <span style={{
        flexShrink: 0, width: 20, height: 20, marginTop: 1, borderRadius: 5,
        border: checked ? '1px solid var(--amber)' : '1.5px solid var(--border-strong)',
        background: checked ? 'var(--amber)' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s var(--ease-out)',
      }}>
        {checked && <Icon name="check" size={13} color="#fff" stroke={3} />}
      </span>
      <span style={{ fontSize: strong ? 13.5 : 13, lineHeight: 1.45, color: strong ? 'var(--navy)' : 'var(--fg-muted)', fontWeight: strong ? 600 : 400 }}>{children}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
    </label>
  );
}

// Branded striped placeholder for real photography (per brand: no fake imagery).
function PhotoPlaceholder({ label, tone = 'warm', radius = 12, style, children, ratio }) {
  const bg = tone === 'dim'
    ? 'repeating-linear-gradient(45deg,#4d473e,#4d473e 14px,#46413a 14px,#46413a 28px)'
    : tone === 'navy'
    ? 'repeating-linear-gradient(45deg,#13294f,#13294f 14px,#0f2347 14px,#0f2347 28px)'
    : 'repeating-linear-gradient(45deg,#ece6dc,#ece6dc 14px,#e3d9cb 14px,#e3d9cb 28px)';
  const labelColor = tone === 'dim' || tone === 'navy' ? 'rgba(255,255,255,0.6)' : 'rgba(13,37,77,0.42)';
  return (
    <div style={{ position: 'relative', background: bg, borderRadius: radius, overflow: 'hidden', aspectRatio: ratio || undefined, ...style }}>
      {children}
      {label && <span style={{ position: 'absolute', right: 12, bottom: 10, fontFamily: 'var(--font-mono)', fontSize: 11, color: labelColor, letterSpacing: '0.02em' }}>{label}</span>}
    </div>
  );
}

function StarRow({ count = 5, size = 16, style }) {
  return (
    <div style={{ display: 'flex', gap: 3, ...style }}>
      {Array.from({ length: count }).map((_, i) => <Icon key={i} name="star" size={size} fill="var(--amber)" />)}
    </div>
  );
}

function Modal({ open, onClose, children, maxWidth = 520 }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="lp-overlay" onMouseDown={onClose}>
      <div className="lp-modal" style={{ maxWidth }} onMouseDown={(e) => e.stopPropagation()}>
        <button className="lp-modal-x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} color="var(--navy)" /></button>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Eyebrow, AmberRule, PillButton, Field, CheckRow, PhotoPlaceholder, StarRow, Modal });
