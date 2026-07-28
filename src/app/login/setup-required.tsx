import { TriangleAlert } from "lucide-react";

/**
 * Shown instead of the sign-in form when the deployment is missing required
 * configuration.
 *
 * Listing the variable *names* is safe — they are already documented in
 * `.env.example` — and it is the difference between a five-second fix and a
 * guessing game. Values are never read, let alone rendered.
 */
export function SetupRequired({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        <span className="flex size-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <TriangleAlert className="size-5" />
        </span>

        <div className="space-y-1.5">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Configuración incompleta
          </h1>
          <p className="text-sm text-muted-foreground">
            El inicio de sesión con Discord no puede funcionar hasta que estas
            variables de entorno estén definidas en el entorno de despliegue.
          </p>
        </div>

        <ul className="space-y-1.5">
          {missing.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-warning" />
              {name}
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
          <p>
            Añádelas en{" "}
            <strong className="text-foreground">
              Vercel → Settings → Environment Variables
            </strong>
            , comprueba que estén marcadas para el entorno correcto
            (Production/Preview) y vuelve a desplegar: los cambios de variables
            no se aplican a despliegues ya existentes.
          </p>
          <p>
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              AUTH_SECRET
            </code>{" "}
            se genera con{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npx auth secret
            </code>
            .{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              DATABASE_URL
            </code>{" "}
            la inyecta Vercel al conectar un almacén Postgres al proyecto.
          </p>
        </div>
      </div>
    </main>
  );
}
