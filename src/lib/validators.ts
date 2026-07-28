import { z } from "zod";

import {
  CHECKPOINT_STATUSES,
  EVENT_STATUSES,
  PARTICIPANT_STATUSES,
  SHIFT_STATUSES,
  TEAM_STATUSES,
} from "./constants";

const uuid = z.string().uuid("Identificador no válido");
const optionalUrl = z
  .string()
  .trim()
  .url("Introduce una URL válida")
  .or(z.literal(""))
  .optional()
  .transform((value) => (value ? value : null));

const optionalText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((value) => (value ? value : null));

/* ------------------------------- Teams ---------------------------------- */

export const teamInputSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  description: optionalText,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal no válido")
    .default("#6366f1"),
  status: z.enum(TEAM_STATUSES).default("active"),
  driveFolderUrl: optionalUrl,
  discordChannelId: optionalText,
  internalNotes: optionalText,
});
export type TeamInput = z.infer<typeof teamInputSchema>;

export const teamUpdateSchema = teamInputSchema.partial().extend({ id: uuid });

export const reorderTeamsSchema = z.object({
  orderedIds: z.array(uuid).min(1),
});

/* ---------------------------- Participants ------------------------------ */

export const participantUpdateSchema = z.object({
  id: uuid,
  teamId: uuid.nullable().optional(),
  status: z.enum(PARTICIPANT_STATUSES).optional(),
  availability: optionalText,
  timezone: z.string().trim().max(64).nullable().optional(),
  internalNotes: optionalText,
  discordTicketUrl: optionalUrl,
});
export type ParticipantUpdateInput = z.infer<typeof participantUpdateSchema>;

/** Payload emitted by the drag & drop team board. */
export const moveParticipantSchema = z.object({
  participantId: uuid,
  teamId: uuid.nullable(),
  /** Full ordering of the destination team after the drop. */
  orderedIds: z.array(uuid),
});

export const reorderParticipantsSchema = z.object({
  orderedIds: z.array(uuid).min(1),
});

/* -------------------------------- Shifts -------------------------------- */

export const shiftInputSchema = z
  .object({
    teamId: uuid,
    participantId: uuid.nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    status: z.enum(SHIFT_STATUSES).default("scheduled"),
    notes: optionalText,
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["endsAt"],
  });
export type ShiftInput = z.infer<typeof shiftInputSchema>;

export const shiftUpdateSchema = z
  .object({
    id: uuid,
    teamId: uuid.optional(),
    participantId: uuid.nullable().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    status: z.enum(SHIFT_STATUSES).optional(),
    notes: optionalText,
  })
  .refine(
    (value) =>
      !value.startsAt || !value.endsAt || value.endsAt > value.startsAt,
    { message: "La hora de fin debe ser posterior a la de inicio", path: ["endsAt"] },
  );

/** Drag & drop reschedule from the calendar. */
export const rescheduleShiftSchema = z.object({
  id: uuid,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  teamId: uuid.optional(),
  participantId: uuid.nullable().optional(),
});

export const generateShiftsSchema = z.object({
  teamId: uuid,
  startsAt: z.coerce.date(),
  shiftMinutes: z.coerce.number().int().min(5).max(24 * 60),
  gapMinutes: z.coerce.number().int().min(0).max(24 * 60).default(0),
  rounds: z.coerce.number().int().min(1).max(20).default(1),
});

/* ------------------------------ Checkpoints ----------------------------- */

export const checkpointInputSchema = z.object({
  teamId: uuid,
  shiftId: uuid.nullable().optional(),
  participantId: uuid.nullable().optional(),
  driveUrl: optionalUrl,
  videoUrl: optionalUrl,
  submittedAt: z.coerce.date().nullable().optional(),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .nullable()
    .optional(),
  status: z.enum(CHECKPOINT_STATUSES).default("submitted"),
  observations: optionalText,
  internalNotes: optionalText,
});
export type CheckpointInput = z.infer<typeof checkpointInputSchema>;

export const checkpointUpdateSchema = checkpointInputSchema
  .partial()
  .extend({ id: uuid });

/* ------------------------------- Settings ------------------------------- */

const idList = z
  .string()
  .trim()
  .transform((value) =>
    value
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().regex(/^\d{5,25}$/, "ID de Discord no válido")));

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optionalText,
  status: z.enum(EVENT_STATUSES),
  timezone: z.string().trim().min(1).max(64),
  defaultShiftMinutes: z.coerce.number().int().min(5).max(24 * 60),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  adminRoleIds: idList,
  moderatorRoleIds: idList,
  participantRoleIds: idList,
  reminderOffsets: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(/[,\s]+/)
        .map((n) => Number.parseInt(n, 10))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 1440),
    ),
  remindersEnabled: z.coerce.boolean(),
  autoSyncEnabled: z.coerce.boolean(),
  ticketUrlTemplate: optionalText,
  driveRootUrl: optionalUrl,
});
export type SettingsInput = z.infer<typeof settingsSchema>;
