// Curbio Landing — modal flows. Load AFTER React + Babel + ui.jsx.
// Exports to window: ZipModal, QuoteModal, ScheduleModal, MagnetModal.
const { useState } = React;

// ---------- ZIP / market switcher ----------
function ZipModal({ open, onClose, current, onPick }) {
  const [zip, setZip] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const m = window.CURBIO_MARKETS.find((x) => x.zips.some((p) => zip.trim().startsWith(p)));
    if (!m) { setErr('We’re expanding fast — we don’t have a local team in that ZIP yet. Try 20001, 30301, 75201, or 33601.'); return; }
    onPick(m); setZip(''); setErr(''); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} maxWidth={460}>
      <Eyebrow amber>Find your market</Eyebrow>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--navy)', margin: '10px 0 6px', lineHeight: 1.1 }}>Enter your ZIP code</h2>
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>We’ll connect you with the Curbio Home Sale Manager who covers your area.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="lp-input" inputMode="numeric" placeholder="e.g. 20001" value={zip}
               onChange={(e) => { setZip(e.target.value); setErr(''); }}
               onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ flex: 1 }} />
        <PillButton onClick={submit} icon="arrow">Find</PillButton>
      </div>
      {err && <p style={{ fontSize: 12.5, color: 'var(--amber-120)', margin: '12px 0 0', lineHeight: 1.45 }}>{err}</p>}
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--stone)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>Currently serving</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {window.CURBIO_MARKETS.map((m) => (
            <button key={m.id} className="lp-chip" onClick={() => { onPick(m); onClose(); }}
                    style={{ borderColor: m.id === current.id ? 'var(--amber)' : 'var(--stone)', color: m.id === current.id ? 'var(--amber)' : 'var(--navy)' }}>
              {m.market}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ---------- Free quote request ----------
function QuoteModal({ open, onClose, market }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', address: '', role: 'Home seller' });
  const [sent, setSent] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const close = () => { setSent(false); onClose(); };
  const valid = f.name && f.email && f.address;
  return (
    <Modal open={open} onClose={close} maxWidth={500}>
      {!sent ? (
        <React.Fragment>
          <Eyebrow amber>Free, no-obligation</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 27, fontWeight: 600, color: 'var(--navy)', margin: '10px 0 6px', lineHeight: 1.08 }}>Get your project quote</h2>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>{market.hsm.name}, your local Home Sale Manager, will scope the work and send a clear estimate — no cost, no commitment.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full name" value={f.name} onChange={set('name')} required half />
            <Field label="Phone" type="tel" value={f.phone} onChange={set('phone')} half />
            <Field label="Email" type="email" value={f.email} onChange={set('email')} required />
            <Field label="Property address" value={f.address} onChange={set('address')} placeholder="Street, City, State" required />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, gridColumn: '1 / -1' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--navy)' }}>I am a</span>
              <select className="lp-input" value={f.role} onChange={(e) => set('role')(e.target.value)}>
                <option>Home seller</option><option>Real estate agent</option><option>Brokerage / team</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 20 }}>
            <PillButton full size="lg" disabled={!valid} onClick={() => setSent(true)}>Request my free quote</PillButton>
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', margin: '12px 0 0', textAlign: 'center', lineHeight: 1.4 }}>No payment until your home sells. Financing for qualified sellers.</p>
        </React.Fragment>
      ) : (
        <SuccessPanel
          title="Request received"
          body={<span>{market.hsm.name} will reach out within one business day to schedule your walkthrough. Keep an eye on <strong style={{ color: 'var(--navy)' }}>{f.email || 'your inbox'}</strong>.</span>}
          onClose={close} />
      )}
    </Modal>
  );
}

