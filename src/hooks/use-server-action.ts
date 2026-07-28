"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ActionState } from "@/server/actions/shared";

type FormAction = (
  prev: ActionState | undefined,
  formData: FormData,
) => Promise<ActionState>;

interface Options {
  /** Called after a successful run, before the router refresh. */
  onSuccess?: () => void;
  successMessage?: string;
}

/**
 * Runs a `FormData` server action from a `<form action>` handler.
 *
 * Deliberately not `useActionState`: handling the result inside the submit
 * callback (rather than in an effect that reacts to the returned state) keeps
 * dialog-closing and toasts out of render-triggered effects.
 */
export function useServerAction(action: FormAction, options: Options = {}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ActionState | undefined>();

  const run = useCallback(
    (formData: FormData) => {
      startTransition(async () => {
        const result = await action(undefined, formData);
        setState(result);

        if (result.ok) {
          toast.success(options.successMessage ?? result.message ?? "Guardado");
          options.onSuccess?.();
          router.refresh();
        } else {
          toast.error(result.message ?? "No se pudo guardar");
        }
      });
    },
    [action, options, router],
  );

  return { run, isPending, state, errors: state?.errors };
}
