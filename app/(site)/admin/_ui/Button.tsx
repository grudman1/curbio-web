// THE button. One vocabulary for every action in the app (DESIGN-APP.md):
// navy primary, bordered secondary, ghost for row-level and tertiary actions,
// danger for destructive confirms. Amber is never a button inside /admin.
//
// Server-safe: renders a plain <button>/<a>; interactivity comes from the
// caller (form action= or a client component's onClick).

import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-content-inverse border border-transparent hover:bg-brand-muted disabled:hover:bg-brand",
  secondary:
    "bg-app-card text-content border border-app-border-strong hover:border-content-subtle hover:bg-app-well",
  ghost:
    "bg-transparent text-content-muted border border-transparent hover:bg-app-well hover:text-content",
  danger:
    "bg-transparent text-tone-bad border border-transparent hover:bg-pill-bad-bg",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-[26px] px-2.5 text-ops-label rounded-md gap-1",
  md: "h-[32px] px-3.5 text-ops-body rounded-md gap-1.5",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className = ""): string {
  return `inline-flex cursor-pointer select-none items-center justify-center whitespace-nowrap font-sans font-semibold no-underline transition-colors duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`;
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className = "",
  href,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
