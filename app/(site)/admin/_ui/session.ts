import { cache } from "react";
import { cookies } from "next/headers";
import { getSessionUser, sessionSecret } from "@/lib/adminAuth";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";

// The signed-in admin, for DISPLAY and for PII visibility.
//
// NOT a security boundary — middleware gates every /admin route and
// requireOwnerSession() re-derives role independently for every mutation. This
// exists so the shell can show who is signed in and so the Leads screen can
// decide whether to unmask, without either of them opening a second session.
//
// cache()d: the layout and the page both read it in one request and should
// share the Redis hit.
export const currentAdminUser = cache(
  async (): Promise<{ email: string; role: string } | null> => {
    const jar = await cookies();
    const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
    if (!opened) return null;
    const session = await getSessionUser(opened.sid);
    return session ? { email: session.email, role: session.role } : null;
  }
);
