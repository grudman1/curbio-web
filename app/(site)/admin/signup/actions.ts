"use server";

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import {
  authConfigured,
  createSignupRequest,
  createSession,
  sessionSecret,
  signupAttemptAllowed,
} from "@/lib/adminAuth";
import { SESSION_COOKIE, SESSION_IDLE_MS, sealSession } from "@/lib/adminSession";
import { clientIp } from "../login/actions";

export async function signup(formData: FormData): Promise<void> {
  if (!authConfigured()) notFound();

  const ip = await clientIp();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await signupAttemptAllowed(ip))) {
    redirect("/admin/signup?e=rate");
  }

  if (password !== confirm) {
    redirect("/admin/signup?e=mismatch");
  }

  const result = await createSignupRequest(email, password);
  if (!result.ok) {
    redirect(`/admin/signup?e=${result.reason}`);
  }

  console.log("[admin-auth] signup", { ip, email, status: result.status, at: new Date().toISOString() });

  // Bootstrap owner: auto-approved, so sign them straight in — they just
  // proved they know the password they chose, and there is no one else who
  // could approve them anyway.
  if (result.status === "approved") {
    const sid = await createSession(email, "owner");
    if (sid) {
      const token = await sealSession(sid, sessionSecret());
      const jar = await cookies();
      jar.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: Math.floor(SESSION_IDLE_MS / 1000),
      });
    }
    redirect("/admin");
  }

  redirect("/admin/signup?ok=pending");
}
