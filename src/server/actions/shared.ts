import "server-only";

import { z } from "zod";

import { requireStaff, type StaffSession } from "@/server/auth/guard";
import { getActiveEvent, type EventContext } from "@/server/services/events";

export interface ActionState<T = undefined> {
  ok: boolean;
  message?: string;
  /** Field-level errors keyed by form field name. */
  errors?: Record<string, string[]>;
  data?: T;
}

export const ok = <T>(data?: T, message?: string): ActionState<T> => ({
  ok: true,
  data,
  message,
});

export const fail = (
  message: string,
  errors?: Record<string, string[]>,
): ActionState<never> => ({ ok: false, message, errors });

export interface ActionContext extends EventContext {
  session: StaffSession;
  actorUserId: string;
}

/** Authenticates and resolves the active event for every server action. */
export async function actionContext(): Promise<ActionContext> {
  const session = await requireStaff();
  const context = await getActiveEvent();
  return { ...context, session, actorUserId: session.user.id };
}

/**
 * Wraps an action body with auth, validation and uniform error shaping so each
 * action stays focused on its business rule.
 */
export async function runAction<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  input: unknown,
  handler: (
    value: z.output<TSchema>,
    context: ActionContext,
  ) => Promise<ActionState<TResult>>,
): Promise<ActionState<TResult>> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      errors[key] = [...(errors[key] ?? []), issue.message];
    }
    return fail("Revisa los campos marcados.", errors);
  }

  try {
    const context = await actionContext();
    return await handler(parsed.data, context);
  } catch (error) {
    console.error("[action]", error);
    return fail(
      error instanceof Error ? error.message : "Se produjo un error inesperado.",
    );
  }
}

/** Turns a `FormData` into a plain object, collapsing empty strings to null. */
export function formToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    result[key] = value;
  }

  return result;
}
