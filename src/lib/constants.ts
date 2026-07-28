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

/* -------------------------------------------------------------------------- */
/*                                   Engines                                  */
/* -------------------------------------------------------------------------- */

/**
 * Game engine a participant works with. Unlike skills, this is *not* mirrored
 * from Discord — the organiser sets it by hand in the panel, so it lives as a
 * plain column on `participants`.
 */
export const ENGINES = [
  { key: "unity", label: "Unity" },
  { key: "unreal", label: "Unreal Engine" },
  { key: "godot", label: "Godot" },
] as const;

export type EngineKey = (typeof ENGINES)[number]["key"];

export const ENGINE_KEYS = ENGINES.map((engine) => engine.key) as EngineKey[];

export const ENGINE_LABELS = Object.fromEntries(
  ENGINES.map((engine) => [engine.key, engine.label]),
) as Record<EngineKey, string>;

/* -------------------------------------------------------------------------- */
/*                            Skills / capabilities                           */
/* -------------------------------------------------------------------------- */

/**
 * What a participant can do in the jam. Each one is mapped to a Discord role
 * from the settings page; a participant's skills are then *derived* from the
 * roles they hold, so they stay in sync with Discord without extra bookkeeping.
 *
 * `aliases` widen the automatic name matching when a server names its roles
 * slightly differently (e.g. "Programación" instead of "Programador").
 */
export const SKILLS = [
  {
    key: "music",
    label: "Música",
    aliases: ["musica", "music", "compositor", "musico"],
  },
  { key: "sfx", label: "SFX", aliases: ["sfx", "efectos", "sonido", "audio"] },
  {
    key: "level_design",
    label: "Diseñador de niveles",
    aliases: ["disenador de niveles", "diseno de niveles", "level design", "level designer", "niveles"],
  },
  {
    key: "art_2d",
    label: "Arte 2D",
    aliases: ["arte 2d", "2d", "artista 2d", "art 2d"],
  },
  {
    key: "art_3d",
    label: "Arte 3D",
    aliases: ["arte 3d", "3d", "artista 3d", "art 3d", "modelador"],
  },
  {
    key: "programming",
    label: "Programador",
    aliases: ["programador", "programacion", "programmer", "dev", "developer"],
  },
  {
    key: "writing",
    label: "Guionista",
    aliases: ["guionista", "guion", "writer", "narrativa"],
  },
  {
    key: "mic",
    label: "Graba su micro",
    aliases: ["graba su micro", "graba micro", "micro", "microfono", "mic"],
  },
  {
    key: "webcam",
    label: "Graba su webcam",
    aliases: ["graba su webcam", "graba webcam", "webcam", "camara", "facecam"],
  },
] as const;

export type SkillKey = (typeof SKILLS)[number]["key"];

export const SKILL_KEYS = SKILLS.map((skill) => skill.key) as SkillKey[];

export const SKILL_LABELS = Object.fromEntries(
  SKILLS.map((skill) => [skill.key, skill.label]),
) as Record<SkillKey, string>;

/** Maps a skill key to the Discord role id chosen by the organiser. */
export type SkillRoleMap = Partial<Record<SkillKey, string>>;

/** Normalises a role name so accents and casing never break the matching. */
export function normaliseRoleName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Suggests a skill → role mapping by name, used to pre-fill the settings form
 * so identically named roles link themselves without manual work.
 */
export function suggestSkillRoles(
  roles: { id: string; name: string }[],
): SkillRoleMap {
  const byName = new Map(
    roles.map((role) => [normaliseRoleName(role.name), role.id]),
  );

  const suggestion: SkillRoleMap = {};

  for (const skill of SKILLS) {
    const candidates = [skill.label, ...skill.aliases].map(normaliseRoleName);
    const match = candidates.find((candidate) => byName.has(candidate));
    if (match) suggestion[skill.key] = byName.get(match)!;
  }

  return suggestion;
}

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
