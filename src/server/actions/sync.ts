"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/server/auth/guard";
import { syncDiscordMembers, type SyncResult } from "@/server/discord/sync";

import { fail, ok, type ActionState } from "./shared";

/** Manual "Sincronizar ahora" button in the topbar and settings page. */
export async function syncDiscordAction(): Promise<ActionState<SyncResult>> {
  try {
    const session = await requireStaff();
    const result = await syncDiscordMembers("manual", session.user.id);

    revalidatePath("/participants");
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    revalidatePath("/settings");

    const summary = [
      `${result.membersFetched} miembros procesados`,
      `${result.usersCreated} nuevos`,
      `${result.participantsCreated} inscritos`,
    ];

    if (result.skillsLinked > 0) {
      summary.push(`${result.skillsLinked} categorías vinculadas`);
    }

    return ok(result, `${summary.join(" · ")}.`);
  } catch (error) {
    console.error("[sync]", error);
    return fail(
      error instanceof Error
        ? `No se pudo sincronizar: ${error.message}`
        : "No se pudo sincronizar con Discord.",
    );
  }
}
