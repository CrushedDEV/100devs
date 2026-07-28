"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIFT_STATUSES, SHIFT_STATUS_META, type ShiftStatus } from "@/lib/constants";
import { updateShiftAction } from "@/server/actions/shifts";

/** Inline status editor used inside shift tables. */
export function ShiftStatusSelect({
  shiftId,
  status,
}: {
  shiftId: string;
  status: ShiftStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onChange = (value: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", shiftId);
      formData.set("status", value);

      const result = await updateShiftAction(undefined, formData);

      if (result.ok) {
        toast.success("Estado actualizado");
        router.refresh();
      } else {
        toast.error(result.message ?? "No se pudo actualizar");
      }
    });
  };

  return (
    <Select value={status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36" aria-label="Estado del turno">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SHIFT_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {SHIFT_STATUS_META[value].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
