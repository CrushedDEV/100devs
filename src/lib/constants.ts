/**
 * Domain-wide enumerations and their presentation metadata.
 *
 * Keeping labels/tones next to the values means badges, charts, filters and
 * calendar blocks all stay in sync from a single source of truth.
 */

export const APP_NAME = "DevJam Control";
export const APP_DESCRIPTION =
  "Centro de control interno para la organización del evento.";

export const APP_ROLES = ["admin", "moderator", "participant"] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Roles allowed into the admin panel. */
export const STAFF_ROLES: readonly AppRole[] = ["admin", "moderator"];

export const SHIFT_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "delayed",
  "missed",
  "cancelled",
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const CHECKPOINT_STATUSES = [
  "pending",
  "submitted",
  "late",
  "approved",
  "rejected",
] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUSES)[number];

export const TEAM_STATUSES = ["active", "paused", "finished"] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export const PARTICIPANT_STATUSES = [
  "active",
  "unassigned",
  "inactive",
  "dropped",
] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const EVENT_STATUSES = ["draft", "live", "finished", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TIMELINE_EVENT_TYPES = [
  "shift_scheduled",
  "shift_started",
  "shift_completed",
  "shift_delayed",
  "shift_rescheduled",
  "shift_cancelled",
  "checkpoint_submitted",
  "checkpoint_late",
  "checkpoint_reviewed",
  "participant_synced",
  "participant_assigned",
  "participant_unassigned",
  "team_created",
  "team_updated",
  "reminder_sent",
  "sync_completed",
  "note_added",
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const REMINDER_KINDS = ["before_shift", "shift_start"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const REMINDER_STATUSES = [
  "pending",
  "sent",
  "failed",
  "cancelled",
] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const SYNC_TRIGGERS = ["manual", "cron", "login"] as const;
export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];

export const SYNC_STATUSES = ["running", "success", "failed"] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/** Visual tone shared by `StatusBadge`, calendar blocks and charts. */
export type Tone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

type Meta<T extends string> = Record<T, { label: string; tone: Tone }>;

export const SHIFT_STATUS_META: Meta<ShiftStatus> = {
  scheduled: { label: "Programado", tone: "neutral" },
  in_progress: { label: "En curso", tone: "brand" },
  completed: { label: "Completado", tone: "success" },
  delayed: { label: "Con retraso", tone: "warning" },
  missed: { label: "No entregado", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

export const CHECKPOINT_STATUS_META: Meta<CheckpointStatus> = {
  pending: { label: "Pendiente", tone: "neutral" },
  submitted: { label: "Entregado", tone: "success" },
  late: { label: "Entrega tardía", tone: "warning" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "danger" },
};

export const TEAM_STATUS_META: Meta<TeamStatus> = {
  active: { label: "Activo", tone: "brand" },
  paused: { label: "En pausa", tone: "warning" },
  finished: { label: "Finalizado", tone: "success" },
};

export const PARTICIPANT_STATUS_META: Meta<ParticipantStatus> = {
  active: { label: "Activo", tone: "success" },
  unassigned: { label: "Sin equipo", tone: "neutral" },
  inactive: { label: "Inactivo", tone: "warning" },
  dropped: { label: "Baja", tone: "danger" },
};

export const EVENT_STATUS_META: Meta<EventStatus> = {
  draft: { label: "Borrador", tone: "neutral" },
  live: { label: "En directo", tone: "brand" },
  finished: { label: "Finalizado", tone: "success" },
  archived: { label: "Archivado", tone: "neutral" },
};

export const ROLE_META: Meta<AppRole> = {
  admin: { label: "Administrador", tone: "brand" },
  moderator: { label: "Moderador", tone: "info" },
  participant: { label: "Participante", tone: "neutral" },
};

export const TIMELINE_EVENT_META: Record<
  TimelineEventType,
  { label: string; tone: Tone }
> = {
  shift_scheduled: { label: "Turno programado", tone: "neutral" },
  shift_started: { label: "Turno iniciado", tone: "brand" },
  shift_completed: { label: "Turno completado", tone: "success" },
  shift_delayed: { label: "Turno retrasado", tone: "warning" },
  shift_rescheduled: { label: "Turno reprogramado", tone: "info" },
  shift_cancelled: { label: "Turno cancelado", tone: "danger" },
  checkpoint_submitted: { label: "Checkpoint entregado", tone: "success" },
  checkpoint_late: { label: "Checkpoint tardío", tone: "warning" },
  checkpoint_reviewed: { label: "Checkpoint revisado", tone: "info" },
  participant_synced: { label: "Participante sincronizado", tone: "neutral" },
  participant_assigned: { label: "Participante asignado", tone: "info" },
  participant_unassigned: { label: "Participante liberado", tone: "neutral" },
  team_created: { label: "Equipo creado", tone: "info" },
  team_updated: { label: "Equipo actualizado", tone: "neutral" },
  reminder_sent: { label: "Recordatorio enviado", tone: "info" },
  sync_completed: { label: "Sincronización", tone: "neutral" },
  note_added: { label: "Nota interna", tone: "neutral" },
};

/** Palette offered when creating teams. */
export const TEAM_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
] as const;

/** Minutes before a shift start where the "upcoming" state kicks in. */
export const UPCOMING_WINDOW_MINUTES = 120;

/** Grace period before a shift with no checkpoint is flagged as delayed. */
export const DELAY_GRACE_MINUTES = 15;

export const DEFAULT_REMINDER_OFFSETS = [60, 15] as const;
