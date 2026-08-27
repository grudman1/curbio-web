"use server";

import { redirect, notFound } from "next/navigation";
import { authConfigured, approveUser, denyUser } from "@/lib/adminAuth";
import { ownerSession } from "@/lib/adminGuards";

/**
 * The redirect-flavoured wrapper around the shared owner guard
 * (lib/adminGuards.ts — the re-check every mutation uses). Form actions
 * redirect on failure; result-returning actions return an error instead.
 */
async function requireOwnerSession(): Promise<{ email: string }> {
  if (!authConfigured()) notFound();
  const session = await ownerSession();
  // Signed-out lands on /admin and bounces to login via middleware; a
  // signed-in member lands on /admin proper — same destinations as before.
  if (!session) redirect("/admin");
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
