"use server";

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { authConfigured, approveUser, denyUser, getSessionUser, sessionSecret } from "@/lib/adminAuth";
import { SESSION_COOKIE, openSession } from "@/lib/adminSession";

/**
 * Re-derive the caller's role from the session cookie and reject anything
 * but `owner`. This is DEFENSE IN DEPTH, not the only gate — the Control
 * Room UI already hides the approve/deny panel from non-owners — but a
 * mutating action must never trust that the client only sent the request
 * because the button was hidden. Every check here re-reads state from Redis;
 * nothing is taken on faith from the request.
 */
async function requireOwnerSession(): Promise<{ email: string }> {
  if (!authConfigured()) notFound();
  const jar = await cookies();
  const opened = await openSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
  if (!opened) redirect("/admin/login");
  const session = await getSessionUser(opened.sid);
  if (!session || session.role !== "owner") redirect("/admin");
  return { email: session.email };
}

export async function approveUserAction(formData: FormData): Promise<void> {
  const owner = await requireOwnerSession();
  const email = String(formData.get("email") ?? "");
  if (email) await approveUser(email, owner.email);
  redirect("/admin");
}

export async function denyUserAction(formData: FormData): Promise<void> {
  await requireOwnerSession();
  const email = String(formData.get("email") ?? "");
  if (email) await denyUser(email);
  redirect("/admin");
}