// ---------- Speak with our team — Calendly-style scheduler ----------
function ScheduleModal({ open, onClose, market }) {
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [booked, setBooked] = useState(false);
  const days = ['Mon 9', 'Tue 10', 'Wed 11', 'Thu 12', 'Fri 13'];
  const slots = ['9:00 AM', '9:30 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:30 PM', '3:00 PM', '4:00 PM'];
  const close = () => { setDay(null); setSlot(null); setBooked(false); onClose(); };
  return (
    <Modal open={open} onClose={close} maxWidth={560}>
      {!booked ? (
        <React.Fragment>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
            <PhotoPlaceholder label="" style={{ width: 52, height: 52, borderRadius: 999, flexShrink: 0 }} />
            <div>
              <Eyebrow amber style={{ marginBottom: 3 }}>15-min intro call</Eyebrow>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>Speak with {market.hsm.name}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-subtle)', marginBottom: 14, padding: '8px 12px', background: 'var(--cloud-white)', border: '1px dashed var(--border-strong)', borderRadius: 8 }}>
            Calendly embed — {market.hsm.name.toLowerCase().replace(' ', '')}-curbio · {market.market}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 10 }}>Pick a day</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 18 }}>
            {days.map((d) => (
              <button key={d} className="lp-slot" onClick={() => { setDay(d); setSlot(null); }}
                      style={{ borderColor: day === d ? 'var(--amber)' : 'var(--stone)', background: day === d ? 'var(--amber-10)' : '#fff', color: 'var(--navy)' }}>{d}</button>
            ))}
          </div>
          {day && <React.Fragment>
            <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: 10 }}>Available times — {day}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
              {slots.map((s) => (
                <button key={s} className="lp-slot" onClick={() => setSlot(s)}
                        style={{ borderColor: slot === s ? 'var(--amber)' : 'var(--stone)', background: slot === s ? 'var(--amber)' : '#fff', color: slot === s ? '#fff' : 'var(--navy)' }}>{s}</button>
              ))}
            </div>
          </React.Fragment>}
          <PillButton full size="lg" disabled={!slot} onClick={() => setBooked(true)} icon="calendar">
            {slot ? `Confirm ${day}, ${slot}` : 'Select a time'}
          </PillButton>
        </React.Fragment>
      ) : (
        <SuccessPanel
          title="You’re booked"
          body={<span>Your call with <strong style={{ color: 'var(--navy)' }}>{market.hsm.name}</strong> is set for <strong style={{ color: 'var(--navy)' }}>{day}, {slot}</strong>. A calendar invite and reminder are on the way.</span>}
          onClose={close} />
      )}
    </Modal>
  );
}

