import type { Pending, Settings, Task } from "@/lib/domain/types";
import {
  MAX_CATEGORY_LENGTH,
  MAX_TITLE_LENGTH,
  assertId,
  validatePendingInput,
  validateSettings,
  validateTaskInput,
} from "@/lib/domain/validation";
import type { TaskOrder } from "@/lib/domain/task-order";

/** Only durable definitions/preferences cross this boundary. Never execution data. */
export type DurableKind = "task" | "pending" | "settings";
export type DurableValue = Task | Pending | Settings;
export interface DurableRecord {
  key: string;
  kind: DurableKind;
  id: string;
  revision: number;
  value: DurableValue;
}
export interface Mutation {
  operationId: string;
  kind: DurableKind;
  id: string;
  baseRevision: number;
  value: DurableValue;
}
export interface OutboxItem extends Mutation {
  key: string;
  state: "queued" | "conflict" | "rejected" | "local-only";
  error?: string;
  remote?: DurableRecord;
}
export interface MutationResult {
  operationId: string;
  status: "applied" | "conflict";
  record: DurableRecord;
}
export interface RemoteIssue {
  key: string;
  kind: DurableKind;
  id: string;
  code: "invalid_record";
}
export interface Bootstrap {
  version: 1;
  accountId: string;
  records: DurableRecord[];
  issues?: RemoteIssue[];
  etag?: string;
  notModified?: boolean;
}
export const MAX_BATCH = 40;
export const MAX_BODY_BYTES = 512 * 1024;
export const entityKey = (kind: DurableKind, id: string) => `${kind}:${id}`;

export class ProtocolError extends Error {}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProtocolError("invalid_object");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ProtocolError("unexpected_field");
}
export function validId(value: unknown): string {
  if (typeof value !== "string" || value.length > 256) throw new ProtocolError("invalid_id");
  assertId(value);
  return value;
}
function text(value: unknown, max = MAX_TITLE_LENGTH) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ProtocolError("invalid_text");
}
function instant(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 8_640_000_000_000_000
  ) {
    throw new ProtocolError("invalid_timestamp");
  }
  return value;
}
function nullableInstant(value: unknown): number | null {
  return value === null ? null : instant(value);
}
function duration(value: unknown, max = 2_147_483_647) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > max)
    throw new ProtocolError("invalid_minutes");
}
function revision(value: unknown, zero = false): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < (zero ? 0 : 1) ||
    value > 2_147_483_646
  ) {
    throw new ProtocolError("invalid_revision");
  }
  return value;
}
export function validTaskOrder(value: unknown): TaskOrder {
  const raw = object(value);
  if (
    Object.keys(raw).length > 10_000 ||
    new TextEncoder().encode(JSON.stringify(raw)).byteLength > 128 * 1024
  ) {
    throw new ProtocolError("order_too_large");
  }
  for (const [key, position] of Object.entries(raw)) {
    validId(key);
    if (
      ["__proto__", "prototype", "constructor"].includes(key) ||
      typeof position !== "number" ||
      !Number.isSafeInteger(position) ||
      position < 0
    )
      throw new ProtocolError("invalid_order");
  }
  return { ...raw } as TaskOrder;
}
export function validValue(kind: DurableKind, id: string, input: unknown): DurableValue {
  const raw = object(input);
  if (raw.id !== id) throw new ProtocolError("id_mismatch");
  const updatedAt = instant(raw.updatedAt);
  if (kind === "settings") {
    keys(raw, [
      "id",
      "audioEnabled",
      "sound",
      "maxTone",
      "theme",
      "showWallet",
      "updatedAt",
      "locale",
      "taskOrder",
    ]);
    if (id !== "preferences" || (raw.locale !== undefined && raw.locale !== "es" && raw.locale !== "en")) {
      throw new ProtocolError("invalid_preferences");
    }
    return validateSettings({
      ...raw,
      locale: raw.locale ?? "es",
      taskOrder: validTaskOrder(raw.taskOrder ?? {}),
    } as Settings);
  }
  text(raw.title);
  duration(raw.durationMin);
  const createdAt = instant(raw.createdAt);
  if (kind === "pending") {
    keys(raw, ["id", "title", "durationMin", "createdAt", "updatedAt", "completedAt", "deletedAt"]);
    return {
      ...validatePendingInput(raw as unknown as Pending),
      id,
      createdAt,
      updatedAt,
      completedAt: nullableInstant(raw.completedAt),
      deletedAt: nullableInstant(raw.deletedAt),
    };
  }
  keys(raw, [
    "id",
    "title",
    "category",
    "durationMin",
    "priority",
    "days",
    "window",
    "fixedTime",
    "shortStep",
    "createdAt",
    "updatedAt",
    "archivedAt",
  ]);
  text(raw.category, MAX_CATEGORY_LENGTH);
  if (raw.window !== undefined) keys(object(raw.window), ["start", "end"]);
  if (raw.shortStep !== undefined) {
    const step = object(raw.shortStep);
    keys(step, ["title", "durationMin"]);
    text(step.title);
    duration(step.durationMin, 32767);
  }
  return {
    ...validateTaskInput(raw as unknown as Task),
    id,
    createdAt,
    updatedAt,
    archivedAt: nullableInstant(raw.archivedAt),
  };
}
export function validKind(value: unknown): DurableKind {
  if (value !== "task" && value !== "pending" && value !== "settings")
    throw new ProtocolError("invalid_kind");
  return value;
}
export function validMutation(input: unknown): Mutation {
  const raw = object(input);
  keys(raw, ["operationId", "kind", "id", "baseRevision", "value"]);
  const operationId = validId(raw.operationId);
  if (!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(operationId))
    throw new ProtocolError("invalid_operation");
  const kind = validKind(raw.kind),
    id = validId(raw.id);
  return {
    operationId,
    kind,
    id,
    baseRevision: revision(raw.baseRevision, true),
    value: validValue(kind, id, raw.value),
  };
}
export function validRecord(input: unknown): DurableRecord {
  const raw = object(input),
    kind = validKind(raw.kind),
    id = validId(raw.id);
  const key = entityKey(kind, id);
  if (raw.key !== key) throw new ProtocolError("invalid_key");
  return { key, kind, id, revision: revision(raw.revision), value: validValue(kind, id, raw.value) };
}
export function validBootstrap(input: unknown, accountId: string): Bootstrap {
  const raw = object(input);
  if (
    raw.version !== 1 ||
    raw.accountId !== accountId ||
    !Array.isArray(raw.records) ||
    raw.records.length > 30_000
  ) {
    throw new ProtocolError("invalid_bootstrap");
  }
  const records = raw.records.map(validRecord);
  if (new Set(records.map((row) => row.key)).size !== records.length)
    throw new ProtocolError("duplicate_record");
  const issues = raw.issues === undefined ? [] : raw.issues;
  if (!Array.isArray(issues) || issues.length > 30_000) throw new ProtocolError("invalid_issues");
  const cleanIssues: RemoteIssue[] = issues.map((input) => {
    const row = object(input),
      kind = validKind(row.kind),
      id = validId(row.id);
    if (row.key !== entityKey(kind, id) || row.code !== "invalid_record")
      throw new ProtocolError("invalid_issue");
    return { key: entityKey(kind, id), kind, id, code: "invalid_record" };
  });
  if (raw.notModified !== undefined && (raw.notModified !== true || records.length || cleanIssues.length))
    throw new ProtocolError("invalid_not_modified");
  return {
    version: 1,
    accountId,
    records,
    ...(cleanIssues.length ? { issues: cleanIssues } : {}),
    ...(typeof raw.etag === "string" && raw.etag.length < 256 ? { etag: raw.etag } : {}),
    ...(raw.notModified ? { notModified: true } : {}),
  };
}
export function mutationForWire(item: OutboxItem): Mutation {
  return {
    operationId: item.operationId,
    kind: item.kind,
    id: item.id,
    baseRevision: item.baseRevision,
    value: item.value,
  };
}
/** One deterministic serialization for comparisons, receipt digests and validators. */
export function canonicalJSON(value: unknown): string {
  const canonical = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(canonical)
      : input && typeof input === "object"
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([key, item]) => [key, canonical(item)]),
          )
        : input;
  return JSON.stringify(canonical(value));
}
export function sameValue(a: DurableValue, b: DurableValue): boolean {
  return canonicalJSON(a) === canonicalJSON(b);
}

