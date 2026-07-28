"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-destructive/40 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </span>

      <div className="space-y-1">
        <h2 className="font-heading text-sm font-medium">
          Algo ha fallado al cargar esta vista
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {error.message ||
            "Revisa la conexión con la base de datos y la configuración de Discord."}
        </p>
      </div>

      <Button size="sm" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
