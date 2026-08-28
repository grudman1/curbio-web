// Form controls for drawers and toolbars — one look for every input in the
// app. 13px sans, strong app border, amber focus ring. Server-safe; wire
// value/onChange from the calling client component.

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block font-sans text-ops-label font-semibold text-content-muted"
    >
      {children}
    </label>
  );
}

const CONTROL =
  "w-full rounded-md border border-app-border-strong bg-app-card px-2.5 font-sans text-ops-body text-content placeholder:text-content-subtle transition-colors duration-fast ease-out focus:border-content-subtle focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:bg-app-well disabled:text-content-muted";

export function Input({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} h-[32px] ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL} h-[32px] cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} min-h-[64px] resize-y py-1.5 ${className}`} {...rest} />;
}

/** Label + control, stacked — the drawer's unit of layout. */
export function Field({
  label,
  children,
  className = "",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block font-sans text-ops-label font-semibold text-content-muted">{label}</span>
      {children}
    </label>
  );
}

/** Inline error under a field or at a form's foot. */
export function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="m-0 mt-2 font-sans text-ops-label text-tone-bad">
      {children}
    </p>
  );
}
