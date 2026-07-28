import "server-only";

import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "./index";
import { isStaffRole } from "./roles";

export type StaffSession = Session & {
  user: NonNullable<Session["user"]>;
};

/**
 * Guard for every server component / server action inside the admin panel.
 * Redirects instead of throwing so nested layouts degrade gracefully.
 */
export async function requireStaff(): Promise<StaffSession> {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!isStaffRole(session.user.role)) redirect("/login?error=NotStaff");

  return session as StaffSession;
}

/** Stricter variant for destructive settings-level operations. */
export async function requireAdmin(): Promise<StaffSession> {
  const session = await requireStaff();

  if (session.user.role !== "admin") {
    throw new Error("Se requieren permisos de administrador.");
  }

  return session;
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
