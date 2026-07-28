/**
 * Development seed: creates an event, 10 teams, 100 fake participants and a
 * couple of rounds of shifts + checkpoints so every screen has real data.
 *
 * Run with `npm run db:seed`. Safe to re-run: it clears the demo event first.
 */
import { addMinutes, subDays, subHours } from "date-fns";
import { eq } from "drizzle-orm";

import { TEAM_COLORS } from "@/lib/constants";
import { db } from "@/server/db";
import {
  checkpoints,
  eventSettings,
  events,
  participants,
  shifts,
  teams,
  timelineEvents,
  users,
} from "@/server/db/schema";

const SLUG = "edicion-demo";
const TEAM_COUNT = 10;
const MEMBERS_PER_TEAM = 10;

const FIRST_NAMES = [
  "Alex", "Marta", "Iker", "Nerea", "Diego", "Lucia", "Pablo", "Sara",
  "Hugo", "Elena", "Mario", "Ines", "Bruno", "Carla", "Adrian", "Noa",
  "Javier", "Aitana", "Raul", "Vega",
];
const LAST_NAMES = [
  "Perez", "Gomez", "Ruiz", "Sanz", "Lopez", "Diaz", "Moya", "Vidal",
  "Cano", "Prieto",
];

async function main() {
  console.log("→ Limpiando evento de demostración…");

  const existing = await db.query.events.findFirst({
    where: eq(events.slug, SLUG),
  });
  if (existing) {
    await db.delete(events).where(eq(events.id, existing.id));
  }

  console.log("→ Creando evento…");
  const [event] = await db
    .insert(events)
    .values({
      slug: SLUG,
      name: "100 Devs · Demo",
      description:
        "Datos de demostración: 10 equipos de 10 personas desarrollando por turnos.",
      status: "live",
      discordGuildId: process.env.DISCORD_GUILD_ID ?? "000000000000000000",
      startsAt: subDays(new Date(), 3),
      defaultShiftMinutes: 60,
      isDefault: true,
    })
    .returning();

  // Only one event may be the default.
  await db
    .update(events)
    .set({ isDefault: false })
    .where(eq(events.isDefault, true));
  await db
    .update(events)
    .set({ isDefault: true })
    .where(eq(events.id, event.id));

  await db.insert(eventSettings).values({
    eventId: event.id,
    participantRoleIds: ["000000000000000001"],
    moderatorRoleIds: ["000000000000000002"],
    adminRoleIds: ["000000000000000003"],
  });

  console.log("→ Creando equipos…");
  const createdTeams = await db
    .insert(teams)
    .values(
      Array.from({ length: TEAM_COUNT }, (_, index) => ({
        eventId: event.id,
        name: `Equipo ${String.fromCharCode(65 + index)}`,
        slug: `equipo-${String.fromCharCode(97 + index)}`,
        description: "Proyecto de demostración",
        color: TEAM_COLORS[index % TEAM_COLORS.length],
        orderIndex: index,
        driveFolderUrl: `https://drive.google.com/drive/folders/demo-${index}`,
      })),
    )
    .returning();

  console.log("→ Creando participantes…");
  const total = TEAM_COUNT * MEMBERS_PER_TEAM;
  const createdUsers = await db
    .insert(users)
    .values(
      Array.from({ length: total }, (_, index) => {
        const first = FIRST_NAMES[index % FIRST_NAMES.length];
        const last = LAST_NAMES[index % LAST_NAMES.length];

        return {
          discordId: String(100_000_000_000_000_000n + BigInt(index)),
          username: `${first.toLowerCase()}${index}`,
          globalName: `${first} ${last}`,
          avatarUrl: null,
          role: "participant" as const,
          discordRoleIds: ["000000000000000001"],
        };
      }),
    )
    .returning();

  const createdParticipants = await db
    .insert(participants)
    .values(
      createdUsers.map((user, index) => ({
        eventId: event.id,
        userId: user.id,
        teamId: createdTeams[Math.floor(index / MEMBERS_PER_TEAM)].id,
        status: "active" as const,
        orderIndex: index % MEMBERS_PER_TEAM,
        availability: index % 3 === 0 ? "Tardes y fines de semana" : null,
        discordTicketUrl: `https://discord.com/channels/demo/ticket-${index}`,
      })),
    )
    .returning();

  console.log("→ Creando turnos y checkpoints…");
  const now = new Date();
  const shiftRows = [];
  const byTeam = new Map<string, typeof createdParticipants>();

  for (const participant of createdParticipants) {
    const bucket = byTeam.get(participant.teamId!) ?? [];
    bucket.push(participant);
    byTeam.set(participant.teamId!, bucket);
  }

  for (const team of createdTeams) {
    const members = (byTeam.get(team.id) ?? []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    let cursor = subHours(now, members.length / 2);

    for (const [index, member] of members.entries()) {
      const endsAt = addMinutes(cursor, 60);
      const past = endsAt < now;

      shiftRows.push({
        eventId: event.id,
        teamId: team.id,
        participantId: member.id,
        startsAt: cursor,
        endsAt,
        status: past
          ? index % 7 === 0
            ? ("delayed" as const)
            : ("completed" as const)
          : cursor <= now
            ? ("in_progress" as const)
            : ("scheduled" as const),
        actualStartAt: past ? cursor : null,
        actualEndAt: past ? endsAt : null,
        orderIndex: index,
      });

      cursor = endsAt;
    }
  }

  const createdShifts = await db.insert(shifts).values(shiftRows).returning();

  const completed = createdShifts.filter(
    (shift) => shift.status === "completed",
  );
  const versionByTeam = new Map<string, number>();

  if (completed.length) {
    await db.insert(checkpoints).values(
      completed.map((shift) => {
        const version = (versionByTeam.get(shift.teamId) ?? 0) + 1;
        versionByTeam.set(shift.teamId, version);

        return {
          eventId: event.id,
          teamId: shift.teamId,
          shiftId: shift.id,
          participantId: shift.participantId,
          version,
          driveUrl: `https://drive.google.com/file/d/demo-${shift.id}`,
          videoUrl: `https://youtube.com/watch?v=demo${version}`,
          submittedAt: shift.endsAt,
          durationMinutes: 60,
          status: "submitted" as const,
          observations: "Entrega de demostración generada por el seed.",
        };
      }),
    );

    await db.insert(timelineEvents).values(
      completed.slice(0, 40).map((shift) => ({
        eventId: event.id,
        type: "checkpoint_submitted" as const,
        title: "Checkpoint entregado",
        teamId: shift.teamId,
        participantId: shift.participantId,
        shiftId: shift.id,
        occurredAt: shift.endsAt,
      })),
    );
  }

  console.log(
    `✔ Listo: ${createdTeams.length} equipos, ${createdParticipants.length} participantes, ${createdShifts.length} turnos.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
