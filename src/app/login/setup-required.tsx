import { TriangleAlert } from "lucide-react";

/**
 * Shown instead of the sign-in form when the deployment is missing required
 * configuration. Deliberately vague: this page is public, so the list of
 * missing variables is only exposed through the secret-gated `/api/health`.
 */
export function SetupRequired({ count }: { count: number }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        <span className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <TriangleAlert className="size-5" />
        </span>

        <div className="space-y-1.5">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Configuración incompleta
          </h1>
          <p className="text-sm text-muted-foreground">
            Faltan {count} {count === 1 ? "variable" : "variables"} de entorno,
            así que el inicio de sesión con Discord no puede funcionar todavía.
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-muted/60 p-3.5 text-sm">
          <p className="font-medium">Cómo saber cuáles faltan</p>
          <p className="text-muted-foreground">
            Llama al endpoint de diagnóstico con tu <code>CRON_SECRET</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-background p-2.5 text-xs">
            <code>{"curl -H 'Authorization: Bearer <CRON_SECRET>' \\\n  https://<tu-dominio>/api/health"}</code>
          </pre>
          <p className="text-muted-foreground">
            Añádelas en <strong>Vercel → Settings → Environment Variables</strong>{" "}
            y vuelve a desplegar.
          </p>
        </div>
      </div>
    </main>
  );
}
