"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import HoldButton from "@/components/kokonutui/hold-button";
import { deleteTeamAction } from "@/server/actions/teams";

/**
 * Deleting a team cascades to its shifts and checkpoints, so it is gated
 * behind a press-and-hold instead of a dismissable confirm dialog.
 */
export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      const result = await deleteTeamAction(teamId);

      if (result.ok) {
        toast.success(`Equipo "${teamName}" eliminado`);
        router.push("/teams");
      } else {
        toast.error(result.message ?? "No se pudo eliminar el equipo");
      }
    });
  };

  return (
    <HoldButton
      variant="red"
      holdDuration={2000}
      disabled={isPending}
      onHoldComplete={remove}
      label={isPending ? "Eliminando…" : "Mantén pulsado para eliminar"}
      holdingLabel="Suelta para cancelar"
    />
  );
}
