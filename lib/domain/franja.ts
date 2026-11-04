import { eligibleCandidates, proposeHand, type Candidate, type SelectionInput } from "./selection";
import { toLocalDate } from "./time";
import { TERMINAL_OCCURRENCE_STATUSES, type Occurrence } from "./types";

export interface FranjaView {
  candidates: Candidate[];
  /** Eligible tasks left after this franja, at the current moment. */
  remainingEligible: number;
  /** Non-terminal occurrences for the local date, including later windows. */
  pendingToday: number;
}

/**
 * Builds the visible franja without touching storage. The pure selection engine
 * remains the only source of eligibility and ordering.
 */
export function currentFranja(input: SelectionInput & { occurrences: readonly Occurrence[] }): FranjaView {
  const candidates = proposeHand(input);
  const excluded = new Set([
    ...(input.excludeOccurrenceIds ?? []),
    ...candidates.map((candidate) => candidate.occurrenceId),
  ]);
  const remainingEligible = eligibleCandidates({
    ...input,
    excludeOccurrenceIds: [...excluded],
  }).length;
  const date = toLocalDate(input.now);
  const pendingToday = input.occurrences.filter(
    (occurrence) => occurrence.date === date && !TERMINAL_OCCURRENCE_STATUSES.has(occurrence.status),
  ).length;

  return { candidates, remainingEligible, pendingToday };
}
