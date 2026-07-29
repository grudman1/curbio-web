"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import {
  authConfigured,
  verifyCredentials,
  createSession,
  destroySession,
  loginAttemptAllowed,
  clearLoginCounters,
  sessionSecret,
} from "@/lib/adminAuth";
import { SESSION_COOKIE, SESSION_IDLE_MS, sealSession, openSession } from "@/lib/adminSession";

// Server actions run in the Node runtime — this is where bcrypt lives. The
// edge middleware never verifies passwords; it only checks the session cookie
// these actions issue.

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function login(formData: FormData): Promise<void> {
  if (!authConfigured()) notFound();

  const ip = await clientIp();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Rate limit BEFORE verification — over-limit attempts never reach bcrypt,
  // and every attempt (right or wrong) counts toward the window.
  if (!(await loginAttemptAllowed(ip))) {
    console.warn("[admin-auth] rate-limited login attempt", {
      ip,
      at: new Date().toISOString(),
    });
    redirect("/admin/login?e=rate");
  }

  const ok = await verifyCredentials(email, password);
  if (!ok) {
    // Failed-attempt log: timestamp + IP + the submitted identifier (that IS
    // the probe data). Never the password.
    console.warn("[admin-auth] failed login", {
      ip,
      email,
      at: new Date().toISOString(),
    });
    redirect("/admin/login?e=1");
  }

  const sid = await createSession();
  if (!sid) {
    console.error("[admin-auth] session store unavailable at login", { ip });
    redirect("/admin/login?e=1");
  }
  await clearLoginCounters(ip);

  const token = await sealSession(sid, sessionSecret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_IDLE_MS / 1000),
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  if (!authConfigured()) notFound();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const opened = await openSession(token, sessionSecret());
  if (opened) {
    // Server-side revocation — the part that makes logout real. A copy of the
    // cookie taken before logout is dead the moment this DEL lands.
    await destroySession(opened.sid);
  }
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