// ---------- Lead magnet: form → permissions → double opt-in → download ----------
function MagnetModal({ open, onClose, magnet }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', email: '', phone: '', brokerage: '' });
  const [perm, setPerm] = useState({ email: true, call: false, text: false });
  const [optin, setOptin] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const close = () => { setStep(1); setF({ name: '', email: '', phone: '', brokerage: '' }); setPerm({ email: true, call: false, text: false }); setOptin(false); onClose(); };
  if (!magnet) return null;
  const valid = f.name && f.email && f.phone;
  return (
    <Modal open={open} onClose={close} maxWidth={540}>
      {/* progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[1, 2, 3].map((n) => <span key={n} style={{ height: 4, flex: 1, borderRadius: 2, background: step >= n ? 'var(--amber)' : 'var(--stone)', transition: 'background .2s' }} />)}
      </div>

      {step === 1 && (
        <React.Fragment>
          <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <PhotoPlaceholder label="" tone="navy" style={{ width: 64, height: 84, borderRadius: 8, flexShrink: 0 }}>
              <Icon name="doc" size={26} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', top: 12, left: 12 }} />
            </PhotoPlaceholder>
            <div>
              <Eyebrow amber style={{ marginBottom: 4 }}>{magnet.kicker}</Eyebrow>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.12 }}>{magnet.title}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 4 }}>{magnet.pages}</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>{magnet.sub} Tell us where to send it.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Full name" value={f.name} onChange={set('name')} required half />
            <Field label="Phone" type="tel" value={f.phone} onChange={set('phone')} required half />
            <Field label="Email" type="email" value={f.email} onChange={set('email')} required />
            <Field label="Brokerage / company" value={f.brokerage} onChange={set('brokerage')} placeholder="Optional" />
          </div>
          <div style={{ marginTop: 20 }}>
            <PillButton full size="lg" disabled={!valid} onClick={() => setStep(2)} icon="arrow">Continue</PillButton>
          </div>
        </React.Fragment>
      )}

      {step === 2 && (
        <React.Fragment>
          <Eyebrow amber>Almost there</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 600, color: 'var(--navy)', margin: '10px 0 6px', lineHeight: 1.1 }}>How can we reach you?</h2>
          <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>Choose how you’d like to hear from your local Curbio team. You can opt out anytime.</p>
          <div style={{ display: 'grid', gap: 14, padding: '18px', background: 'var(--cloud-white)', borderRadius: 12, border: '1px solid var(--stone)' }}>
            <CheckRow checked={perm.email} onChange={(v) => setPerm((s) => ({ ...s, email: v }))}>Email me the guide and occasional pre-listing tips</CheckRow>
            <CheckRow checked={perm.call} onChange={(v) => setPerm((s) => ({ ...s, call: v }))}>Call me about getting a home market-ready</CheckRow>
            <CheckRow checked={perm.text} onChange={(v) => setPerm((s) => ({ ...s, text: v }))}>Text me — the fastest way to reach my Home Sale Manager</CheckRow>
          </div>
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--stone)' }}>
            <CheckRow checked={optin} onChange={setOptin} strong>
              I agree to receive communications from Curbio at the contact details above and have read the <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--navy)' }}>Privacy Policy</a>. Message &amp; data rates may apply; reply STOP to opt out.
            </CheckRow>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <PillButton variant="secondary" onClick={() => setStep(1)}>Back</PillButton>
            <PillButton full disabled={!optin} onClick={() => setStep(3)} icon="mail">Send my confirmation</PillButton>
          </div>
        </React.Fragment>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
          <div style={{ width: 62, height: 62, borderRadius: 999, background: 'var(--amber-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '1px solid var(--amber-30)' }}>
            <Icon name="mail" size={28} color="var(--amber)" />
          </div>
          <Eyebrow amber style={{ textAlign: 'center' }}>One last step</Eyebrow>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 25, fontWeight: 600, color: 'var(--navy)', margin: '10px 0 8px', lineHeight: 1.1 }}>Confirm your email to unlock the download</h2>
          <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 auto 22px', lineHeight: 1.55, maxWidth: 380 }}>
            We just sent a confirmation link to <strong style={{ color: 'var(--navy)' }}>{f.email}</strong>. Click it to verify you’re you — then your copy of <em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>{magnet.title}</em> downloads instantly. This double opt-in keeps your inbox spam-free and your data yours.
          </p>
          <ConfirmStep magnet={magnet} onClose={close} />
        </div>
      )}
    </Modal>
  );
}

// Simulates clicking the confirmation link, then reveals the download.
function ConfirmStep({ magnet, onClose }) {
  const [confirmed, setConfirmed] = useState(false);
  if (!confirmed) {
    return (
      <React.Fragment>
        <PillButton size="lg" onClick={() => setConfirmed(true)} icon="check" style={{ minWidth: 240 }}>I’ve confirmed my email</PillButton>
        <p style={{ fontSize: 11.5, color: 'var(--fg-subtle)', margin: '14px 0 0' }}>Didn’t get it? Check spam, or <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--navy)' }}>resend</a>.</p>
      </React.Fragment>
    );
  }
  return (
    <div style={{ background: 'var(--cloud-white)', border: '1px solid var(--stone)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="check" size={20} color="var(--teal)" stroke={2.5} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>Email confirmed — you’re all set</span>
      </div>
      <PillButton full size="lg" icon="doc" onClick={onClose}>Download {magnet.pages.includes('report') ? 'the report' : 'the guide'}</PillButton>
    </div>
  );
}

function SuccessPanel({ title, body, onClose }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 4px 6px' }}>
      <div style={{ width: 62, height: 62, borderRadius: 999, background: 'var(--amber-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: '1px solid var(--amber-30)' }}>
        <Icon name="check" size={28} color="var(--amber)" stroke={2.5} />
      </div>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--navy)', margin: '0 0 8px', lineHeight: 1.1 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--fg-muted)', margin: '0 auto 22px', lineHeight: 1.55, maxWidth: 380 }}>{body}</p>
      <PillButton size="lg" variant="secondary" onClick={onClose} style={{ minWidth: 160 }}>Done</PillButton>
    </div>
  );
}

Object.assign(window, { ZipModal, QuoteModal, ScheduleModal, MagnetModal });
