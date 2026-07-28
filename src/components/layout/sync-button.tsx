"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { syncDiscordAction } from "@/server/actions/sync";
import { cn } from "@/lib/utils";

interface SyncButtonProps {
  variant?: "icon" | "full";
  className?: string;
}

/** Manual Discord sync. The periodic job does the same work on a schedule. */
export function SyncButton({ variant = "icon", className }: SyncButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await syncDiscordAction();

      if (result.ok) {
        toast.success("Sincronización completada", {
          description: result.message,
        });
        router.refresh();
      } else {
        toast.error("Error al sincronizar", { description: result.message });
      }
    });
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={run}
        disabled={isPending}
        aria-label="Sincronizar con Discord"
        title="Sincronizar con Discord"
        className={className}
      >
        <RefreshCw className={cn("size-4", isPending && "animate-spin")} />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={run}
      disabled={isPending}
      className={className}
    >
      <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
      {isPending ? "Sincronizando…" : "Sincronizar ahora"}
    </Button>
  );
}
