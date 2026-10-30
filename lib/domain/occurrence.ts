import { parseLocalDate, type LocalDate } from "./time";
import { assertId } from "./validation";

export function occurrenceIdFor(taskId: string, date: LocalDate): string {
  assertId(taskId);
  parseLocalDate(date);
  return `${encodeURIComponent(taskId)}@${date}`;
}
