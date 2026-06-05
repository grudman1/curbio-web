import PageShell from "@/components/PageShell";
import { ctaCopyFlag, CTA_COPY, type CtaVariant } from "@/lib/flags";

// Reads the visitor cookie (via the cta-copy flag) at request time.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Evaluate the A/B flag ONCE here so the form button and sticky bar always
  // show the same variant. Fail closed to control if flags misconfigure.
  let variant: CtaVariant = "control";
  try {
    variant = await ctaCopyFlag();
  } catch {
    variant = "control";
  }
  const ctaCopy = CTA_COPY[variant];

  return <PageShell variant={variant} ctaCopy={ctaCopy} />;
}
