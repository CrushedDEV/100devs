import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="font-heading text-xl font-semibold">
        Esta página no existe
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Puede que el equipo o el checkpoint que buscas se haya eliminado.
      </p>
      <Button asChild size="sm">
        <Link href="/dashboard">Volver al dashboard</Link>
      </Button>
    </main>
  );
}
