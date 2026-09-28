/**
 * Loads a ticket review (produced by reading a `/api/tickets/export` download)
 * into `ticket_reviews`, replacing the previous snapshot for the active event.
 *
 *   npm run tickets:import -- path/to/review.json
 *
 * Connects with DATABASE_URL directly instead of going through the app's `db`
 * module, which validates every environment variable (including the bot
 * token) and would refuse to start from a partial `.env.local`.
 */
import { readFileSync } from "node:fs";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";

import { TICKET_DELIVERY_KINDS, TICKET_STATUSES } from "@/lib/constants";
import * as schema from "@/server/db/schema";

const reviewSchema = z.object({
  analyzedAt: z.coerce.date().optional(),
  tickets: z.array(
    z.object({
      channelId: z.string().min(1),
      channelName: z.string().min(1),
      groupLabel: z.string().min(1),
      groupIndex: z.number().int(),
      position: z.number().int(),
      discordUserId: z.string().nullable().optional(),
      status: z.enum(TICKET_STATUSES),
      hasGame: z.boolean(),
      hasMedia: z.boolean(),
      gameUrl: z.string().nullable().optional(),
      mediaUrl: z.string().nullable().optional(),
      deliveries: z
        .array(
          z.object({
            url: z.string().url(),
            label: z.string().min(1),
            kind: z.enum(TICKET_DELIVERY_KINDS),
            at: z.string().nullable(),
          }),
        )
        .default([]),
      summary: z.string().nullable().optional(),
      lastActivityAt: z.coerce.date().nullable().optional(),
    }),
  ),
});

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Uso: npm run tickets:import -- <review.json>");

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida");

  const review = reviewSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  const analyzedAt = review.analyzedAt ?? new Date();

  const sql = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(sql, { schema });

  try {
    const event = await db.query.events.findFirst({
      where: eq(schema.events.isDefault, true),
    });
    if (!event) throw new Error("No hay ningún evento activo");

    // Resolve Discord ids to this event's enrolments.
    const discordIds = review.tickets
      .map((ticket) => ticket.discordUserId)
      .filter((id): id is string => Boolean(id));

    const enrolments = discordIds.length
      ? await db
          .select({
            discordId: schema.users.discordId,
            participantId: schema.participants.id,
          })
          .from(schema.participants)
          .innerJoin(schema.users, eq(schema.participants.userId, schema.users.id))
          .where(
            and(
              eq(schema.participants.eventId, event.id),
              inArray(schema.users.discordId, discordIds),
            ),
          )
      : [];

    const participantByDiscordId = new Map(
      enrolments.map((row) => [row.discordId, row.participantId]),
    );

    await db.transaction(async (tx) => {
      for (const ticket of review.tickets) {
        const values = {
          eventId: event.id,
          channelId: ticket.channelId,
          channelName: ticket.channelName,
          groupLabel: ticket.groupLabel,
          groupIndex: ticket.groupIndex,
          position: ticket.position,
          discordUserId: ticket.discordUserId ?? null,
          participantId: ticket.discordUserId
            ? (participantByDiscordId.get(ticket.discordUserId) ?? null)
            : null,
          status: ticket.status,
          hasGame: ticket.hasGame,
          hasMedia: ticket.hasMedia,
          gameUrl: ticket.gameUrl ?? null,
          mediaUrl: ticket.mediaUrl ?? null,
          deliveries: ticket.deliveries,
          summary: ticket.summary ?? null,
          lastActivityAt: ticket.lastActivityAt ?? null,
          analyzedAt,
          updatedAt: new Date(),
        };

        await tx
          .insert(schema.ticketReviews)
          .values(values)
          .onConflictDoUpdate({
            target: [schema.ticketReviews.eventId, schema.ticketReviews.channelId],
            set: values,
          });
      }

      // Tickets closed or deleted since the last review disappear from the page.
      const channelIds = review.tickets.map((ticket) => ticket.channelId);
      await tx
        .delete(schema.ticketReviews)
        .where(
          channelIds.length
            ? and(
                eq(schema.ticketReviews.eventId, event.id),
                notInArray(schema.ticketReviews.channelId, channelIds),
              )
            : eq(schema.ticketReviews.eventId, event.id),
        );
    });

    const unmatched = review.tickets.filter(
      (ticket) =>
        ticket.discordUserId && !participantByDiscordId.has(ticket.discordUserId),
    );

    console.log(`✔ ${review.tickets.length} tickets importados`);
    if (unmatched.length) {
      console.log(
        `  ${unmatched.length} sin participante en la app: ${unmatched
          .map((ticket) => ticket.channelName)
          .join(", ")}`,
      );
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