/** Three-way merge only disjoint preference fields; never LWW for disputed fields. */
export function mergeSettings(local: Settings, remote: Settings, base: Settings): Settings | null {
  const result = { ...remote };
  const fields = ["audioEnabled", "sound", "maxTone", "theme", "showWallet", "locale", "taskOrder"] as const;
  for (const field of fields) {
    const a = local[field] ?? (field === "locale" ? "es" : field === "taskOrder" ? {} : undefined);
    const b = remote[field] ?? (field === "locale" ? "es" : field === "taskOrder" ? {} : undefined);
    const original = base[field] ?? (field === "locale" ? "es" : field === "taskOrder" ? {} : undefined);
    if (canonicalJSON(a) === canonicalJSON(original)) continue;
    if (canonicalJSON(b) !== canonicalJSON(original) && canonicalJSON(a) !== canonicalJSON(b)) return null;
    Object.assign(result, { [field]: a });
  }
  const equalFields = fields.every((field) => canonicalJSON(result[field]) === canonicalJSON(remote[field]));
  result.updatedAt = equalFields ? remote.updatedAt : Math.max(local.updatedAt, remote.updatedAt);
  return validateSettings(result);
}
/** A completed one-off is a durable terminal fact, never an undoable retry. */
export function preserveCompletion(
  local: DurableValue,
  remote: DurableValue,
  kind: DurableKind,
): DurableValue {
  if (kind !== "pending") return local;
  const a = local as Pending,
    b = remote as Pending;
  // The first confirmed completion fixes its title and date as well as its state.
  return b.completedAt === null ? a : { ...b };
}
