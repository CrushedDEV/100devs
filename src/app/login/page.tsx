import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gamepad2, ShieldAlert, UserX } from "lucide-react";

import BeamsBackground from "@/components/kokonutui/beams-background";
import ShimmerText from "@/components/kokonutui/shimmer-text";
import { auth } from "@/server/auth";
import { isStaffRole } from "@/server/auth/roles";

import { DiscordLoginButton } from "./discord-login-button";

export const metadata: Metadata = { title: "Acceso" };

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  NotGuildMember: {
    title: "No perteneces al servidor del evento",
    body: "Tu cuenta de Discord no aparece entre los miembros del servidor. Únete al servidor y vuelve a intentarlo.",
  },
  NotStaff: {
    title: "No tienes permisos de organización",
    body: "Solo las cuentas con rol de administrador o moderador pueden entrar al panel de control.",
  },
  AccessDenied: {
    title: "Acceso denegado",
    body: "Discord rechazó la autorización. Vuelve a intentarlo concediendo los permisos solicitados.",
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user && isStaffRole(session.user.role)) redirect("/dashboard");

  const { error, callbackUrl } = await searchParams;
  const problem = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <BeamsBackground className="min-h-dvh" intensity="subtle">
      <main className="flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/60 bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="space-y-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Gamepad2 className="size-5" />
            </span>
            <div className="space-y-1">
              <h1>
                <ShimmerText
                  text="Centro de control"
                  wrapperClassName="justify-start p-0"
                  className="font-heading text-xl font-semibold tracking-tight"
                />
              </h1>
              <p className="text-sm text-muted-foreground">
                Accede con la cuenta de Discord que utilizas para organizar el
                evento.
              </p>
            </div>
          </div>

          {problem && (
            <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
              {error === "NotGuildMember" ? (
                <UserX className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-destructive">
                  {problem.title}
                </p>
                <p className="text-xs text-destructive/80">{problem.body}</p>
              </div>
            </div>
          )}

          <DiscordLoginButton callbackUrl={callbackUrl ?? "/dashboard"} />

          <p className="text-center text-xs text-muted-foreground">
            Comprobamos automáticamente tu pertenencia al servidor y tus roles.
            No se almacena ninguna contraseña.
          </p>
        </div>
      </main>
    </BeamsBackground>
  );
}
