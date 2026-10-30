import { parseLocalDate, type LocalDate } from "./time";
import { assertId } from "./validation";

export function occurrenceIdFor(taskId: string, date: LocalDate): string {
  assertId(taskId);
  parseLocalDate(date);
  return `${encodeURIComponent(taskId)}@${date}`;
}


/** The last @ is the separator; a task ID containing @ is encoded. */
export function dateFromOccurrenceId(occurrenceId: string): LocalDate {
  const separator = occurrenceId.lastIndexOf("@");
  if (separator < 0) {
    throw new Error("La ocurrencia no incluye una fecha.");
  }
  return parseLocalDate(occurrenceId.slice(separator + 1));
}
